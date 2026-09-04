import mongoose, { FilterQuery } from "mongoose";
import { Branch } from "../models/Branch";
import {
  Complaint,
  ComplaintActivityType,
  ComplaintPriority,
  ComplaintStatus,
  IComplaint,
} from "../models/Complaint";
import { Project } from "../models/Project";
import { User, UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { CreateComplaintInput, ListComplaintsInput, UpdateComplaintInput } from "../validators/complaint.validators";

function objectId(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function tenantFilter(scope: CallerScope): FilterQuery<IComplaint> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: objectId(scope.companyId), branchId: objectId(scope.branchId) };
}

function safeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function slaHours(priority: ComplaintPriority) {
  if (priority === ComplaintPriority.CRITICAL) return 4;
  if (priority === ComplaintPriority.HIGH) return 12;
  if (priority === ComplaintPriority.MEDIUM) return 24;
  return 48;
}

function calculateSla(priority: ComplaintPriority, from = new Date()) {
  return new Date(from.getTime() + slaHours(priority) * 60 * 60 * 1000);
}

async function resolveOwnership(input: CreateComplaintInput, scope: CallerScope) {
  if (input.projectId) {
    const project = await Project.findById(objectId(input.projectId, "Invalid project id")).select("_id companyId branchId customerName customerPhone");
    if (!project) throw ApiError.notFound("Project not found");
    if (scope.role === UserRole.OFFICE_ADMIN) {
      if (project.companyId?.toString() !== scope.companyId || project.branchId?.toString() !== scope.branchId) {
        throw ApiError.forbidden("Project is outside your branch");
      }
    }
    if (!project.companyId || !project.branchId) throw ApiError.badRequest("Selected project has no company/branch ownership");
    return { companyId: project.companyId, branchId: project.branchId };
  }
  if (scope.role === UserRole.SUPER_ADMIN) {
    if (!input.companyId || !input.branchId) throw ApiError.badRequest("Company and branch are required");
    const companyId = objectId(input.companyId, "Invalid company id");
    const branchId = objectId(input.branchId, "Invalid branch id");
    const branch = await Branch.findOne({ _id: branchId, companyId, isActive: true }).select("_id");
    if (!branch) throw ApiError.badRequest("Branch is inactive or outside the selected company");
    return { companyId, branchId };
  }
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: objectId(scope.companyId), branchId: objectId(scope.branchId) };
}

async function validateAssignee(assignedTo: string | undefined | null, ownership: { companyId: mongoose.Types.ObjectId; branchId: mongoose.Types.ObjectId }) {
  if (!assignedTo) return undefined;
  const user = await User.findById(objectId(assignedTo, "Invalid assignee id")).select("_id role companyId branchId isActive");
  if (!user || !user.isActive) throw ApiError.badRequest("Selected assignee is not active");
  if (![UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN].includes(user.role)) throw ApiError.badRequest("Complaint assignee must be an admin");
  if (user.role === UserRole.OFFICE_ADMIN && (user.companyId?.toString() !== ownership.companyId.toString() || user.branchId?.toString() !== ownership.branchId.toString())) {
    throw ApiError.forbidden("Selected assignee belongs to another branch");
  }
  return user._id;
}

async function generateNumber() {
  const now = new Date();
  const prefix = `CMP-${now.getFullYear()}-`;
  const start = new Date(now.getFullYear(), 0, 1);
  const count = await Complaint.countDocuments({ createdAt: { $gte: start } });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = `${prefix}${String(count + attempt + 1).padStart(5, "0")}`;
    if (!(await Complaint.exists({ complaintNumber: value }))) return value;
  }
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

async function visible(id: string, scope: CallerScope) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Complaint not found");
  const complaint = await Complaint.findOne({ _id: id, ...tenantFilter(scope) });
  if (!complaint) throw ApiError.notFound("Complaint not found");
  return complaint;
}

async function names(ids: mongoose.Types.ObjectId[]) {
  if (!ids.length) return new Map<string, string>();
  const users = await User.find({ _id: { $in: ids } }).select("_id name");
  return new Map(users.map((u) => [u._id.toString(), u.name]));
}

function serialize(item: IComplaint, userNames: Map<string, string> = new Map()) {
  return {
    _id: item._id.toString(),
    companyId: item.companyId.toString(),
    branchId: item.branchId.toString(),
    complaintNumber: item.complaintNumber,
    projectId: item.projectId?.toString(),
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    subject: item.subject,
    description: item.description,
    category: item.category,
    priority: item.priority,
    status: item.status,
    assignedTo: item.assignedTo?.toString(),
    assignedToName: item.assignedTo ? userNames.get(item.assignedTo.toString()) : undefined,
    slaDueAt: item.slaDueAt.toISOString(),
    isOverdue: ![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(item.status) && item.slaDueAt.getTime() < Date.now(),
    resolution: item.resolution,
    resolvedAt: item.resolvedAt?.toISOString(),
    closedAt: item.closedAt?.toISOString(),
    createdBy: item.createdBy?.toString(),
    source: item.source,
    activities: item.activities.map((a) => ({
      _id: a._id?.toString(), type: a.type, note: a.note, actorId: a.actorId?.toString(), actorName: a.actorName ?? (a.actorId ? userNames.get(a.actorId.toString()) : undefined), createdAt: a.createdAt.toISOString(),
    })),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

const ACTIVE = [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS, ComplaintStatus.WAITING_CUSTOMER, ComplaintStatus.REOPENED];

export const complaintService = {
  async list(scope: CallerScope, query: ListComplaintsInput) {
    const conditions: FilterQuery<IComplaint>[] = [tenantFilter(scope)];
    if (query.search) {
      const q = safeRegex(query.search);
      conditions.push({ $or: [
        { complaintNumber: { $regex: q, $options: "i" } }, { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } }, { subject: { $regex: q, $options: "i" } },
      ] });
    }
    if (query.status) conditions.push({ status: query.status });
    if (query.priority) conditions.push({ priority: query.priority });
    if (query.category) conditions.push({ category: query.category });
    if (query.assignedTo) conditions.push({ assignedTo: objectId(query.assignedTo) });
    if (query.overdue === "true") conditions.push({ status: { $in: ACTIVE }, slaDueAt: { $lt: new Date() } });
    if (query.overdue === "false") conditions.push({ $or: [{ status: { $nin: ACTIVE } }, { slaDueAt: { $gte: new Date() } }] });
    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
    const [total, items, open, overdue, critical, resolved] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.find(filter).sort({ status: 1, slaDueAt: 1, updatedAt: -1 }).skip((query.page - 1) * query.pageSize).limit(query.pageSize),
      Complaint.countDocuments({ ...tenantFilter(scope), status: { $in: ACTIVE } }),
      Complaint.countDocuments({ ...tenantFilter(scope), status: { $in: ACTIVE }, slaDueAt: { $lt: new Date() } }),
      Complaint.countDocuments({ ...tenantFilter(scope), status: { $in: ACTIVE }, priority: ComplaintPriority.CRITICAL }),
      Complaint.countDocuments({ ...tenantFilter(scope), status: ComplaintStatus.RESOLVED }),
    ]);
    const ids = items.flatMap((item) => [item.assignedTo, item.createdBy, ...item.activities.map((a) => a.actorId)]).filter(Boolean) as mongoose.Types.ObjectId[];
    const userNames = await names(ids);
    return { complaints: items.map((item) => serialize(item, userNames)), metrics: { total: await Complaint.countDocuments(tenantFilter(scope)), open, overdue, critical, resolved }, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
  },

  async get(id: string, scope: CallerScope) {
    const item = await visible(id, scope);
    const ids = [item.assignedTo, item.createdBy, ...item.activities.map((a) => a.actorId)].filter(Boolean) as mongoose.Types.ObjectId[];
    return serialize(item, await names(ids));
  },

  async create(input: CreateComplaintInput, scope: CallerScope) {
    const ownership = await resolveOwnership(input, scope);
    const assignedTo = await validateAssignee(input.assignedTo ?? scope.userId, ownership);
    const item = await Complaint.create({
      companyId: ownership.companyId, branchId: ownership.branchId, complaintNumber: await generateNumber(),
      projectId: input.projectId ? objectId(input.projectId) : undefined, customerName: input.customerName, customerPhone: input.customerPhone,
      subject: input.subject, description: input.description, category: input.category, priority: input.priority,
      status: ComplaintStatus.OPEN, assignedTo, slaDueAt: calculateSla(input.priority), createdBy: objectId(scope.userId),
      source: "admin",
      activities: [{ type: ComplaintActivityType.CREATED, note: `Complaint created with ${input.priority} priority`, actorId: objectId(scope.userId), createdAt: new Date() }],
    });
    return serialize(item, await names([assignedTo, objectId(scope.userId)].filter(Boolean) as mongoose.Types.ObjectId[]));
  },

  async update(id: string, input: UpdateComplaintInput, scope: CallerScope) {
    const item = await visible(id, scope);
    const ownership = { companyId: item.companyId, branchId: item.branchId };
    const actorId = objectId(scope.userId);
    if (input.assignedTo !== undefined) {
      item.assignedTo = await validateAssignee(input.assignedTo, ownership);
      item.activities.push({ type: ComplaintActivityType.ASSIGNMENT, note: input.assignedTo ? "Complaint reassigned" : "Complaint unassigned", actorId, createdAt: new Date() });
    }
    if (input.priority && input.priority !== item.priority) {
      item.priority = input.priority;
      item.slaDueAt = calculateSla(input.priority);
      item.activities.push({ type: ComplaintActivityType.PRIORITY, note: `Priority changed to ${input.priority}`, actorId, createdAt: new Date() });
    }
    if (input.status && input.status !== item.status) {
      const previous = item.status;
      item.status = input.status;
      if (input.status === ComplaintStatus.RESOLVED) item.resolvedAt = new Date();
      if (input.status === ComplaintStatus.CLOSED) item.closedAt = new Date();
      if (input.status === ComplaintStatus.REOPENED) { item.resolvedAt = undefined; item.closedAt = undefined; item.slaDueAt = calculateSla(item.priority); }
      item.activities.push({ type: ComplaintActivityType.STATUS, note: `Status changed from ${previous} to ${input.status}`, actorId, createdAt: new Date() });
    }
    if (input.category) item.category = input.category;
    if (input.subject) item.subject = input.subject;
    if (input.description) item.description = input.description;
    if (input.resolution !== undefined) {
      item.resolution = input.resolution;
      item.activities.push({ type: ComplaintActivityType.RESOLUTION, note: input.resolution || "Resolution cleared", actorId, createdAt: new Date() });
    }
    await item.save();
    const ids = [item.assignedTo, item.createdBy, ...item.activities.map((a) => a.actorId)].filter(Boolean) as mongoose.Types.ObjectId[];
    return serialize(item, await names(ids));
  },

  async comment(id: string, note: string, scope: CallerScope) {
    const item = await visible(id, scope);
    item.activities.push({ type: ComplaintActivityType.COMMENT, note, actorId: objectId(scope.userId), createdAt: new Date() });
    await item.save();
    const ids = [item.assignedTo, item.createdBy, ...item.activities.map((a) => a.actorId)].filter(Boolean) as mongoose.Types.ObjectId[];
    return serialize(item, await names(ids));
  },

  async createFromPortal(input: { companyId: string; branchId: string; customerName: string; customerPhone: string; projectId?: string; subject: string; description: string; category: import("../models/Complaint").ComplaintCategory; priority: ComplaintPriority }) {
    const companyId = objectId(input.companyId, "Invalid company id");
    const branchId = objectId(input.branchId, "Invalid branch id");
    let projectId: mongoose.Types.ObjectId | undefined;
    if (input.projectId) {
      projectId = objectId(input.projectId, "Invalid project id");
      const project = await Project.findOne({ _id: projectId, companyId, branchId, customerPhone: input.customerPhone }).select("_id");
      if (!project) throw ApiError.forbidden("Selected project is not available in this customer portal");
    }
    const item = await Complaint.create({ companyId, branchId, complaintNumber: await generateNumber(), projectId, customerName: input.customerName, customerPhone: input.customerPhone, subject: input.subject, description: input.description, category: input.category, priority: input.priority, status: ComplaintStatus.OPEN, slaDueAt: calculateSla(input.priority), source: "customer_portal", activities: [{ type: ComplaintActivityType.CREATED, note: "Complaint raised by customer portal", actorName: input.customerName, createdAt: new Date() }] });
    return serialize(item);
  },
};
