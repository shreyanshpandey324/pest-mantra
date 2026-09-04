import mongoose from "mongoose";
import { ServiceReminder, ServiceReminderStatus } from "../models/ServiceReminder";
import { ServiceReport, ServiceReportStatus } from "../models/ServiceReport";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { projectService } from "./project.service";
import { ListServiceRemindersInput, RescheduleServiceReminderInput } from "../validators/serviceReminder.validators";

const backfillLastRun = new Map<string, number>();
const BACKFILL_INTERVAL_MS = 10 * 60 * 1000;

function backfillKey(filter: Record<string, unknown>) {
  const parts = Object.entries(filter)
    .map(([key, value]) => `${key}:${String(value)}`)
    .sort();
  return parts.length ? parts.join("|") : "global";
}

function tenantFilter(scope: CallerScope): Record<string, unknown> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !mongoose.Types.ObjectId.isValid(scope.companyId)) {
    throw ApiError.forbidden("Your account is not linked to a valid company");
  }
  if (!scope.branchId || !mongoose.Types.ObjectId.isValid(scope.branchId)) {
    throw ApiError.forbidden("Your account is not linked to a valid branch");
  }
  return {
    companyId: new mongoose.Types.ObjectId(scope.companyId),
    branchId: new mongoose.Types.ObjectId(scope.branchId),
  };
}

function dayStart(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function stateFor(dueDate: Date) {
  const today = dayStart();
  const due = dayStart(dueDate);
  const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (daysUntil < 0) return { timing: "overdue" as const, daysUntil };
  if (daysUntil === 0) return { timing: "due_today" as const, daysUntil };
  if (daysUntil <= 2) return { timing: "due_soon" as const, daysUntil };
  if (daysUntil <= 7) return { timing: "upcoming" as const, daysUntil };
  return { timing: "scheduled" as const, daysUntil };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function timingFilter(timing: ListServiceRemindersInput["timing"]): Record<string, unknown> | undefined {
  if (!timing) return undefined;
  const today = dayStart();
  if (timing === "overdue") return { dueDate: { $lt: today } };
  if (timing === "due_today") return { dueDate: { $gte: today, $lt: addDays(today, 1) } };
  if (timing === "due_soon") return { dueDate: { $gte: addDays(today, 1), $lt: addDays(today, 3) } };
  if (timing === "upcoming") return { dueDate: { $gte: addDays(today, 3), $lt: addDays(today, 8) } };
  return { dueDate: { $gte: addDays(today, 8) } };
}

export async function backfillServiceReminders(filter: Record<string, unknown>) {
  const key = backfillKey(filter);
  const now = Date.now();
  if (now - (backfillLastRun.get(key) ?? 0) < BACKFILL_INTERVAL_MS) return;
  backfillLastRun.set(key, now);

  try {
    const reports = await ServiceReport.find({
      ...filter,
      status: ServiceReportStatus.FINALIZED,
      nextServiceDate: { $exists: true, $ne: null },
    }).select("_id companyId branchId projectId customerName customerPhone address serviceType nextServiceDate").limit(2500);

    if (!reports.length) return;
    await ServiceReminder.bulkWrite(
      reports.map((report) => ({
        updateOne: {
          filter: { sourceReportId: report._id },
          update: {
            $setOnInsert: {
              sourceReportId: report._id,
              companyId: report.companyId,
              branchId: report.branchId,
              sourceProjectId: report.projectId,
              customerName: report.customerName,
              customerPhone: report.customerPhone,
              address: report.address,
              serviceType: report.serviceType,
              dueDate: report.nextServiceDate,
              status: ServiceReminderStatus.ACTIVE,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  } catch (error) {
    backfillLastRun.delete(key);
    throw error;
  }
}

function serialize(reminder: InstanceType<typeof ServiceReminder>) {
  return {
    id: reminder._id.toString(),
    companyId: reminder.companyId?.toString(),
    branchId: reminder.branchId?.toString(),
    sourceReportId: reminder.sourceReportId.toString(),
    sourceProjectId: reminder.sourceProjectId.toString(),
    nextProjectId: reminder.nextProjectId?.toString(),
    customerName: reminder.customerName,
    customerPhone: reminder.customerPhone,
    address: reminder.address,
    serviceType: reminder.serviceType,
    dueDate: reminder.dueDate.toISOString(),
    status: reminder.status,
    adminReadAt: reminder.adminReadAt?.toISOString(),
    customerReadAt: reminder.customerReadAt?.toISOString(),
    notes: reminder.notes,
    ...stateFor(reminder.dueDate),
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
  };
}

function filteredQuery(tenant: Record<string, unknown>, query: ListServiceRemindersInput) {
  const conditions: Record<string, unknown>[] = [
    { ...tenant, status: ServiceReminderStatus.ACTIVE },
  ];

  if (query.search) {
    const safe = escapeRegex(query.search);
    conditions.push({
      $or: [
        { customerName: { $regex: safe, $options: "i" } },
        { customerPhone: { $regex: safe, $options: "i" } },
        { address: { $regex: safe, $options: "i" } },
      ],
    });
  }
  if (query.serviceType) conditions.push({ serviceType: query.serviceType });
  if (query.unread === "true") conditions.push({ adminReadAt: { $exists: false } });
  if (query.unread === "false") conditions.push({ adminReadAt: { $exists: true } });

  const timing = timingFilter(query.timing);
  if (timing) conditions.push(timing);

  if (query.from) conditions.push({ dueDate: { $gte: dayStart(new Date(query.from)) } });
  if (query.to) conditions.push({ dueDate: { $lt: addDays(dayStart(new Date(query.to)), 1) } });

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

async function globalMetrics(tenant: Record<string, unknown>) {
  const today = dayStart();
  const tomorrow = addDays(today, 1);
  const afterSevenDays = addDays(today, 8);
  const base = { ...tenant, status: ServiceReminderStatus.ACTIVE };
  const [total, unread, overdue, dueToday, next7Days] = await Promise.all([
    ServiceReminder.countDocuments(base),
    ServiceReminder.countDocuments({ ...base, adminReadAt: { $exists: false } }),
    ServiceReminder.countDocuments({ ...base, dueDate: { $lt: today } }),
    ServiceReminder.countDocuments({ ...base, dueDate: { $gte: today, $lt: tomorrow } }),
    ServiceReminder.countDocuments({ ...base, dueDate: { $gte: today, $lt: afterSevenDays } }),
  ]);
  return { total, unread, overdue, dueToday, next7Days };
}

export const serviceReminderService = {
  async list(scope: CallerScope, query: ListServiceRemindersInput) {
    const tenant = tenantFilter(scope);
    await backfillServiceReminders(tenant);

    const filter = filteredQuery(tenant, query);
    const [totalFiltered, metrics] = await Promise.all([
      ServiceReminder.countDocuments(filter),
      globalMetrics(tenant),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalFiltered / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const sort: Record<string, 1 | -1> = query.sort === "due_desc"
      ? { dueDate: -1, _id: -1 }
      : query.sort === "created_desc"
        ? { createdAt: -1, _id: -1 }
        : { dueDate: 1, _id: 1 };

    const reminders = await ServiceReminder.find(filter)
      .sort(sort)
      .skip((page - 1) * query.pageSize)
      .limit(query.pageSize);

    return {
      reminders: reminders.map(serialize),
      metrics,
      pagination: {
        page,
        pageSize: query.pageSize,
        total: totalFiltered,
        totalPages: totalFiltered === 0 ? 0 : totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: totalFiltered > 0 && page < totalPages,
      },
    };
  },

  async markAdminRead(id: string, scope: CallerScope) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Service reminder not found");
    const reminder = await ServiceReminder.findOneAndUpdate(
      { _id: id, ...tenantFilter(scope) },
      { $set: { adminReadAt: new Date() } },
      { new: true },
    );
    if (!reminder) throw ApiError.notFound("Service reminder not found");
    return serialize(reminder);
  },

  async markAllAdminRead(scope: CallerScope) {
    await ServiceReminder.updateMany(
      { ...tenantFilter(scope), status: ServiceReminderStatus.ACTIVE, adminReadAt: { $exists: false } },
      { $set: { adminReadAt: new Date() } },
    );
    return { success: true };
  },

  async reschedule(id: string, input: RescheduleServiceReminderInput, scope: CallerScope) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Service reminder not found");
    const due = new Date(input.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due.getTime() < today.getTime()) throw ApiError.badRequest("Next service date cannot be in the past");
    const reminder = await ServiceReminder.findOneAndUpdate(
      { _id: id, ...tenantFilter(scope), status: ServiceReminderStatus.ACTIVE, nextProjectId: { $exists: false } },
      { $set: { dueDate: due, notes: input.notes?.trim() || undefined }, $unset: { adminReadAt: 1, customerReadAt: 1 } },
      { new: true, runValidators: true },
    );
    if (!reminder) throw ApiError.conflict("This reminder cannot be rescheduled after the next job has been created");
    return serialize(reminder);
  },

  async createNextProject(id: string, scope: CallerScope) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Service reminder not found");
    const reminder = await ServiceReminder.findOne({ _id: id, ...tenantFilter(scope), status: ServiceReminderStatus.ACTIVE });
    if (!reminder) throw ApiError.notFound("Service reminder not found");
    if (reminder.nextProjectId) throw ApiError.conflict("A next-service job has already been created from this reminder");

    const project = await projectService.createProject(
      {
        customerName: reminder.customerName,
        customerPhone: reminder.customerPhone,
        address: reminder.address,
        serviceType: reminder.serviceType,
        companyId: reminder.companyId?.toString(),
        branchId: reminder.branchId?.toString(),
        notes: `Follow-up service created from next-service reminder due ${reminder.dueDate.toLocaleDateString("en-IN")}. Source project: ${reminder.sourceProjectId.toString()}${reminder.notes ? `\n${reminder.notes}` : ""}`,
      },
      scope,
    );

    const updated = await ServiceReminder.findOneAndUpdate(
      { _id: reminder._id, nextProjectId: { $exists: false } },
      { $set: { nextProjectId: project._id, status: ServiceReminderStatus.COMPLETED, adminReadAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      await projectService.deleteProject(project._id.toString(), scope).catch(() => undefined);
      throw ApiError.conflict("Another user created this follow-up job at the same time. Please refresh.");
    }
    return { reminder: serialize(updated), project };
  },
};
