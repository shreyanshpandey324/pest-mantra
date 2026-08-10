import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import {
  branchService,
} from "../services/branch.service";
import {
  CreateBranchInput,
  UpdateBranchInput,
} from "../validators/branch.validators";
import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  getCallerScope,
} from "../utils/callerScope";

export const branchController = {
  create: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as CreateBranchInput;

      const branch =
        await branchService.createBranch(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "Branch created successfully",
        {
          branch,
        }
      );
    }
  ),

  list: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const companyId =
        typeof req.query.companyId ===
        "string"
          ? req.query.companyId
          : undefined;

      const branches =
        await branchService.listBranches(
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

  getById: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const branch =
        await branchService.getBranchById(
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

  update: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as UpdateBranchInput;

      const branch =
        await branchService.updateBranch(
          req.params.id,
          input,
          scope
        );

      sendSuccess(
        res,
        200,
        "Branch updated successfully",
        {
          branch,
        }
      );
    }
  ),

  delete: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      await branchService.deleteBranch(
        req.params.id,
        scope
      );

      sendSuccess(
        res,
        200,
        "Branch deleted successfully"
      );
    }
  ),
};