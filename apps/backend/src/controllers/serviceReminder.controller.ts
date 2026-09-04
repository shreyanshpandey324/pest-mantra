import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { serviceReminderService } from "../services/serviceReminder.service";
import { ListServiceRemindersInput, RescheduleServiceReminderInput } from "../validators/serviceReminder.validators";

export const serviceReminderController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(
      res,
      200,
      "Service reminders",
      await serviceReminderService.list(getCallerScope(req), req.query as unknown as ListServiceRemindersInput),
    );
  }),
  markRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, 200, "Reminder marked as read", { reminder: await serviceReminderService.markAdminRead(req.params.id, getCallerScope(req)) });
  }),
  markAllRead: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, 200, "All reminders marked as read", await serviceReminderService.markAllAdminRead(getCallerScope(req)));
  }),
  reschedule: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, 200, "Next service date updated", { reminder: await serviceReminderService.reschedule(req.params.id, req.body as RescheduleServiceReminderInput, getCallerScope(req)) });
  }),
  createNextProject: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, 201, "Follow-up project created", await serviceReminderService.createNextProject(req.params.id, getCallerScope(req)));
  }),
};
