import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { validateBody } from "../middleware/validate.middleware";
import {
  createUserSchema,
  updateUserSchema,
} from "../validators/auth.validators";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();

// Only admins may create accounts — there is no public signup route anywhere.
router.post(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(createUserSchema),
  userController.create
);

// Update user
router.patch(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(updateUserSchema),
  userController.update
);

router.delete(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  userController.delete
);

export default router;