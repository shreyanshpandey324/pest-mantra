import { Request } from "express";
import { User, IUser } from "../models/User";
import {
  RefreshToken,
  hashToken,
} from "../models/RefreshToken";
import { ApiError } from "../utils/ApiError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { env } from "../config/env";
import { UserRole } from "../models/User";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export type OtpAudience = "admin" | "technician";

function roleAllowedForAudience(role: UserRole, audience: OtpAudience): boolean {
  if (audience === "admin") {
    return role === UserRole.SUPER_ADMIN || role === UserRole.OFFICE_ADMIN;
  }

  return role === UserRole.TECHNICIAN;
}

async function findOtpUser(phone: string, audience: OtpAudience): Promise<IUser> {
  const user = await User.findOne({ phone }).select(
    "+failedLoginAttempts +lockedUntil +tokenVersion"
  );

  // Keep this deliberately generic so the public eligibility endpoint does
  // not disclose whether a number exists, is inactive, or is merely not
  // approved by the Super Admin.
  const denied = ApiError.forbidden(
    "This phone number is not approved for OTP login. Contact your administrator."
  );

  if (!user || !user.isActive || !user.otpLoginEnabled) {
    throw denied;
  }

  if (!roleAllowedForAudience(user.role, audience)) {
    throw denied;
  }

  if (user.isLocked()) {
    throw ApiError.forbidden(
      "This account is temporarily locked. Please try again later."
    );
  }

  return user;
}

function getRequestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

async function issueTokenPair(
  user: IUser,
  meta: RequestMeta
): Promise<TokenPair> {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    companyId: user.companyId?.toString(),
    branchId: user.branchId?.toString(),
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });

  await RefreshToken.create({
  companyId: user.companyId,
  userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(
      Date.now() +
        parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)
    ),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return {
    accessToken,
    refreshToken,
  };
}

function parseExpiryToMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

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
  async loginDemoTechnician(req: Request): Promise<{ user: IUser; tokens: TokenPair }> {
    if (env.isProduction) {
      throw ApiError.notFound("Not found");
    }

    const user = await User.findOne({
      role: UserRole.TECHNICIAN,
      isActive: true,
    })
      .sort({ lastLoginAt: -1, createdAt: 1 })
      .select("+failedLoginAttempts +lockedUntil +tokenVersion");

    if (!user) {
      throw ApiError.notFound("No active technician account is available for demo mode.");
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokenPair(user, getRequestMeta(req));
    return { user, tokens };
  },

  async assertOtpEligibility(phone: string, audience: OtpAudience): Promise<void> {
    await findOtpUser(phone, audience);
  },

  async loginWithOtp(
    phone: string,
    audience: OtpAudience,
    req: Request
  ): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    const user = await findOtpUser(phone, audience);

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokenPair(user, getRequestMeta(req));

    return { user, tokens };
  },

  async login(
    phone: string,
    password: string,
    req: Request
  ): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    const user =
      await User.findOne({
        phone,
      }).select(
        "+passwordHash +failedLoginAttempts +lockedUntil +tokenVersion"
      );

    const invalidCredentialsError =
      ApiError.unauthorized(
        "Invalid phone number or password"
      );

    if (!user) {
      throw invalidCredentialsError;
    }

    if (user.isLocked()) {
      throw ApiError.forbidden(
        "This account is temporarily locked due to repeated failed login attempts. Please try again later."
      );
    }

    if (!user.isActive) {
      throw ApiError.forbidden(
        "This account has been deactivated. Contact your administrator."
      );
    }

    const passwordMatches =
      await user.comparePassword(password);

    if (!passwordMatches) {
      user.failedLoginAttempts += 1;

      if (
        user.failedLoginAttempts >=
        MAX_FAILED_ATTEMPTS
      ) {
        user.lockedUntil = new Date(
          Date.now() + LOCK_DURATION_MS
        );

        user.failedLoginAttempts = 0;
      }

      await user.save();

      throw invalidCredentialsError;
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();

    await user.save();

    const tokens =
      await issueTokenPair(
        user,
        getRequestMeta(req)
      );

    return {
      user,
      tokens,
    };
  },

  async refresh(
    refreshTokenValue: string,
    req: Request
  ): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    let payload;

    try {
      payload =
        verifyRefreshToken(
          refreshTokenValue
        );
    } catch {
      throw ApiError.unauthorized(
        "Invalid or expired refresh token"
      );
    }

    const tokenHash =
      hashToken(refreshTokenValue);

    const storedToken =
      await RefreshToken.findOne({
        tokenHash,
      });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt.getTime() <
        Date.now()
    ) {
      throw ApiError.unauthorized(
        "Refresh token is no longer valid. Please log in again."
      );
    }

    const user =
      await User.findById(
        payload.sub
      ).select("+tokenVersion");

    if (!user || !user.isActive) {
      throw ApiError.unauthorized(
        "Account is inactive or no longer exists"
      );
    }

    if (
      user.tokenVersion !==
      payload.tokenVersion
    ) {
      throw ApiError.unauthorized(
        "Session has been invalidated. Please log in again."
      );
    }

    /*
     * The user's current companyId is deliberately
     * loaded from MongoDB rather than trusting any
     * client-provided tenant identifier.
     *
     * issueTokenPair() will therefore issue a fresh
     * access token containing the current companyId.
     */
    const tokens =
      await issueTokenPair(
        user,
        getRequestMeta(req)
      );

    storedToken.revokedAt =
      new Date();

    storedToken.replacedByTokenHash =
      hashToken(tokens.refreshToken);

    await storedToken.save();

    return {
      user,
      tokens,
    };
  },

  async logout(
    refreshTokenValue: string
  ): Promise<void> {
    const tokenHash =
      hashToken(refreshTokenValue);

    await RefreshToken.updateOne(
      {
        tokenHash,
        revokedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );
  },

  async revokeAllSessions(
    userId: string
  ): Promise<void> {
    await RefreshToken.updateMany(
      {
        userId,
        revokedAt: {
          $exists: false,
        },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    await User.updateOne(
      {
        _id: userId,
      },
      {
        $inc: {
          tokenVersion: 1,
        },
      }
    );
  },

  async getById(
    userId: string
  ): Promise<IUser | null> {
    return User.findById(userId);
  },
};