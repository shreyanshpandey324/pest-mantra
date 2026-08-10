import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models/User";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  companyId?: string;
  branchId?: string;
  tokenType: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenVersion: number;
  tokenType: "refresh";
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, "tokenType">
): string {
  return jwt.sign(
    {
      ...payload,
      tokenType: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions
  );
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "tokenType">
): string {
  return jwt.sign(
    {
      ...payload,
      tokenType: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions
  );
}

export function verifyAccessToken(
  token: string
): AccessTokenPayload {
  const decoded =
    jwt.verify(
      token,
      env.JWT_ACCESS_SECRET
    ) as unknown as AccessTokenPayload;

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    decoded.tokenType !== "access"
  ) {
    throw new Error("Invalid token type");
  }

  return decoded;
}

export function verifyRefreshToken(
  token: string
): RefreshTokenPayload {
  const decoded =
    jwt.verify(
      token,
      env.JWT_REFRESH_SECRET
    ) as unknown as RefreshTokenPayload;

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    decoded.tokenType !== "refresh"
  ) {
    throw new Error("Invalid token type");
  }

  return decoded;
}