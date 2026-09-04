import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { OutboundChannel } from "../models/OutboundMessage";
import { communicationService } from "../services/communication.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";

export const communicationController = {
  status: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Communication capability", communicationService.status())),
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Outbound messages", { messages: await communicationService.list(getCallerScope(req), Number(req.query.limit ?? 50)) })),
  queueFromAlert: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const message = await communicationService.queueFromAlert(req.params.id, req.body?.channel as OutboundChannel, getCallerScope(req));
    sendSuccess(res, 200, "Delivery queued", { message });
  }),
  process: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Outbox processed", await communicationService.processQueue(getCallerScope(req)))),
};
