import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { serviceReminderController } from "../controllers/serviceReminder.controller";
import { listServiceRemindersSchema, rescheduleServiceReminderSchema } from "../validators/serviceReminder.validators";

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));
router.get("/", validateQuery(listServiceRemindersSchema), serviceReminderController.list);
router.patch("/read-all", serviceReminderController.markAllRead);
router.patch("/:id/read", serviceReminderController.markRead);
router.patch("/:id", validateBody(rescheduleServiceReminderSchema), serviceReminderController.reschedule);
router.post("/:id/create-project", serviceReminderController.createNextProject);
export default router;
