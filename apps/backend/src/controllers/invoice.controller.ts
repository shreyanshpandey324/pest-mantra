import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { invoiceService } from "../services/invoice.service";
import { InvoiceStatus } from "../models/Invoice";

export const invoiceController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Invoices", { invoices: await invoiceService.list(getCallerScope(req), req.query as any) })),
  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Invoice", { invoice: await invoiceService.get(req.params.id, getCallerScope(req)) })),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Invoice created", { invoice: await invoiceService.create(req.body, getCallerScope(req)) })),
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Invoice updated", { invoice: await invoiceService.update(req.params.id, req.body, getCallerScope(req)) })),
  status: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Invoice status updated", { invoice: await invoiceService.changeStatus(req.params.id, req.body.status as InvoiceStatus.ISSUED | InvoiceStatus.VOID, getCallerScope(req)) })),
  payment: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Payment recorded", { invoice: await invoiceService.addPayment(req.params.id, req.body, getCallerScope(req)) })),
  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => { await invoiceService.remove(req.params.id, getCallerScope(req)); sendSuccess(res, 200, "Invoice deleted"); }),
};
