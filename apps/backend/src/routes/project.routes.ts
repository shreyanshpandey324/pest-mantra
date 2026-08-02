import { Router } from "express";
import { projectController } from "../controllers/project.controller";
import { photoController } from "../controllers/photo.controller";
import { handlePhotoUpload } from "../middleware/upload.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import {
  createProjectSchema,
  assignProjectSchema,
  updateStatusSchema,
  listProjectsQuerySchema,
} from "../validators/project.validators";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

const router = Router();

// Every route below requires authentication. Role gates control
// *which* projects a caller can touch at all (e.g. only admins can
// create or assign); *which specific* projects a technician can
// read/update is enforced inside project.service.ts, not here — so
// GET /projects and PATCH /:id/status are open to technicians at
// the route level, and the service silently scopes the result set
// (list) or 404s on someone else's project (single-record routes).

router.post(
  "/",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(createProjectSchema),
  projectController.create
);

router.get("/", authenticate, validateQuery(listProjectsQuerySchema), projectController.list);

router.get("/:id", authenticate, projectController.getById);

router.get("/:id/history", authenticate, projectController.getHistory);

router.patch(
  "/:id/assign",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(assignProjectSchema),
  projectController.assign
);

router.patch(
  "/:id/status",
  authenticate,
  validateBody(updateStatusSchema),
  projectController.updateStatus
);

router.post("/:id/photos", authenticate, handlePhotoUpload, photoController.upload);

router.get("/:id/photos", authenticate, photoController.list);

export default router;
