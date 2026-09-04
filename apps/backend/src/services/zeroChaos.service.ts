import mongoose from "mongoose";
import { Project, ProjectStatus, ProjectPriority } from "../models/Project";
import { TechnicianProfile, DutyStatus } from "../models/TechnicianProfile";
import { Invoice, InvoiceStatus } from "../models/Invoice";
import { Complaint, ComplaintStatus } from "../models/Complaint";
import { ServiceReminder, ServiceReminderStatus } from "../models/ServiceReminder";
import { CallerScope } from "../utils/callerScope";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";

function scopeFilter(scope: CallerScope) {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return {
    companyId: new mongoose.Types.ObjectId(scope.companyId),
    branchId: new mongoose.Types.ObjectId(scope.branchId),
  };
}

export interface OpsExceptionItem {
  id: string;
  kind: "unassigned" | "overdue_job" | "off_duty_assignment" | "assignment_unacknowledged" | "reschedule" | "failed_visit" | "stale_active" | "overdue_invoice" | "sla_complaint" | "service_due";
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  href: string;
  projectId?: string;
  customerName?: string;
  amount?: number;
  createdAt: string;
}

export const zeroChaosService = {
  async exceptionInbox(scope: CallerScope) {
    const tenant = scopeFilter(scope);
    const now = new Date();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const [projects, invoices, complaints, reminders] = await Promise.all([
      Project.find({ ...tenant, status: { $nin: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED] } })
        .populate("assignedTechnicianId", "name phone")
        .sort({ priority: -1, scheduledDate: 1, createdAt: -1 })
        .limit(300)
        .lean(),
      Invoice.find({ ...tenant, balanceDue: { $gt: 0 }, dueDate: { $lt: now }, status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.VOID] } })
        .sort({ dueDate: 1 }).limit(50).lean(),
      Complaint.find({ ...tenant, slaDueAt: { $lt: now }, status: { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] } })
        .sort({ slaDueAt: 1 }).limit(50).lean(),
      ServiceReminder.find({ ...tenant, status: ServiceReminderStatus.ACTIVE, dueDate: { $lte: now } })
        .sort({ dueDate: 1 }).limit(50).lean(),
    ]);

    const technicianIds = projects
      .map((p) => p.assignedTechnicianId && typeof p.assignedTechnicianId === "object" && "_id" in p.assignedTechnicianId ? String(p.assignedTechnicianId._id) : undefined)
      .filter((v): v is string => Boolean(v));
    const profiles = technicianIds.length
      ? await TechnicianProfile.find({ userId: { $in: technicianIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
      : [];
    const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));

    const items: OpsExceptionItem[] = [];
    for (const p of projects) {
      const projectId = String(p._id);
      const assignee = p.assignedTechnicianId && typeof p.assignedTechnicianId === "object" && "_id" in p.assignedTechnicianId ? p.assignedTechnicianId as unknown as { _id: mongoose.Types.ObjectId; name?: string } : undefined;
      const scheduled = p.scheduledDate ? new Date(p.scheduledDate) : null;
      const common = { projectId, customerName: p.customerName, href: `/dashboard/projects/${projectId}`, createdAt: (p.updatedAt ?? p.createdAt).toISOString() };

      if (!assignee) items.push({ id: `unassigned-${projectId}`, kind: "unassigned", severity: p.priority === ProjectPriority.URGENT ? "critical" : "high", title: `${p.projectCode} is unassigned`, detail: `${p.customerName} • ${p.serviceType.replaceAll("_", " ")}`, ...common });
      if (scheduled && scheduled < startToday) items.push({ id: `overdue-${projectId}`, kind: "overdue_job", severity: "high", title: `${p.projectCode} is overdue`, detail: `Scheduled ${scheduled.toLocaleDateString("en-IN")} and still ${p.status.replaceAll("_", " ")}`, ...common });
      if (p.assignedAt && !p.assignmentAcknowledgedAt && [ProjectPriority.HIGH, ProjectPriority.URGENT].includes(p.priority)) {
        const waitMinutes = (now.getTime() - new Date(p.assignedAt).getTime()) / 60000;
        const threshold = p.priority === ProjectPriority.URGENT ? 5 : 15;
        if (waitMinutes >= threshold) items.push({
          id: `unacked-${projectId}`, kind: "assignment_unacknowledged", severity: p.priority === ProjectPriority.URGENT ? "critical" : "high",
          title: `${p.projectCode} assignment not acknowledged`,
          detail: `${assignee?.name || "Technician"} has not acknowledged the ${p.priority === ProjectPriority.URGENT ? "High" : "Medium"} alert after ${Math.floor(waitMinutes)} min`,
          ...common,
        });
      }
      if (p.rescheduleRequestedAt) items.push({ id: `reschedule-${projectId}`, kind: "reschedule", severity: "medium", title: `Reschedule requested for ${p.projectCode}`, detail: p.rescheduleReason || "Field team requested a new slot", ...common });
      if (p.failedVisitAt) items.push({ id: `failed-${projectId}`, kind: "failed_visit", severity: "high", title: `Failed visit: ${p.projectCode}`, detail: `${p.failedVisitReason?.replaceAll("_", " ") || "Visit failed"}${p.failedVisitNotes ? ` • ${p.failedVisitNotes}` : ""}`, ...common });
      if ([ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS].includes(p.status) && new Date(p.updatedAt) < staleBefore) items.push({ id: `stale-${projectId}`, kind: "stale_active", severity: "medium", title: `${p.projectCode} has not moved for 2+ hours`, detail: `Current status: ${p.status.replaceAll("_", " ")}`, ...common });
      if (assignee) {
        const profile = profileByUser.get(String(assignee._id));
        if (profile?.currentDutyStatus === DutyStatus.OFF_DUTY) items.push({ id: `offduty-${projectId}`, kind: "off_duty_assignment", severity: "critical", title: `${p.projectCode} is assigned to an off-duty technician`, detail: `${assignee.name || "Technician"} is off duty — handover recommended`, ...common });
      }
    }

    for (const inv of invoices) items.push({ id: `invoice-${inv._id}`, kind: "overdue_invoice", severity: "high", title: `${inv.invoiceNumber} payment overdue`, detail: `${inv.customerName} • ₹${inv.balanceDue.toLocaleString("en-IN")} outstanding`, href: "/dashboard/invoices?status=overdue", customerName: inv.customerName, amount: inv.balanceDue, createdAt: inv.dueDate.toISOString() });
    for (const c of complaints) items.push({ id: `complaint-${c._id}`, kind: "sla_complaint", severity: c.priority === "critical" ? "critical" : "high", title: `${c.complaintNumber} breached SLA`, detail: `${c.customerName} • ${c.subject}`, href: "/dashboard/complaints", customerName: c.customerName, createdAt: c.slaDueAt.toISOString() });
    for (const r of reminders) items.push({ id: `reminder-${r._id}`, kind: "service_due", severity: r.dueDate < startToday ? "high" : "medium", title: `Service due: ${r.customerName}`, detail: `${r.serviceType.replaceAll("_", " ")} • ${r.address}`, href: "/dashboard/service-reminders?timing=overdue", customerName: r.customerName, createdAt: r.dueDate.toISOString() });

    const severityRank = { critical: 0, high: 1, medium: 2 } as const;
    items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return {
      items,
      metrics: {
        total: items.length,
        critical: items.filter((x) => x.severity === "critical").length,
        high: items.filter((x) => x.severity === "high").length,
        unassigned: items.filter((x) => x.kind === "unassigned").length,
        handover: items.filter((x) => x.kind === "off_duty_assignment" || x.kind === "failed_visit").length,
        reschedule: items.filter((x) => x.kind === "reschedule").length,
      },
    };
  },

  async endOfDay(scope: CallerScope) {
    const tenant = scopeFilter(scope);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const projectFilter: Record<string, unknown> = { ...tenant, scheduledDate: { $gte: start, $lt: end } };
    if (scope.role === UserRole.TECHNICIAN) projectFilter.assignedTechnicianId = new mongoose.Types.ObjectId(scope.userId);
    const rows = await Project.find(projectFilter).lean();
    return {
      date: start.toISOString(),
      assigned: rows.length,
      completed: rows.filter((p) => p.status === ProjectStatus.COMPLETED).length,
      active: rows.filter((p) => ![ProjectStatus.COMPLETED, ProjectStatus.CANCELLED].includes(p.status)).length,
      cancelled: rows.filter((p) => p.status === ProjectStatus.CANCELLED).length,
      failedVisits: rows.filter((p) => Boolean(p.failedVisitAt)).length,
      rescheduleRequests: rows.filter((p) => Boolean(p.rescheduleRequestedAt)).length,
      collectionsRecorded: rows.filter((p) => p.status === ProjectStatus.COMPLETED && Boolean(p.paymentMethod)).length,
    };
  },
};
