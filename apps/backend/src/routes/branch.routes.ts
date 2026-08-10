import { Router } from "express";
import {
  branchController,
} from "../controllers/branch.controller";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import {
  validateBody,
} from "../middleware/validate.middleware";
import {
  createBranchSchema,
  updateBranchSchema,
} from "../validators/branch.validators";

const router = Router();

const adminRoles = [
  UserRole.SUPER_ADMIN,
  UserRole.OFFICE_ADMIN,
];

// Create branch
router.post(
  "/",
  authenticate,
  requireRole(...adminRoles),
  validateBody(createBranchSchema),
  branchController.create
);

// List branches
router.get(
  "/",
  authenticate,
  requireRole(...adminRoles),
  branchController.list
);

// Get branch
router.get(
  "/:id",
  authenticate,
  requireRole(...adminRoles),
  branchController.getById
);

// Update branch
router.patch(
  "/:id",
  authenticate,
  requireRole(...adminRoles),
  validateBody(updateBranchSchema),
  branchController.update
);

// Delete branch
router.delete(
  "/:id",
  authenticate,
  requireRole(...adminRoles),
  branchController.delete
);

export default router;