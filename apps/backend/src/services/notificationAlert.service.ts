import mongoose, { FilterQuery } from "mongoose";
import { Complaint, ComplaintStatus } from "../models/Complaint";
import { ContractStatus, ServiceContract } from "../models/ServiceContract";
import { Invoice, InvoiceStatus } from "../models/Invoice";
import { Lead, LeadStatus } from "../models/Lead";
import { NotificationAlert, NotificationAlertKind, NotificationSeverity, INotificationAlert } from "../models/NotificationAlert";
import { ServiceReminder, ServiceReminderStatus } from "../models/ServiceReminder";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { AutomationRule } from "../models/AutomationRule";
import { communicationService } from "./communication.service";
import { OutboundChannel } from "../models/OutboundMessage";

function scopeFilter(scope: CallerScope): FilterQuery<INotificationAlert> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) };
}

async function applyAutomation(alert: INotificationAlert): Promise<void> {
  const triggerMap: Partial<Record<NotificationAlertKind, string>> = {
    [NotificationAlertKind.SERVICE_DUE]: "service_due",
    [NotificationAlertKind.INVOICE_OVERDUE]: "invoice_overdue",
    [NotificationAlertKind.AMC_RENEWAL]: "amc_renewal",
    [NotificationAlertKind.LEAD_FOLLOW_UP]: "lead_followup",
    [NotificationAlertKind.COMPLAINT_SLA]: "complaint_sla",
  };
  const trigger = triggerMap[alert.kind];
  if (!trigger) return;
  const ruleFilter: Record<string, unknown> = { trigger, enabled: true };
  if (alert.companyId) ruleFilter.companyId = alert.companyId;
  if (alert.branchId) ruleFilter.branchId = alert.branchId;
  const rules = await AutomationRule.find(ruleFilter).lean();
  for (const rule of rules) {
    for (const channel of rule.channels) {
      if (channel !== OutboundChannel.WHATSAPP && channel !== OutboundChannel.SMS) continue;
      await communicationService.queueAutomatedAlert(alert, channel as OutboundChannel, rule._id.toString());
    }
    await AutomationRule.updateOne({ _id: rule._id }, { $set: { lastRunAt: new Date() } });
  }
}

async function upsertAlert(input: {
  companyId?: mongoose.Types.ObjectId; branchId?: mongoose.Types.ObjectId; kind: NotificationAlertKind; severity: NotificationSeverity;
  title: string; message: string; relatedType: string; relatedId: mongoose.Types.ObjectId; href: string; customerPhone?: string; dedupeKey: string;
}) {
  const alert = await NotificationAlert.findOneAndUpdate({ dedupeKey: input.dedupeKey }, { $setOnInsert: input }, { upsert: true, new: true, setDefaultsOnInsert: true });
  if (alert) await applyAutomation(alert);
  return alert;
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

const OPEN_LEAD_STATUSES = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP, LeadStatus.QUALIFIED, LeadStatus.QUOTATION_SENT];
const OPEN_COMPLAINT_STATUSES = [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS, ComplaintStatus.WAITING_CUSTOMER, ComplaintStatus.REOPENED];

export const notificationAlertService = {
  async runSweep() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [reminders, invoices, contracts, leads, complaints] = await Promise.all([
      ServiceReminder.find({ status: ServiceReminderStatus.ACTIVE, dueDate: { $lte: tomorrow } }).limit(1000),
      Invoice.find({ status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] }, balanceDue: { $gt: 0 }, dueDate: { $lt: now } }).limit(1000),
      ServiceContract.find({ status: ContractStatus.ACTIVE, endDate: { $gte: now, $lte: inThirtyDays } }).limit(1000),
      Lead.find({ status: { $in: OPEN_LEAD_STATUSES }, followUpAt: { $lte: now } }).limit(1000),
      Complaint.find({ status: { $in: OPEN_COMPLAINT_STATUSES }, slaDueAt: { $lt: now } }).limit(1000),
    ]);

    await Promise.all(reminders.map((item) => upsertAlert({
      companyId: item.companyId, branchId: item.branchId, kind: NotificationAlertKind.SERVICE_DUE,
      severity: item.dueDate < now ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
      title: item.dueDate < now ? "Service overdue" : "Service due soon",
      message: `${item.customerName} · ${item.serviceType.replace(/_/g, " ")} · due ${item.dueDate.toLocaleDateString("en-IN")}`,
      relatedType: "service-reminder", relatedId: item._id, href: "/dashboard/service-reminders", customerPhone: item.customerPhone,
      dedupeKey: `service-reminder:${item._id.toString()}:${dateKey(item.dueDate)}`,
    })));

    await Promise.all(invoices.map(async (item) => {
      if (item.status !== InvoiceStatus.OVERDUE) await Invoice.updateOne({ _id: item._id, status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] } }, { $set: { status: InvoiceStatus.OVERDUE } });
      return upsertAlert({ companyId: item.companyId, branchId: item.branchId, kind: NotificationAlertKind.INVOICE_OVERDUE, severity: NotificationSeverity.WARNING,
        title: "Invoice payment overdue", message: `${item.invoiceNumber} · ${item.customerName} · ₹${item.balanceDue.toLocaleString("en-IN")} pending`,
        relatedType: "invoice", relatedId: item._id, href: `/dashboard/invoices/${item._id.toString()}`, customerPhone: item.customerPhone,
        dedupeKey: `invoice-overdue:${item._id.toString()}:${dateKey(item.dueDate)}` });
    }));

    await Promise.all(contracts.map((item) => upsertAlert({ companyId: item.companyId, branchId: item.branchId, kind: NotificationAlertKind.AMC_RENEWAL,
      severity: item.endDate.getTime() - now.getTime() <= 7 * 86400000 ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
      title: "AMC renewal approaching", message: `${item.contractNumber} · ${item.customerName} · expires ${item.endDate.toLocaleDateString("en-IN")}`,
      relatedType: "service-contract", relatedId: item._id, href: `/dashboard/service-contracts/${item._id.toString()}`, customerPhone: item.customerPhone,
      dedupeKey: `amc-renewal:${item._id.toString()}:${dateKey(item.endDate)}` })));

    await Promise.all(leads.map((item) => upsertAlert({ companyId: item.companyId, branchId: item.branchId, kind: NotificationAlertKind.LEAD_FOLLOW_UP, severity: NotificationSeverity.WARNING,
      title: "Lead follow-up overdue", message: `${item.leadNumber} · ${item.customerName} needs follow-up`, relatedType: "lead", relatedId: item._id,
      href: `/dashboard/leads/${item._id.toString()}`, customerPhone: item.customerPhone, dedupeKey: `lead-followup:${item._id.toString()}:${item.followUpAt ? dateKey(item.followUpAt) : "none"}` })));

    await Promise.all(complaints.map((item) => upsertAlert({ companyId: item.companyId, branchId: item.branchId, kind: NotificationAlertKind.COMPLAINT_SLA,
      severity: item.priority === "critical" ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING, title: "Complaint SLA breached",
      message: `${item.complaintNumber} · ${item.customerName} · ${item.subject}`, relatedType: "complaint", relatedId: item._id,
      href: "/dashboard/complaints", customerPhone: item.customerPhone, dedupeKey: `complaint-sla:${item._id.toString()}:${dateKey(item.slaDueAt)}` })));

    return { generatedFrom: { reminders: reminders.length, invoices: invoices.length, contracts: contracts.length, leads: leads.length, complaints: complaints.length } };
  },

  async list(scope: CallerScope, input: { unread?: string; kind?: string; page: number; pageSize: number }) {
    const filter: FilterQuery<INotificationAlert> = { ...scopeFilter(scope) };
    if (input.unread === "true") filter.readAt = { $exists: false };
    if (input.unread === "false") filter.readAt = { $exists: true };
    if (input.kind) filter.kind = input.kind as NotificationAlertKind;
    const [total, unread, alerts] = await Promise.all([
      NotificationAlert.countDocuments(filter), NotificationAlert.countDocuments({ ...scopeFilter(scope), readAt: { $exists: false } }),
      NotificationAlert.find(filter).sort({ readAt: 1, severity: 1, createdAt: -1 }).skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean(),
    ]);
    return { alerts: alerts.map((a: any) => ({ ...a, _id: a._id.toString(), companyId: a.companyId?.toString(), branchId: a.branchId?.toString(), relatedId: a.relatedId?.toString(), createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), readAt: a.readAt?.toISOString() })), unread, pagination: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
  },

  async markRead(id: string, scope: CallerScope) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Notification not found");
    const item = await NotificationAlert.findOneAndUpdate({ _id: id, ...scopeFilter(scope) }, { $set: { readAt: new Date() } }, { new: true });
    if (!item) throw ApiError.notFound("Notification not found");
    return item;
  },

  async markAllRead(scope: CallerScope) {
    const result = await NotificationAlert.updateMany({ ...scopeFilter(scope), readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    return { updated: result.modifiedCount };
  },
};
