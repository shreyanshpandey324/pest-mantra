import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import { zeroChaosController } from "../controllers/zeroChaos.controller";

const router = Router();
router.get("/exceptions", authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN), zeroChaosController.exceptions);
router.get("/end-of-day", authenticate, zeroChaosController.endOfDay);
export default router;
