import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { serviceReportService } from "../services/serviceReport.service";
import { SaveServiceReportInput } from "../validators/serviceReport.validators";

export const serviceReportController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reports = await serviceReportService.list(getCallerScope(req));
    sendSuccess(res, 200, "Service reports", { reports });
  }),

  saveDraft: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await serviceReportService.saveDraft(
      req.params.projectId,
      req.body as SaveServiceReportInput,
      getCallerScope(req)
    );
    sendSuccess(res, 200, "Service report saved", result);
  }),

  getByProject: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await serviceReportService.getByProject(req.params.projectId, getCallerScope(req));
    sendSuccess(res, 200, "Service report", result);
  }),

  verify: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await serviceReportService.verify(req.params.code);
    sendSuccess(res, 200, "Service report verified", result);
  }),
};
