import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { notificationAlertService } from "../services/notificationAlert.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { sendSuccess } from "../utils/ApiResponse";
export const notificationAlertController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Notification center", await notificationAlertService.list(getCallerScope(req), req.query as any))),
  sweep: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Notification sweep complete", await notificationAlertService.runSweep())),
  read: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Notification read", { alert: await notificationAlertService.markRead(req.params.id, getCallerScope(req)) })),
  readAll: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Notifications read", await notificationAlertService.markAllRead(getCallerScope(req)))),
};
