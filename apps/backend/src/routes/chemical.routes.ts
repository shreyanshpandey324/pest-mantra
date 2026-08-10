import { Router } from "express";

import {
  chemicalController,
} from "../controllers/chemical.controller";

import {
  validateBody,
} from "../middleware/validate.middleware";

import {
  createChemicalSchema,
  restockChemicalSchema,
  checkoutChemicalSchema,
  returnChemicalSchema,
  logUsageSchema,
} from "../validators/chemical.validators";

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
| Master Chemical Inventory
|--------------------------------------------------------------------------
*/

/*
 * List chemicals.
 *
 * Super Admin:
 *   Global inventory access.
 *
 * Office Admin / Technician:
 *   Company-scoped inventory through
 *   chemicalService + CallerScope.
 */
router.get(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN,
    UserRole.TECHNICIAN
  ),
  chemicalController.list
);

/*
 * Create chemical.
 *
 * Only admins can modify master inventory.
 */
router.post(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    createChemicalSchema
  ),
  chemicalController.create
);

/*
 * Restock chemical.
 */
router.patch(
  "/:id/restock",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    restockChemicalSchema
  ),
  chemicalController.restock
);

/*
|--------------------------------------------------------------------------
| Chemical Checkout / Return
|--------------------------------------------------------------------------
*/

/*
 * Issue chemical stock to a technician.
 */
router.post(
  "/checkout",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    checkoutChemicalSchema
  ),
  chemicalController.checkout
);

/*
 * Record returned chemical.
 */
router.patch(
  "/checkout/:id/return",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    returnChemicalSchema
  ),
  chemicalController.returnCheckout
);

/*
|--------------------------------------------------------------------------
| Open Checkouts
|--------------------------------------------------------------------------
*/

/*
 * Technician:
 *   Controller derives technicianId from
 *   the authenticated JWT.
 *
 * Admin:
 *   May optionally use ?technicianId=...
 *
 * Company isolation is enforced again
 * inside chemicalService.
 */
router.get(
  "/checkout/open",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN,
    UserRole.TECHNICIAN
  ),
  chemicalController.listOpenCheckouts
);

/*
|--------------------------------------------------------------------------
| Project Chemical Usage
|--------------------------------------------------------------------------
*/

/*
 * Log chemical usage.
 *
 * Technician:
 *   Only their accessible/assigned project.
 *
 * Admin:
 *   May log or correct usage.
 *
 * Project + chemical company checks
 * are enforced by chemicalService.
 */
router.post(
  "/usage",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN,
    UserRole.TECHNICIAN
  ),
  validateBody(
    logUsageSchema
  ),
  chemicalController.logUsage
);

/*
 * Get chemical usage for a project.
 */
router.get(
  "/usage/project/:projectId",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN,
    UserRole.TECHNICIAN
  ),
  chemicalController.getProjectUsage
);

export default router;