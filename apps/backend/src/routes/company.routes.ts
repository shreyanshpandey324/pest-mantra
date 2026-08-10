import { Router } from "express";

import {
  companyController,
} from "../controllers/company.controller";

import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware";

import {
  UserRole,
} from "../models/User";

import {
  validateBody,
} from "../middleware/validate.middleware";

import {
  createCompanySchema,
  updateCompanySchema,
  createBranchSchema,
  updateBranchSchema,
} from "../validators/company.validators";

const router = Router();


/*
|--------------------------------------------------------------------------
| Company
|--------------------------------------------------------------------------
*/

/*
 * List all companies.
 *
 * Super Admin only.
 */
router.get(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN
  ),
  companyController.listCompanies
);

/*
|--------------------------------------------------------------------------
| Branch
|--------------------------------------------------------------------------
|
| IMPORTANT:
| These static /branches routes MUST come before /:id.
|
| Otherwise Express can interpret:
|
| GET /companies/branches
|
| as:
|
| GET /companies/:id
|
| with id = "branches".
|
|--------------------------------------------------------------------------
*/

/*
 * List branches.
 *
 * Super Admin -> all or ?companyId=
 * Office Admin -> own company only
 */
router.get(
  "/branches",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  companyController.listBranches
);

/*
 * Get one branch.
 */
router.get(
  "/branches/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  companyController.getBranch
);

/*
 * Create branch.
 *
 * Super Admin -> any approved company
 * Office Admin -> own company only
 */
router.post(
  "/branches",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    createBranchSchema
  ),
  companyController.createBranch
);

/*
 * Update branch.
 */
router.patch(
  "/branches/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  validateBody(
    updateBranchSchema
  ),
  companyController.updateBranch
);

/*
|--------------------------------------------------------------------------
| Company by ID
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This dynamic /:id route comes AFTER all static /branches routes.
|
|--------------------------------------------------------------------------
*/

/*
 * Get company.
 *
 * Super Admin -> any company
 * Office Admin -> own company
 */
router.get(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.OFFICE_ADMIN
  ),
  companyController.getCompany
);

/*
 * Create company.
 *
 * Super Admin only.
 */
router.post(
  "/",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN
  ),
  validateBody(
    createCompanySchema
  ),
  companyController.createCompany
);

/*
 * Update company.
 *
 * Super Admin only.
 */
router.patch(
  "/:id",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN
  ),
  validateBody(
    updateCompanySchema
  ),
  companyController.updateCompany
);

/*
 * Approve company.
 */
router.post(
  "/:id/approve",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN
  ),
  companyController.approveCompany
);

/*
 * Suspend company.
 */
router.post(
  "/:id/suspend",
  authenticate,
  requireRole(
    UserRole.SUPER_ADMIN
  ),
  companyController.suspendCompany
);

export default router;