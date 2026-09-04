import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import { validateBody } from "../middleware/validate.middleware";
import { serviceReportController } from "../controllers/serviceReport.controller";
import { saveServiceReportSchema } from "../validators/serviceReport.validators";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  serviceReportController.list
);

// Public verification exposes only a minimal finalized-report summary.
router.get("/verify/:code", serviceReportController.verify);

router.get("/project/:projectId", authenticate, serviceReportController.getByProject);
router.put(
  "/project/:projectId",
  authenticate,
  requireRole(UserRole.TECHNICIAN),
  validateBody(saveServiceReportSchema),
  serviceReportController.saveDraft
);

export default router;
