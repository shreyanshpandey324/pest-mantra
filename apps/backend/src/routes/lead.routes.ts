import { Router } from "express";
import { leadController } from "../controllers/lead.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { UserRole } from "../models/User";
import {
  addLeadActivitySchema,
  createLeadSchema,
  listLeadAssigneesSchema,
  listLeadsSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from "../validators/lead.validators";

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));

router.get("/assignees", validateQuery(listLeadAssigneesSchema), leadController.assignees);
router.get("/", validateQuery(listLeadsSchema), leadController.list);
router.post("/", validateBody(createLeadSchema), leadController.create);
router.get("/:id", leadController.get);
router.patch("/:id", validateBody(updateLeadSchema), leadController.update);
router.patch("/:id/status", validateBody(updateLeadStatusSchema), leadController.updateStatus);
router.post("/:id/activities", validateBody(addLeadActivitySchema), leadController.addActivity);
router.delete("/:id", leadController.remove);

export default router;
