import { Router } from "express";

import {
  projectController,
} from "../controllers/project.controller";

import {
  photoController,
} from "../controllers/photo.controller";

import {
  handlePhotoUpload,
} from "../middleware/upload.middleware";

import {
  validateBody,
  validateQuery,
} from "../middleware/validate.middleware";

import {
  createProjectSchema,
  assignProjectSchema,
  updateStatusSchema,
  listProjectsQuerySchema,
  rescheduleProjectSchema,
  failedVisitSchema,
  reassignProjectSchema,
} from "../validators/project.validators";

import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";

import {
  UserRole,
} from "../models/User";

const router = Router();

/*
|--------------------------------------------------------------------------
| PROJECTS
|--------------------------------------------------------------------------
*/

/*
 * Create Project
 *
 * Admin only.
 */
router.post(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    createProjectSchema
  ),
  projectController.create
);

/*
 * List Projects
 *
 * All authenticated roles.
 *
 * Technician visibility is enforced
 * inside project.service.ts.
 */
router.get(
  "/",
  authenticate,
  validateQuery(
    listProjectsQuerySchema
  ),
  projectController.list
);

/*
 * Get Project
 *
 * All authenticated roles.
 *
 * Company + technician ownership
 * is enforced by the service.
 */
router.get(
  "/:id",
  authenticate,
  projectController.getById
);

/*
 * Project History
 *
 * All authenticated roles.
 *
 * Technician can only access history
 * for their own assigned project.
 */
router.get(
  "/:id/history",
  authenticate,
  projectController.getHistory
);

/*
 * Assign Technician
 *
 * Admin only.
 */
router.patch(
  "/:id/assign",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    assignProjectSchema
  ),
  projectController.assign
);


/* Zero-Chaos exception workflows */
router.patch(
  "/:id/acknowledge-assignment",
  authenticate,
  requireRole(UserRole.TECHNICIAN),
  projectController.acknowledgeAssignment
);

router.patch(
  "/:id/reschedule-request",
  authenticate,
  validateBody(rescheduleProjectSchema),
  projectController.requestReschedule
);

router.patch(
  "/:id/failed-visit",
  authenticate,
  validateBody(failedVisitSchema),
  projectController.failedVisit
);

router.patch(
  "/:id/reassign",
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN),
  validateBody(reassignProjectSchema),
  projectController.reassign
);

/*
 * Update Project Status
 *
 * All authenticated roles.
 *
 * Technician ownership and legal
 * status transition are enforced
 * by project.service.ts.
 */
router.patch(
  "/:id/status",
  authenticate,
  validateBody(
    updateStatusSchema
  ),
  projectController.updateStatus
);

/*
 * Delete Single Project
 *
 * Admin only.
 */
router.delete(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  projectController.delete
);

/*
|--------------------------------------------------------------------------
| PROJECT PHOTOS
|--------------------------------------------------------------------------
*/

/*
 * Upload Project Photo
 *
 * All authenticated users.
 *
 * photoController.upload performs:
 * - file presence check
 * - photoType validation
 * - project visibility check
 */
router.post(
  "/:id/photos",
  authenticate,
  handlePhotoUpload,
  photoController.upload
);

/*
 * List Project Photos
 *
 * All authenticated users.
 *
 * photoService performs the same
 * project visibility check.
 */
router.get(
  "/:id/photos",
  authenticate,
  photoController.list
);

/*
 * Secure Project Photo File
 *
 * Authentication + project/company/technician
 * visibility are enforced before the file is sent.
 */
router.get(
  "/:id/photos/:photoId",
  authenticate,
  photoController.file
);

export default router;