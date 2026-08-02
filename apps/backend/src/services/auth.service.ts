import { Request } from "express";
import { User, IUser } from "../models/User";
import { RefreshToken, hashToken } from "../models/RefreshToken";
import { ApiError } from "../utils/ApiError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { env } from "../config/env";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

function getRequestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

async function issueTokenPair(user: IUser, meta: RequestMeta): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    branchId: user.branchId?.toString(),
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { accessToken, refreshToken };
}

function parseExpiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export const authService = {
  /**
   * Authenticates a user by phone + password.
   * Applies account lockout after repeated failures, independent
   * of the IP-based rate limiter, so a distributed brute-force
   * attempt still can't get past one account's own defenses.
   */
  async login(phone: string, password: string, req: Request): Promise<{ user: IUser; tokens: TokenPair }> {
    const user = await User.findOne({ phone }).select(
      "+passwordHash +failedLoginAttempts +lockedUntil +tokenVersion"
    );

    // Same generic error whether the phone doesn't exist or the
    // password is wrong — never reveal which one it was.
    const invalidCredentialsError = ApiError.unauthorized("Invalid phone number or password");

    if (!user) throw invalidCredentialsError;

    if (user.isLocked()) {
      throw ApiError.forbidden(
        "This account is temporarily locked due to repeated failed login attempts. Please try again later."
      );
    }

    if (!user.isActive) {
      throw ApiError.forbidden("This account has been deactivated. Contact your administrator.");
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw invalidCredentialsError;
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokenPair(user, getRequestMeta(req));

    return { user, tokens };
  },

  /**
   * Rotates a refresh token: the old one is marked revoked, a new
   * pair is issued. If a revoked or unknown token is presented,
   * it's treated as a possible theft signal.
   */
  async refresh(refreshTokenValue: string, req: Request): Promise<{ user: IUser; tokens: TokenPair }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenValue);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const tokenHash = hashToken(refreshTokenValue);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt.getTime() < Date.now()) {
      throw ApiError.unauthorized("Refresh token is no longer valid. Please log in again.");
    }

    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account is inactive or no longer exists");
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      // Password was changed / user was force-logged-out since this token was issued.
      throw ApiError.unauthorized("Session has been invalidated. Please log in again.");
    }

    // Rotate: revoke the used token, issue a fresh pair.
    const tokens = await issueTokenPair(user, getRequestMeta(req));
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = hashToken(tokens.refreshToken);
    await storedToken.save();

    return { user, tokens };
  },

  async logout(refreshTokenValue: string): Promise<void> {
    const tokenHash = hashToken(refreshTokenValue);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  },

  /** Revokes every refresh token for a user (e.g. "log out of all devices", or admin-forced). */
  async revokeAllSessions(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  },

  async getById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  },
};
