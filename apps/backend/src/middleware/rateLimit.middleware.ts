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
