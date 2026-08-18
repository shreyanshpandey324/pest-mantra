import { Router } from "express";
import { mileageController } from "../controllers/mileage.controller";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();

router.get(
  "/report",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  mileageController.report
);

export default router;