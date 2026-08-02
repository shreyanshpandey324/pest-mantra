import { Router } from "express";
import { chemicalController } from "../controllers/chemical.controller";
import { validateBody } from "../middleware/validate.middleware";
import {
  createChemicalSchema,
  restockChemicalSchema,
  checkoutChemicalSchema,
  returnChemicalSchema,
  logUsageSchema,
} from "../validators/chemical.validators";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();

// Master inventory — admin manages the list and stock levels.
router.get("/", authenticate, chemicalController.list);
router.post(
  "/",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(createChemicalSchema),
  chemicalController.create
);
router.patch(
  "/:id/restock",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(restockChemicalSchema),
  chemicalController.restock
);

// Checkout / return — admin issues to a technician, admin records the return.
router.post(
  "/checkout",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(checkoutChemicalSchema),
  chemicalController.checkout
);
router.patch(
  "/checkout/:id/return",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(returnChemicalSchema),
  chemicalController.returnCheckout
);
// Open (not yet returned + checked out) — a technician sees only
// their own (enforced in the controller, not just by convention);
// an admin can see anyone's by passing ?technicianId=.
router.get("/checkout/open", authenticate, chemicalController.listOpenCheckouts);

// Usage — logged by a technician (own assigned project only,
// enforced the same way every other project-scoped write is) or
// an admin correcting/backfilling a record.
router.post("/usage", authenticate, validateBody(logUsageSchema), chemicalController.logUsage);
router.get("/usage/project/:projectId", authenticate, chemicalController.getProjectUsage);

export default router;
