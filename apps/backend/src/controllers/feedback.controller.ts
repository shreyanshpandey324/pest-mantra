import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { feedbackService } from "../services/feedback.service";
import { sendSuccess } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { ListFeedbackInput, SubmitFeedbackInput } from "../validators/feedback.validators";

export const feedbackController = {
  publicInfo: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await feedbackService.publicInfo(req.params.code);
    sendSuccess(res, 200, "Feedback request", result);
  }),

  submit: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await feedbackService.submit(req.params.code, req.body as SubmitFeedbackInput);
    sendSuccess(res, 201, "Thank you for your feedback", result);
  }),

  dashboard: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await feedbackService.dashboard(getCallerScope(req), req.query as unknown as ListFeedbackInput);
    sendSuccess(res, 200, "Customer feedback", result);
  }),
};
