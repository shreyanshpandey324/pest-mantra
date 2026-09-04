import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { auditService } from "../services/audit.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { sendSuccess } from "../utils/ApiResponse";
export const auditController = { list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Audit logs", await auditService.list(getCallerScope(req), req.query as any))) };
