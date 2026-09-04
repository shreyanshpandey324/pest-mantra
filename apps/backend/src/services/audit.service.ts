import mongoose, { FilterQuery } from "mongoose";
import { AuditLog, IAuditLog } from "../models/AuditLog";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { ListAuditLogsInput } from "../validators/audit.validators";

function scopeFilter(scope: CallerScope): FilterQuery<IAuditLog> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) };
}
function safeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export const auditService = {
  async list(scope: CallerScope, query: ListAuditLogsInput) {
    const conditions: FilterQuery<IAuditLog>[] = [scopeFilter(scope)];
    if (query.search) {
      const q = safeRegex(query.search);
      conditions.push({ $or: [{ action: { $regex: q, $options: "i" } }, { path: { $regex: q, $options: "i" } }, { entityType: { $regex: q, $options: "i" } }, { entityId: { $regex: q, $options: "i" } }] });
    }
    if (query.entityType) conditions.push({ entityType: query.entityType });
    if (query.actorId) conditions.push({ actorId: new mongoose.Types.ObjectId(query.actorId) });
    if (query.from || query.to) conditions.push({ createdAt: { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) } });
    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).populate("actorId", "name phone role").sort({ createdAt: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize).lean(),
    ]);
    return { logs: rows.map((row: any) => ({ ...row, _id: row._id.toString(), companyId: row.companyId?.toString(), branchId: row.branchId?.toString(), actor: row.actorId && typeof row.actorId === "object" ? { _id: row.actorId._id.toString(), name: row.actorId.name, phone: row.actorId.phone, role: row.actorId.role } : undefined, actorId: row.actorId?._id?.toString?.() ?? row.actorId?.toString?.(), createdAt: row.createdAt.toISOString() })), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  },
};
