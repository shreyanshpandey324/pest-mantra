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
 * Delete ALL Projects
 *
 * TESTING ONLY.
 *
 * Kept because it already exists in
 * the current controller.
 */
router.delete(
  "/delete-all",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  projectController.deleteAll
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
 * NOTE:
 *
 * Secure direct-photo serving is intentionally
 * not registered yet because the current
 * photo.controller.ts supplied earlier does
 * not contain photoController.file().
 *
 * We will add that securely in the photo
 * controller/service step instead of creating
 * a route to a non-existent controller method.
 */

export default router;