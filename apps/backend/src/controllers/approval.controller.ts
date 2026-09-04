import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { approvalService } from "../services/approval.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
export const approvalController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Approval center", await approvalService.list(getCallerScope(req), req.query.status ? String(req.query.status) : undefined))),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Approval requested", { approval: await approvalService.create(getCallerScope(req), req.body) })),
  resolve: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Approval resolved", { approval: await approvalService.resolve(getCallerScope(req), req.params.id, req.body) })),
};
