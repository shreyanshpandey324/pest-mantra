import { Router } from "express";

import {
  locationController,
} from "../controllers/location.controller";

import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";

import {
  validateBody,
} from "../middleware/validate.middleware";

import {
  updateLocationSchema,
} from "../validators/location.validators";

import {
  UserRole,
} from "../models/User";

const router = Router();

/*
|--------------------------------------------------------------------------
| Technician GPS
|--------------------------------------------------------------------------
|
| The technician identity always comes
| from the authenticated JWT.
|
*/

/*
 * Update own GPS location
 */
router.post(
  "/update",
  authenticate,
  requireRole(
    UserRole.TECHNICIAN
  ),
  validateBody(
    updateLocationSchema
  ),
  locationController.update
);

/*
 * Get own latest GPS location
 */
router.get(
  "/me",
  authenticate,
  requireRole(
    UserRole.TECHNICIAN
  ),
  locationController.mine
);

/*
|--------------------------------------------------------------------------
| Admin live locations
|--------------------------------------------------------------------------
|
| Only administrators can see live
| technician locations.
|
*/

router.get(
  "/live",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  locationController.live
);

export default router;