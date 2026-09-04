import { Router } from "express";
import { communicationController } from "../controllers/communication.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));
router.get("/status", communicationController.status);
router.get("/", communicationController.list);
router.post("/process", communicationController.process);
router.post("/from-alert/:id", communicationController.queueFromAlert);
export default router;
