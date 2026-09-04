import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { sendSuccess } from "../utils/ApiResponse";
import { zeroChaosService } from "../services/zeroChaos.service";

export const zeroChaosController = {
  exceptions: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await zeroChaosService.exceptionInbox(getCallerScope(req));
    sendSuccess(res, 200, "Operations exception inbox", data);
  }),
  endOfDay: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const summary = await zeroChaosService.endOfDay(getCallerScope(req));
    sendSuccess(res, 200, "End of day summary", { summary });
  }),
};
