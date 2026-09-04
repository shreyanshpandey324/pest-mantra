import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { complaintService } from "../services/complaint.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { sendSuccess } from "../utils/ApiResponse";

export const complaintController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Complaints", await complaintService.list(getCallerScope(req), req.query as any))),
  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Complaint", { complaint: await complaintService.get(req.params.id, getCallerScope(req)) })),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Complaint created", { complaint: await complaintService.create(req.body, getCallerScope(req)) })),
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Complaint updated", { complaint: await complaintService.update(req.params.id, req.body, getCallerScope(req)) })),
  comment: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Comment added", { complaint: await complaintService.comment(req.params.id, req.body.note, getCallerScope(req)) })),
};
