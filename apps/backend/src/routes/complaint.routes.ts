import { Router } from "express";
import { complaintController } from "../controllers/complaint.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { UserRole } from "../models/User";
import { complaintCommentSchema, createComplaintSchema, listComplaintsSchema, updateComplaintSchema } from "../validators/complaint.validators";

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));
router.get("/", validateQuery(listComplaintsSchema), complaintController.list);
router.post("/", validateBody(createComplaintSchema), complaintController.create);
router.get("/:id", complaintController.get);
router.patch("/:id", validateBody(updateComplaintSchema), complaintController.update);
router.post("/:id/comments", validateBody(complaintCommentSchema), complaintController.comment);
export default router;
