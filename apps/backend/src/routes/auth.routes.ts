import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema, otpEligibilitySchema, otpVerifySchema } from "../validators/auth.validators";
import { authenticate } from "../middleware/auth.middleware";
import {
  loginRateLimiter,
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
} from "../middleware/rateLimit.middleware";

const router = Router();

// Local company-demo shortcut. The controller refuses this route in production,
// so production authentication remains unchanged.
router.post("/demo-login", authController.demoLogin);

// Admin dashboard uses registered phone + password. OTP routes are retained
// for the technician app / future Firebase rollout, but are not used by the
// current admin login screen.
router.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  authController.login
);

router.post(
  "/otp/eligibility",
  otpRequestRateLimiter,
  validateBody(otpEligibilitySchema),
  authController.otpEligibility
);
router.post(
  "/otp/verify",
  otpVerifyRateLimiter,
  validateBody(otpVerifySchema),
  authController.otpVerify
);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
