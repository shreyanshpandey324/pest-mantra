import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { authenticateCustomerPortal } from "../middleware/customerPortal.middleware";
import { loginRateLimiter } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { UserRole } from "../models/User";
import { customerPortalController } from "../controllers/customerPortal.controller";
import { customerPortalLoginSchema, customerQuotationDecisionSchema, customerComplaintSchema } from "../validators/customerPortal.validators";

const router = Router();

router.post("/login", loginRateLimiter, validateBody(customerPortalLoginSchema), customerPortalController.login);
router.get("/me", authenticateCustomerPortal, customerPortalController.dashboard);
router.post("/complaints", authenticateCustomerPortal, validateBody(customerComplaintSchema), customerPortalController.createComplaint);
router.patch(
  "/reminders/:reminderId/read",
  authenticateCustomerPortal,
  customerPortalController.markReminderRead,
);
router.patch(
  "/quotations/:quotationId/decision",
  authenticateCustomerPortal,
  validateBody(customerQuotationDecisionSchema),
  customerPortalController.quotationDecision,
);

router.get(
  "/access/project/:projectId",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  customerPortalController.accessForProject,
);
router.post(
  "/access/project/:projectId",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  customerPortalController.issueAccess,
);
router.delete(
  "/access/project/:projectId",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  customerPortalController.revokeAccess,
);

export default router;
