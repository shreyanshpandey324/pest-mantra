import { Response } from "express";
import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { getCallerScope } from "../utils/callerScope";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ApiError } from "../utils/ApiError";
import { expenseService } from "../services/expense.service";

export const expenseController = {
  listClaims: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expense claims", { expenses: await expenseService.listClaims(getCallerScope(req)) })),
  createClaim: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Expense claim submitted", { expense: await expenseService.createClaim(req.body, getCallerScope(req)) })),
  updateClaim: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expense claim updated", { expense: await expenseService.updateClaim(req.params.id, req.body, getCallerScope(req)) })),
  claimReceipt: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) throw ApiError.badRequest("No receipt image uploaded (expected field name 'receipt')");
    try { const expense = await expenseService.attachClaimReceipt(req.params.id, req.file, getCallerScope(req)); sendSuccess(res, 201, "Receipt uploaded", { expense }); }
    catch (err) { try { await fs.unlink(req.file.path); } catch { /* ignore */ } throw err; }
  }),
  claimReceiptFile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filePath = await expenseService.claimReceiptPath(req.params.id, getCallerScope(req));
    res.sendFile(filePath, { dotfiles: "deny", cacheControl: true, maxAge: "1h" });
  }),
  removeClaim: asyncHandler(async (req: AuthenticatedRequest, res: Response) => { await expenseService.removeClaim(req.params.id, getCallerScope(req)); sendSuccess(res, 200, "Expense claim deleted"); }),
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expenses", { expenses: await expenseService.list(getCallerScope(req), req.query as any) })),
  get: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expense", { expense: await expenseService.get(req.params.id, getCallerScope(req)) })),
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 201, "Expense created", { expense: await expenseService.create(req.body, getCallerScope(req)) })),
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expense updated", { expense: await expenseService.update(req.params.id, req.body, getCallerScope(req)) })),
  status: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Expense status updated", { expense: await expenseService.changeStatus(req.params.id, req.body.status, req.body.note, req.body.paidAt, getCallerScope(req)) })),
  receipt: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) throw ApiError.badRequest("No receipt image uploaded (expected field name 'receipt')");
    try {
      const expense = await expenseService.attachReceipt(req.params.id, req.file, getCallerScope(req));
      sendSuccess(res, 201, "Receipt uploaded", { expense });
    } catch (err) {
      try { await fs.unlink(req.file.path); } catch { /* ignore */ }
      throw err;
    }
  }),
  receiptFile: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filePath = await expenseService.receiptPath(req.params.id, getCallerScope(req));
    res.sendFile(filePath, { dotfiles: "deny", cacheControl: true, maxAge: "1h" });
  }),
  remove: asyncHandler(async (req: AuthenticatedRequest, res: Response) => { await expenseService.remove(req.params.id, getCallerScope(req)); sendSuccess(res, 200, "Expense deleted"); }),
  summary: asyncHandler(async (req: AuthenticatedRequest, res: Response) => sendSuccess(res, 200, "Finance summary", { summary: await expenseService.summary(getCallerScope(req), req.query as any) })),
};
