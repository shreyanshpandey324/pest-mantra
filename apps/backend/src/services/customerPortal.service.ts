import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { CustomerPortalAccess } from "../models/CustomerPortalAccess";
import { Project } from "../models/Project";
import { Quotation, QuotationStatus } from "../models/Quotation";
import { Invoice, InvoiceStatus } from "../models/Invoice";
import { ServiceContract, ContractStatus } from "../models/ServiceContract";
import { ServiceReport, ServiceReportStatus } from "../models/ServiceReport";
import { Feedback } from "../models/Feedback";
import { ServiceReminder, ServiceReminderStatus } from "../models/ServiceReminder";
import { Complaint } from "../models/Complaint";
import { Company } from "../models/Company";
import { Branch } from "../models/Branch";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { signCustomerPortalToken } from "../utils/customerPortalToken";
import { projectService } from "./project.service";
import { backfillServiceReminders } from "./serviceReminder.service";
import { CustomerPortalLoginInput, CustomerQuotationDecisionInput } from "../validators/customerPortal.validators";

interface PortalIdentity {
  accessId: string;
  companyId: string;
  branchId: string;
  customerPhone: string;
  customerName: string;
}

function oid(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function createAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  const bytes = crypto.randomBytes(12);
  for (let index = 0; index < 12; index += 1) {
    raw += alphabet[bytes[index] % alphabet.length];
  }
  return {
    raw,
    display: `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`,
    hint: raw.slice(-4),
  };
}

function portalFilter(identity: PortalIdentity) {
  return {
    companyId: oid(identity.companyId),
    branchId: oid(identity.branchId),
    customerPhone: identity.customerPhone,
  };
}

function dateOrUndefined(value?: Date | null) {
  return value ? value.toISOString() : undefined;
}

export const customerPortalService = {
  async accessForProject(projectId: string, scope: CallerScope) {
    const project = await projectService.getProjectById(projectId, scope);
    if (!project.companyId || !project.branchId) {
      throw ApiError.badRequest("This project must be linked to a company and branch before customer portal access can be enabled");
    }

    const access = await CustomerPortalAccess.findOne({
      companyId: project.companyId,
      branchId: project.branchId,
      customerPhone: project.customerPhone,
    });

    return {
      enabled: Boolean(access?.isActive && access.expiresAt.getTime() > Date.now()),
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      codeHint: access?.codeHint,
      expiresAt: access?.expiresAt,
      lastUsedAt: access?.lastUsedAt,
      createdAt: access?.createdAt,
    };
  },

  async issueAccess(projectId: string, scope: CallerScope) {
    const project = await projectService.getProjectById(projectId, scope);
    if (!project.companyId || !project.branchId) {
      throw ApiError.badRequest("This project must be linked to a company and branch before customer portal access can be enabled");
    }

    const code = createAccessCode();
    const accessCodeHash = await bcrypt.hash(code.raw, 12);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const access = await CustomerPortalAccess.findOneAndUpdate(
      {
        companyId: project.companyId,
        branchId: project.branchId,
        customerPhone: project.customerPhone,
      },
      {
        $set: {
          customerName: project.customerName,
          accessCodeHash,
          codeHint: code.hint,
          isActive: true,
          expiresAt,
          createdBy: oid(scope.userId),
        },
        $inc: { sessionVersion: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      enabled: true,
      customerName: access.customerName,
      customerPhone: access.customerPhone,
      accessCode: code.display,
      codeHint: access.codeHint,
      expiresAt: access.expiresAt,
      lastUsedAt: access.lastUsedAt,
    };
  },

  async revokeAccess(projectId: string, scope: CallerScope) {
    const project = await projectService.getProjectById(projectId, scope);
    if (!project.companyId || !project.branchId) {
      throw ApiError.badRequest("This project is not linked to a company and branch");
    }

    await CustomerPortalAccess.updateOne(
      {
        companyId: project.companyId,
        branchId: project.branchId,
        customerPhone: project.customerPhone,
      },
      { $set: { isActive: false }, $inc: { sessionVersion: 1 } },
    );

    return { enabled: false };
  },

  async login(input: CustomerPortalLoginInput) {
    const candidates = await CustomerPortalAccess.find({
      customerPhone: input.phone,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).select("+accessCodeHash companyId branchId customerName customerPhone expiresAt sessionVersion");

    const code = normalizeCode(input.accessCode);
    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.accessCodeHash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) throw ApiError.unauthorized("Phone number or customer access code is incorrect");

    matched.lastUsedAt = new Date();
    await matched.save();

    const token = signCustomerPortalToken({
      sub: matched._id.toString(),
      companyId: matched.companyId.toString(),
      branchId: matched.branchId.toString(),
      customerPhone: matched.customerPhone,
      sessionVersion: matched.sessionVersion,
    });

    return {
      token,
      expiresInSeconds: 12 * 60 * 60,
      customer: {
        name: matched.customerName,
        phone: matched.customerPhone,
      },
    };
  },

  async dashboard(identity: PortalIdentity) {
    const filter = portalFilter(identity);
    await backfillServiceReminders(filter);
    const [company, branch, projects, quotations, invoices, contracts, reports, reminders, complaints] = await Promise.all([
      Company.findById(identity.companyId).select("name"),
      Branch.findById(identity.branchId).select("name"),
      Project.find(filter)
        .select("projectCode customerName address serviceType status assignedTechnicianId scheduledDate scheduledTimeSlot completedAt createdAt")
        .populate("assignedTechnicianId", "name")
        .sort({ createdAt: -1 })
        .limit(100),
      Quotation.find({ ...filter, status: { $ne: QuotationStatus.DRAFT } })
        .select("quotationNumber serviceType status items subtotal discount taxRate taxAmount additionalCharges grandTotal validUntil sentAt acceptedAt rejectedAt convertedProjectId createdAt")
        .sort({ createdAt: -1 })
        .limit(100),
      Invoice.find({ ...filter, status: { $ne: InvoiceStatus.DRAFT } })
        .select("invoiceNumber projectId quotationId serviceType items grandTotal amountPaid balanceDue dueDate status issuedAt paidAt payments createdAt")
        .sort({ createdAt: -1 })
        .limit(100),
      ServiceContract.find(filter)
        .select("contractNumber serviceType frequency startDate endDate contractValue includedVisits status visits terms createdAt")
        .sort({ createdAt: -1 })
        .limit(100),
      ServiceReport.find({ ...filter, status: ServiceReportStatus.FINALIZED })
        .select("projectId projectCode reportNumber verificationCode serviceType technicianName companyName branchName completedAt finalizedAt createdAt")
        .sort({ finalizedAt: -1, createdAt: -1 })
        .limit(100),
      ServiceReminder.find({ ...filter, status: ServiceReminderStatus.ACTIVE })
        .select("sourceProjectId nextProjectId serviceType dueDate customerReadAt notes createdAt")
        .sort({ dueDate: 1 })
        .limit(100),
      Complaint.find(filter)
        .select("complaintNumber projectId subject category priority status slaDueAt resolution createdAt updatedAt")
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

    const reportIds = reports.map((report) => report._id);
    const feedbackRows = reportIds.length
      ? await Feedback.find({ serviceReportId: { $in: reportIds } }).select("serviceReportId rating submittedAt")
      : [];
    const feedbackMap = new Map(feedbackRows.map((item) => [item.serviceReportId.toString(), item]));

    const now = Date.now();
    const projectRows = projects.map((project) => {
      const technician = project.assignedTechnicianId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | undefined;
      return {
        id: project._id.toString(),
        projectCode: project.projectCode,
        address: project.address,
        serviceType: project.serviceType,
        status: project.status,
        scheduledDate: dateOrUndefined(project.scheduledDate),
        scheduledTimeSlot: project.scheduledTimeSlot,
        completedAt: dateOrUndefined(project.completedAt),
        technicianName: technician?.name,
        createdAt: project.createdAt.toISOString(),
      };
    });

    const quotationRows = quotations.map((quotation) => ({
      id: quotation._id.toString(),
      quotationNumber: quotation.quotationNumber,
      serviceType: quotation.serviceType,
      status: quotation.status,
      isExpired: quotation.status === QuotationStatus.SENT && quotation.validUntil.getTime() < now,
      items: quotation.items.map((item) => ({ description: item.description, quantity: item.quantity, rate: item.rate, amount: item.amount })),
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      additionalCharges: quotation.additionalCharges,
      grandTotal: quotation.grandTotal,
      validUntil: quotation.validUntil.toISOString(),
      convertedProjectId: quotation.convertedProjectId?.toString(),
      createdAt: quotation.createdAt.toISOString(),
    }));

    const invoiceRows = invoices.map((invoice) => {
      let displayStatus = invoice.status;
      if (
        displayStatus !== InvoiceStatus.DRAFT &&
        displayStatus !== InvoiceStatus.PAID &&
        displayStatus !== InvoiceStatus.VOID &&
        invoice.balanceDue > 0 &&
        invoice.dueDate.getTime() < now
      ) {
        displayStatus = InvoiceStatus.OVERDUE;
      }
      return {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        projectId: invoice.projectId.toString(),
        quotationId: invoice.quotationId?.toString(),
        serviceType: invoice.serviceType,
        items: invoice.items.map((item) => ({ description: item.description, quantity: item.quantity, rate: item.rate, amount: item.amount })),
        grandTotal: invoice.grandTotal,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        dueDate: invoice.dueDate.toISOString(),
        status: displayStatus,
        issuedAt: dateOrUndefined(invoice.issuedAt),
        paidAt: dateOrUndefined(invoice.paidAt),
        payments: invoice.payments.map((payment) => ({ amount: payment.amount, method: payment.method, paidAt: payment.paidAt.toISOString() })),
        createdAt: invoice.createdAt.toISOString(),
      };
    });

    const contractRows = contracts.map((contract) => {
      const displayStatus =
        contract.status === ContractStatus.ACTIVE && contract.endDate.getTime() < now
          ? ContractStatus.EXPIRED
          : contract.status;
      const visits = contract.visits.map((visit) => ({
        id: visit._id?.toString(),
        dueDate: visit.dueDate.toISOString(),
        status: visit.status,
        projectId: visit.projectId?.toString(),
        completedAt: dateOrUndefined(visit.completedAt),
      }));
      const upcoming = visits
        .filter((visit) => new Date(visit.dueDate).getTime() >= now && visit.status === "upcoming")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      return {
        id: contract._id.toString(),
        contractNumber: contract.contractNumber,
        serviceType: contract.serviceType,
        frequency: contract.frequency,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        contractValue: contract.contractValue,
        includedVisits: contract.includedVisits,
        status: displayStatus,
        visits,
        nextVisitDate: upcoming[0]?.dueDate,
        terms: contract.terms,
        createdAt: contract.createdAt.toISOString(),
      };
    });

    const reportRows = reports.map((report) => {
      const feedback = feedbackMap.get(report._id.toString());
      return {
        id: report._id.toString(),
        projectId: report.projectId.toString(),
        projectCode: report.projectCode,
        reportNumber: report.reportNumber,
        verificationCode: report.verificationCode,
        serviceType: report.serviceType,
        technicianName: report.technicianName,
        completedAt: dateOrUndefined(report.completedAt ?? report.finalizedAt),
        feedbackSubmitted: Boolean(feedback),
        feedbackRating: feedback?.rating,
      };
    });

    const reminderRows = reminders.map((reminder) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const due = new Date(reminder.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((due.getTime() - start.getTime()) / 86400000);
      const timing = daysUntil < 0 ? "overdue" : daysUntil === 0 ? "due_today" : daysUntil <= 2 ? "due_soon" : daysUntil <= 7 ? "upcoming" : "scheduled";
      return {
        id: reminder._id.toString(),
        sourceProjectId: reminder.sourceProjectId.toString(),
        nextProjectId: reminder.nextProjectId?.toString(),
        serviceType: reminder.serviceType,
        dueDate: reminder.dueDate.toISOString(),
        customerReadAt: dateOrUndefined(reminder.customerReadAt),
        notes: reminder.notes,
        timing,
        daysUntil,
        createdAt: reminder.createdAt.toISOString(),
      };
    });

    const activeJobs = projectRows.filter((row) => !["completed", "cancelled"].includes(row.status)).length;
    const outstanding = invoiceRows.reduce((sum, row) => sum + Math.max(0, row.balanceDue), 0);
    const nextVisit = contractRows
      .flatMap((contract) => (contract.nextVisitDate ? [{ contractNumber: contract.contractNumber, serviceType: contract.serviceType, dueDate: contract.nextVisitDate }] : []))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    const nextServiceReminder = reminderRows
      .filter((item) => item.daysUntil >= 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

    const addresses = [...new Set(projects.map((project) => project.address).filter(Boolean))];

    return {
      customer: {
        name: identity.customerName,
        phone: identity.customerPhone,
        companyName: company?.name ?? "Pest Mantra",
        branchName: branch?.name,
        addresses,
      },
      metrics: {
        activeJobs,
        totalJobs: projectRows.length,
        outstandingAmount: Number(outstanding.toFixed(2)),
        activeContracts: contractRows.filter((row) => row.status === ContractStatus.ACTIVE).length,
        serviceReports: reportRows.length,
        nextVisit,
        nextServiceReminder: nextServiceReminder ? { serviceType: nextServiceReminder.serviceType, dueDate: nextServiceReminder.dueDate, timing: nextServiceReminder.timing } : undefined,
        unreadServiceReminders: reminderRows.filter((item) => !item.customerReadAt).length,
      },
      projects: projectRows,
      quotations: quotationRows,
      invoices: invoiceRows,
      contracts: contractRows,
      reports: reportRows,
      reminders: reminderRows,
      complaints: complaints.map((item) => ({
        id: item._id.toString(),
        complaintNumber: item.complaintNumber,
        projectId: item.projectId?.toString(),
        subject: item.subject,
        category: item.category,
        priority: item.priority,
        status: item.status,
        slaDueAt: item.slaDueAt.toISOString(),
        resolution: item.resolution,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  },

  async markReminderRead(reminderId: string, identity: PortalIdentity) {
    const reminder = await ServiceReminder.findOneAndUpdate(
      {
        _id: oid(reminderId, "Invalid reminder id"),
        ...portalFilter(identity),
        status: ServiceReminderStatus.ACTIVE,
      },
      { $set: { customerReadAt: new Date() } },
      { new: true },
    );
    if (!reminder) throw ApiError.notFound("Service reminder not found");
    return { id: reminder._id.toString(), customerReadAt: reminder.customerReadAt?.toISOString() };
  },

  async quotationDecision(quotationId: string, input: CustomerQuotationDecisionInput, identity: PortalIdentity) {
    const quotation = await Quotation.findOne({
      _id: oid(quotationId, "Invalid quotation id"),
      ...portalFilter(identity),
    });
    if (!quotation) throw ApiError.notFound("Quotation not found");
    if (quotation.status !== QuotationStatus.SENT) {
      throw ApiError.badRequest("Only a sent quotation can be accepted or rejected");
    }
    if (quotation.validUntil.getTime() < Date.now()) {
      throw ApiError.badRequest("This quotation has expired. Please contact Pest Mantra for a revised quotation");
    }

    quotation.status = input.decision === "accepted" ? QuotationStatus.ACCEPTED : QuotationStatus.REJECTED;
    if (quotation.status === QuotationStatus.ACCEPTED) quotation.acceptedAt = new Date();
    if (quotation.status === QuotationStatus.REJECTED) quotation.rejectedAt = new Date();
    await quotation.save();

    return {
      id: quotation._id.toString(),
      quotationNumber: quotation.quotationNumber,
      status: quotation.status,
      acceptedAt: dateOrUndefined(quotation.acceptedAt),
      rejectedAt: dateOrUndefined(quotation.rejectedAt),
    };
  },
};
