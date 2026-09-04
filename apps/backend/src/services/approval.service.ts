import mongoose from "mongoose";
import { ApprovalRequest, ApprovalStatus } from "../models/ApprovalRequest";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { z } from "zod";
import { createApprovalSchema, resolveApprovalSchema } from "../validators/approval.validators";
type CreateInput = z.infer<typeof createApprovalSchema>; type ResolveInput = z.infer<typeof resolveApprovalSchema>;
function filter(scope: CallerScope): Record<string, unknown> { if (scope.role === UserRole.SUPER_ADMIN) return {}; if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Company and branch context are required"); return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) }; }
function num() { return `APR-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
export const approvalService = {
  async list(scope: CallerScope, status?: string) { const where: Record<string, unknown> = { ...filter(scope) }; if (status) where.status = status; const approvals = await ApprovalRequest.find(where).sort({ status: 1, createdAt: -1 }).limit(250).lean(); return { approvals, metrics: { total: approvals.length, pending: approvals.filter((x) => x.status === ApprovalStatus.PENDING).length, approved: approvals.filter((x) => x.status === ApprovalStatus.APPROVED).length, rejected: approvals.filter((x) => x.status === ApprovalStatus.REJECTED).length, pendingValue: approvals.filter((x) => x.status === ApprovalStatus.PENDING).reduce((sum, x) => sum + Number(x.amount ?? 0), 0) } }; },
  async create(scope: CallerScope, input: CreateInput) { return ApprovalRequest.create({ companyId: scope.companyId && mongoose.Types.ObjectId.isValid(scope.companyId) ? scope.companyId : undefined, branchId: scope.branchId && mongoose.Types.ObjectId.isValid(scope.branchId) ? scope.branchId : undefined, approvalNumber: num(), ...input, relatedId: input.relatedId && mongoose.Types.ObjectId.isValid(input.relatedId) ? input.relatedId : undefined, requestedBy: new mongoose.Types.ObjectId(scope.userId), requestedByName: scope.role }); },
  async resolve(scope: CallerScope, id: string, input: ResolveInput) { if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Approval not found"); const row = await ApprovalRequest.findOne({ _id: id, ...filter(scope) }); if (!row) throw ApiError.notFound("Approval not found"); if (row.status !== ApprovalStatus.PENDING) throw ApiError.conflict("Approval is already resolved"); row.status = input.status; row.resolutionNote = input.resolutionNote; row.resolvedBy = new mongoose.Types.ObjectId(scope.userId); row.resolvedAt = new Date(); await row.save(); return row; },
};
