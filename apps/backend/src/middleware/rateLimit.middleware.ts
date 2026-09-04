import rateLimit from "express-rate-limit";

/**
 * Login is the most brute-forceable endpoint in the whole system,
 * so it gets its own tight limiter in addition to the global one.
 * Keyed by IP; account-level lockout (see User model) is the
 * second, independent layer of defense against credential stuffing.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in a few minutes.",
  },
});

/**
 * OTP eligibility is called immediately before Firebase sends an SMS.
 * Keep the limit deliberately low to reduce SMS abuse/cost exposure.
 */
export const otpRequestRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait a few minutes before requesting another code.",
  },
});

/** OTP code verification can be a little more permissive than SMS sending. */
export const otpVerifyRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP verification attempts. Please wait a few minutes and try again.",
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});
