import { Response } from "express";

import {
  asyncHandler,
} from "../utils/asyncHandler";

import {
  sendSuccess,
} from "../utils/ApiResponse";

import {
  getCallerScope,
} from "../utils/callerScope";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  companyService,
} from "../services/company.service";

import {
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateBranchInput,
  UpdateBranchInput,
} from "../validators/company.validators";

export const companyController = {
  /*
   * COMPANY
   */

  listCompanies: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const companies =
        await companyService.listCompanies(
          scope
        );

      sendSuccess(
        res,
        200,
        "Companies",
        {
          companies,
        }
      );
    }
  ),

  getCompany: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const company =
        await companyService.getCompanyById(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Company",
        {
          company,
        }
      );
    }
  ),

  createCompany: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const company =
        await companyService.createCompany(
          req.body as CreateCompanyInput,
          scope
        );

      sendSuccess(
        res,
        201,
        "Company created",
        {
          company,
        }
      );
    }
  ),

  updateCompany: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const company =
        await companyService.updateCompany(
          req.params.id,
          req.body as UpdateCompanyInput,
          scope
        );

      sendSuccess(
        res,
        200,
        "Company updated",
        {
          company,
        }
      );
    }
  ),

  approveCompany: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const company =
        await companyService.approveCompany(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Company approved",
        {
          company,
        }
      );
    }
  ),

  suspendCompany: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const company =
        await companyService.suspendCompany(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Company suspended",
        {
          company,
        }
      );
    }
  ),

  /*
   * BRANCH
   */

  listBranches: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const companyId =
        req.query.companyId
          ? String(
              req.query.companyId
            )
          : undefined;

      const branches =
        await companyService.listBranches(
          scope,
          companyId
        );

      sendSuccess(
        res,
        200,
        "Branches",
        {
          branches,
        }
      );
    }
  ),

  getBranch: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const branch =
        await companyService.getBranchById(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Branch",
        {
          branch,
        }
      );
    }
  ),

  createBranch: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const branch =
        await companyService.createBranch(
          req.body as CreateBranchInput,
          scope
        );

      sendSuccess(
        res,
        201,
        "Branch created",
        {
          branch,
        }
      );
    }
  ),

  updateBranch: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const branch =
        await companyService.updateBranch(
          req.params.id,
          req.body as UpdateBranchInput,
          scope
        );

      sendSuccess(
        res,
        200,
        "Branch updated",
        {
          branch,
        }
      );
    }
  ),
};