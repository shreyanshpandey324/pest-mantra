import { Router } from "express";
import { technicianController } from "../controllers/technician.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  technicianController.list
);

router.get(
  "/:id",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  technicianController.getById
);

router.post("/duty/start", authenticate, requireRole(UserRole.TECHNICIAN), technicianController.startDuty);
router.post("/duty/end", authenticate, requireRole(UserRole.TECHNICIAN), technicianController.endDuty);
router.get("/duty/status", authenticate, requireRole(UserRole.TECHNICIAN), technicianController.getMyStatus);

export default router;
