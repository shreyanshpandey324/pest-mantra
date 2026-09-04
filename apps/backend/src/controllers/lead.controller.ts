import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { leadService } from "../services/lead.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import {
  AddLeadActivityInput,
  CreateLeadInput,
  ListLeadsInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from "../validators/lead.validators";

export const leadController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await leadService.list(getCallerScope(req), req.query as unknown as ListLeadsInput);
    sendSuccess(res, 200, "Leads", data);
  }),

  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const lead = await leadService.get(req.params.id, getCallerScope(req));
    sendSuccess(res, 200, "Lead", { lead });
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const lead = await leadService.create(req.body as CreateLeadInput, getCallerScope(req));
    sendSuccess(res, 201, "Lead created", { lead });
  }),

  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const lead = await leadService.update(req.params.id, req.body as UpdateLeadInput, getCallerScope(req));
    sendSuccess(res, 200, "Lead updated", { lead });
  }),

  updateStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const lead = await leadService.updateStatus(req.params.id, req.body as UpdateLeadStatusInput, getCallerScope(req));
    sendSuccess(res, 200, "Lead status updated", { lead });
  }),

  addActivity: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const lead = await leadService.addActivity(req.params.id, req.body as AddLeadActivityInput, getCallerScope(req));
    sendSuccess(res, 201, "Lead activity added", { lead });
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await leadService.remove(req.params.id, getCallerScope(req));
    sendSuccess(res, 200, "Lead deleted");
  }),

  assignees: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const assignees = await leadService.assignees(
      getCallerScope(req),
      req.query.companyId ? String(req.query.companyId) : undefined,
      req.query.branchId ? String(req.query.branchId) : undefined,
    );
    sendSuccess(res, 200, "Lead assignees", { assignees });
  }),
};
