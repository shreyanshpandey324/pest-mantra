import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { authService } from "../services/auth.service";
import {
  LoginInput,
  OtpEligibilityInput,
  OtpVerifyInput,
} from "../validators/auth.validators";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { env } from "../config/env";
import { verifyFirebasePhoneIdToken } from "../utils/firebaseToken";

/**
 * Refresh tokens are read from an httpOnly cookie when present
 * (a browser calling this API directly), falling back to the
 * request body (used by the Next.js BFF and the React Native
 * technician app, neither of which shares this API's cookie jar).
 * Access tokens are never put in a cookie — they're short-lived
 * and returned in the JSON body for the caller to hold in memory.
 *
 * Named distinctly from the Next.js BFF's own session cookie
 * (see admin-web/src/lib/session.ts) since they live on different
 * domains and are not the same token: this one is the backend
 * API's cookie for direct API consumers, the BFF's is a
 * browser-facing session cookie on the dashboard's own domain.
 */
const REFRESH_COOKIE_NAME = "pm_api_refresh_token";

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function extractRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
}

export const authController = {
  demoLogin: asyncHandler(async (req, res: Response) => {
    if (env.isProduction) {
      throw ApiError.notFound("Not found");
    }

    const { user, tokens } = await authService.loginDemoTechnician(req);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    sendSuccess(res, 200, "Demo login successful", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
    });
  }),

  otpEligibility: asyncHandler(async (req, res: Response) => {
    const { phone, audience } = req.body as OtpEligibilityInput;
    await authService.assertOtpEligibility(phone, audience);

    sendSuccess(res, 200, "Phone number is approved for OTP login", {
      eligible: true,
    });
  }),

  otpVerify: asyncHandler(async (req, res: Response) => {
    const { idToken, audience } = req.body as OtpVerifyInput;
    const { phone } = await verifyFirebasePhoneIdToken(idToken);
    const { user, tokens } = await authService.loginWithOtp(phone, audience, req);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    sendSuccess(res, 200, "Login successful", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
    });
  }),

  login: asyncHandler(async (req, res: Response) => {
    const { phone, password } = req.body as LoginInput;
    const { user, tokens } = await authService.login(phone, password, req);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    // The refresh token is returned in the body as well as set as a
    // cookie. Browser clients calling this API directly can rely on
    // the httpOnly cookie and should disregard the body value.
    // Trusted server-to-server callers (the Next.js BFF) and the
    // React Native technician app — which has no browser cookie jar —
    // use the body value and are responsible for storing it securely
    // (httpOnly cookie on the BFF's own domain, encrypted device
    // storage on mobile).
    sendSuccess(res, 200, "Login successful", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
    });
  }),

  refresh: asyncHandler(async (req, res: Response) => {
    const refreshTokenValue = extractRefreshToken(req);
    if (!refreshTokenValue) {
      throw ApiError.unauthorized("Refresh token missing");
    }

    const { user, tokens } = await authService.refresh(refreshTokenValue, req);

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    sendSuccess(res, 200, "Token refreshed", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
    });
  }),

  logout: asyncHandler(async (req, res: Response) => {
    const refreshTokenValue = extractRefreshToken(req);
    if (refreshTokenValue) {
      await authService.logout(refreshTokenValue);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
    sendSuccess(res, 200, "Logged out successfully");
  }),

  me: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await authService.getById(req.user.id);
    if (!user) throw ApiError.notFound("User not found");
    sendSuccess(res, 200, "Current user", { user: user.toJSON() });
  }),
};
