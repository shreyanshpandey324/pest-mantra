import { Router } from "express";
import { systemController } from "../controllers/system.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
const router=Router();
router.get("/capabilities",authenticate,requireRole(UserRole.SUPER_ADMIN,UserRole.OFFICE_ADMIN),systemController.capabilities);
export default router;
