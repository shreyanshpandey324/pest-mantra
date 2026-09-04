import { Router } from "express";

import {
  userController,
} from "../controllers/user.controller";

import {
  validateBody,
} from "../middleware/validate.middleware";

import {
  createUserSchema,
  otpAccessSchema,
  resetUserPasswordSchema,
  updateUserSchema,
} from "../validators/auth.validators";

import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";

import {
  UserRole,
} from "../models/User";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  userController.list
);

/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
|
| Super Admin:
|   - Office Admin
|   - Technician
|
| Office Admin:
|   - Technician only
|
| Company/branch ownership is enforced
| inside user.service.ts.
|
*/
router.post(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    createUserSchema
  ),
  userController.create
);

/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
|
| Super Admin:
|   - Office Admin
|   - Technician
|
| Office Admin:
|   - own-company Technicians only
|
*/
router.patch(
  "/:id/password",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  validateBody(resetUserPasswordSchema),
  userController.resetPassword
);

router.patch(
  "/:id/otp-access",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN),
  validateBody(otpAccessSchema),
  userController.setOtpAccess
);

router.patch(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    updateUserSchema
  ),
  userController.update
);

/*
|--------------------------------------------------------------------------
| Delete User
|--------------------------------------------------------------------------
|
| Super Admin:
|   - Office Admin
|   - Technician
|
| Office Admin:
|   - own-company Technicians only
|
*/
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