import { Router } from "express";
import { feedbackController } from "../controllers/feedback.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { UserRole } from "../models/User";
import { listFeedbackSchema, submitFeedbackSchema } from "../validators/feedback.validators";

const router = Router();

// Public customer experience endpoints expose no customer contact information.
router.get("/public/:code", feedbackController.publicInfo);
router.post("/public/:code", validateBody(submitFeedbackSchema), feedbackController.submit);

router.get(
  "/",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateQuery(listFeedbackSchema),
  feedbackController.dashboard
);

export default router;
