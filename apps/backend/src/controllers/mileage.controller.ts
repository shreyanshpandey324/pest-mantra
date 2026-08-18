import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { mileageService } from "../services/mileage.service";

export const mileageController = {
  report: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope = getCallerScope(req);

      const logs =
        await mileageService.getReport(
          scope
        );

      sendSuccess(
        res,
        200,
        "Mileage report",
        {
          logs,
        }
      );
    }
  ),
};