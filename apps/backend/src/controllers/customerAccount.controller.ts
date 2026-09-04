import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { customerAccountService } from "../services/customerAccount.service";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { AddCustomerSiteInput, CreateCustomerAccountInput, UpdateCustomerAccountInput } from "../validators/customerAccount.validators";

export const customerAccountController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Customer master", await customerAccountService.list(getCallerScope(req), String(req.query.search ?? ""), req.query.status ? String(req.query.status) : undefined, req.query.type ? String(req.query.type) : undefined))),
  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Customer", { customer: await customerAccountService.get(req.params.id, getCallerScope(req)) })),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Customer created", { customer: await customerAccountService.create(req.body as CreateCustomerAccountInput, getCallerScope(req)) })),
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Customer updated", { customer: await customerAccountService.update(req.params.id, req.body as UpdateCustomerAccountInput, getCallerScope(req)) })),
  addSite: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Customer site added", { customer: await customerAccountService.addSite(req.params.id, req.body as AddCustomerSiteInput, getCallerScope(req)) })),
};
