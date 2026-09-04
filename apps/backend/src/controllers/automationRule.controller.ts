import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { automationRuleService } from "../services/automationRule.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
export const automationRuleController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Automation center", await automationRuleService.list(getCallerScope(req)))),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Automation rule created", { rule: await automationRuleService.create(getCallerScope(req), req.body) })),
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Automation rule updated", { rule: await automationRuleService.update(getCallerScope(req), req.params.id, req.body) })),
  seedDefaults: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Default automations prepared", await automationRuleService.seedDefaults(getCallerScope(req)))),
};
