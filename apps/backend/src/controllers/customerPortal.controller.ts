import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { CustomerPortalRequest } from "../middleware/customerPortal.middleware";
import { customerPortalService } from "../services/customerPortal.service";
import { sendSuccess } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { getCallerScope } from "../utils/callerScope";
import { ApiError } from "../utils/ApiError";
import { CustomerPortalLoginInput, CustomerQuotationDecisionInput, CustomerComplaintInput } from "../validators/customerPortal.validators";
import { complaintService } from "../services/complaint.service";

function portalIdentity(req: CustomerPortalRequest) {
  if (!req.customerPortal) throw ApiError.unauthorized("Customer portal authentication required");
  return req.customerPortal;
}

export const customerPortalController = {
  accessForProject: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await customerPortalService.accessForProject(req.params.projectId, getCallerScope(req));
    sendSuccess(res, 200, "Customer portal access", data);
  }),

  issueAccess: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await customerPortalService.issueAccess(req.params.projectId, getCallerScope(req));
    sendSuccess(res, 200, "Customer portal access code generated", data);
  }),

  revokeAccess: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await customerPortalService.revokeAccess(req.params.projectId, getCallerScope(req));
    sendSuccess(res, 200, "Customer portal access revoked", data);
  }),

  login: asyncHandler(async (req: CustomerPortalRequest, res: Response) => {
    const data = await customerPortalService.login(req.body as CustomerPortalLoginInput);
    sendSuccess(res, 200, "Customer portal signed in", data);
  }),

  dashboard: asyncHandler(async (req: CustomerPortalRequest, res: Response) => {
    const data = await customerPortalService.dashboard(portalIdentity(req));
    sendSuccess(res, 200, "Customer portal", data);
  }),

  markReminderRead: asyncHandler(async (req: CustomerPortalRequest, res: Response) => {
    const data = await customerPortalService.markReminderRead(req.params.reminderId, portalIdentity(req));
    sendSuccess(res, 200, "Service reminder marked as seen", data);
  }),


  createComplaint: asyncHandler(async (req: CustomerPortalRequest, res: Response) => {
    const identity = portalIdentity(req);
    const input = req.body as CustomerComplaintInput;
    const complaint = await complaintService.createFromPortal({
      companyId: identity.companyId,
      branchId: identity.branchId,
      customerName: identity.customerName,
      customerPhone: identity.customerPhone,
      projectId: input.projectId,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
    });
    sendSuccess(res, 201, "Complaint registered", { complaint });
  }),

  quotationDecision: asyncHandler(async (req: CustomerPortalRequest, res: Response) => {
    const data = await customerPortalService.quotationDecision(
      req.params.quotationId,
      req.body as CustomerQuotationDecisionInput,
      portalIdentity(req),
    );
    sendSuccess(res, 200, "Quotation updated", data);
  }),
};
