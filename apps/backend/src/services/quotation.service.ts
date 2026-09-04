import mongoose, { FilterQuery } from "mongoose";
import { Branch } from "../models/Branch";
import { Lead, LeadActivityType, LeadStatus } from "../models/Lead";
import { Project, ProjectStatus } from "../models/Project";
import { ProjectStatusHistory } from "../models/ProjectStatusHistory";
import { IQuotation, Quotation, QuotationStatus } from "../models/Quotation";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { CreateQuotationInput, UpdateQuotationInput } from "../validators/quotation.validators";

function oid(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function tenant(scope: CallerScope): FilterQuery<IQuotation> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: oid(scope.companyId), branchId: oid(scope.branchId) };
}

async function resolveOwnership(input: { companyId?: string; branchId?: string }, scope: CallerScope) {
  let companyId = scope.companyId ? oid(scope.companyId) : undefined;
  let branchId = scope.branchId ? oid(scope.branchId) : undefined;
  if (scope.role === UserRole.SUPER_ADMIN) {
    companyId = input.companyId ? oid(input.companyId, "Invalid company id") : companyId;
    branchId = input.branchId ? oid(input.branchId, "Invalid branch id") : branchId;
  }
  if (companyId && branchId) {
    const branch = await Branch.findOne({ _id: branchId, companyId, isActive: true });
    if (!branch) throw ApiError.badRequest("Branch is inactive or outside the selected company");
  }
  return { companyId, branchId };
}

function totals(input: {
  items: { description: string; quantity: number; rate: number }[];
  discount?: number;
  taxRate?: number;
  additionalCharges?: number;
}) {
  const items = input.items.map((item) => ({ ...item, amount: Number((item.quantity * item.rate).toFixed(2)) }));
  const subtotal = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const discount = Math.min(input.discount ?? 0, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = input.taxRate ?? 0;
  const taxAmount = Number(((taxable * taxRate) / 100).toFixed(2));
  const additionalCharges = input.additionalCharges ?? 0;
  return {
    items,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    additionalCharges,
    grandTotal: Number((taxable + taxAmount + additionalCharges).toFixed(2)),
  };
}

async function quotationNumber() {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = await Quotation.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } }) + 1 + attempt;
    const value = `PM-Q-${year}-${String(next).padStart(5, "0")}`;
    if (!(await Quotation.exists({ quotationNumber: value }))) return value;
  }
  throw ApiError.internal("Could not generate quotation number");
}

async function visible(id: string, scope: CallerScope) {
  const quotation = await Quotation.findOne({ _id: oid(id), ...tenant(scope) });
  if (!quotation) throw ApiError.notFound("Quotation not found");
  return quotation;
}

async function leadForQuotation(
  leadId: string,
  ownership: { companyId?: mongoose.Types.ObjectId; branchId?: mongoose.Types.ObjectId },
  scope: CallerScope,
) {
  const lead = await Lead.findOne({ _id: oid(leadId, "Invalid lead id"), ...(tenant(scope) as Record<string, unknown>) });
  if (!lead) throw ApiError.notFound("Lead not found");
  if (!ownership.companyId || !ownership.branchId) throw ApiError.badRequest("Quotation company and branch are required for a lead");
  if (lead.companyId.toString() !== ownership.companyId.toString() || lead.branchId.toString() !== ownership.branchId.toString()) {
    throw ApiError.badRequest("Quotation company/branch must match the lead");
  }
  if (lead.quotationId) throw ApiError.conflict("This lead already has a quotation");
  if ([LeadStatus.WON, LeadStatus.LOST].includes(lead.status)) throw ApiError.badRequest("Closed leads cannot create a new quotation");
  return lead;
}

async function syncLeadStatus(quotation: IQuotation, status: QuotationStatus, actorId: string) {
  if (!quotation.leadId) return;
  const lead = await Lead.findById(quotation.leadId);
  if (!lead) return;

  let nextStatus: LeadStatus | undefined;
  let note = "";
  if (status === QuotationStatus.SENT) {
    nextStatus = LeadStatus.QUOTATION_SENT;
    note = `Quotation ${quotation.quotationNumber} sent to customer`;
  } else if (status === QuotationStatus.ACCEPTED) {
    nextStatus = LeadStatus.WON;
    note = `Quotation ${quotation.quotationNumber} accepted — lead won`;
  } else if (status === QuotationStatus.REJECTED) {
    nextStatus = LeadStatus.LOST;
    note = `Quotation ${quotation.quotationNumber} rejected — lead lost`;
  }
  if (!nextStatus) return;

  const previous = lead.status;
  lead.status = nextStatus;
  if (nextStatus === LeadStatus.WON) {
    lead.wonAt = new Date();
    lead.lostAt = undefined;
    lead.lostReason = undefined;
  }
  if (nextStatus === LeadStatus.LOST) {
    lead.lostAt = new Date();
    lead.wonAt = undefined;
    lead.lostReason = "Quotation rejected";
  }
  lead.activities.push({
    type: LeadActivityType.QUOTATION,
    note,
    actorId: oid(actorId),
    fromStatus: previous,
    toStatus: nextStatus,
    createdAt: new Date(),
  });
  await lead.save();
}

export const quotationService = {
  async list(scope: CallerScope, query: { status?: QuotationStatus; search?: string }) {
    const filter: FilterQuery<IQuotation> = { ...tenant(scope) };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { quotationNumber: { $regex: query.search, $options: "i" } },
        { customerName: { $regex: query.search, $options: "i" } },
        { customerPhone: { $regex: query.search, $options: "i" } },
      ];
    }
    return Quotation.find(filter).sort({ createdAt: -1 });
  },

  async get(id: string, scope: CallerScope) {
    return visible(id, scope);
  },

  async create(input: CreateQuotationInput, scope: CallerScope) {
    if (new Date(input.validUntil).getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw ApiError.badRequest("Validity date cannot be in the past");
    }
    const ownership = await resolveOwnership(input, scope);
    const lead = input.leadId ? await leadForQuotation(input.leadId, ownership, scope) : undefined;
    const calculated = totals(input);
    const quotation = await Quotation.create({
      ...input,
      ...ownership,
      ...calculated,
      customerEmail: input.customerEmail || undefined,
      quotationNumber: await quotationNumber(),
      validUntil: new Date(input.validUntil),
      createdBy: oid(scope.userId),
      status: QuotationStatus.DRAFT,
      leadId: lead?._id,
    });

    if (lead) {
      const linked = await Lead.findOneAndUpdate(
        { _id: lead._id, quotationId: { $exists: false } },
        {
          $set: { quotationId: quotation._id },
          $push: {
            activities: {
              type: LeadActivityType.QUOTATION,
              note: `Draft quotation ${quotation.quotationNumber} created`,
              actorId: oid(scope.userId),
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      );
      if (!linked) {
        await quotation.deleteOne();
        throw ApiError.conflict("Another quotation was linked to this lead. Please refresh.");
      }
    }
    return quotation;
  },

  async update(id: string, input: UpdateQuotationInput, scope: CallerScope) {
    const quotation = await visible(id, scope);
    if ([QuotationStatus.ACCEPTED, QuotationStatus.REJECTED].includes(quotation.status)) {
      throw ApiError.badRequest("Accepted or rejected quotations cannot be edited");
    }
    let calculated: Partial<IQuotation> = {};
    if (input.items) {
      calculated = totals({
        items: input.items,
        discount: input.discount ?? quotation.discount,
        taxRate: input.taxRate ?? quotation.taxRate,
        additionalCharges: input.additionalCharges ?? quotation.additionalCharges,
      });
    }
    const { leadId: _ignoreLeadId, ...editable } = input;
    Object.assign(quotation, editable, calculated, input.validUntil ? { validUntil: new Date(input.validUntil) } : {});
    await quotation.save();
    return quotation;
  },

  async status(id: string, status: QuotationStatus, scope: CallerScope) {
    const quotation = await visible(id, scope);
    const allowed: Record<QuotationStatus, QuotationStatus[]> = {
      [QuotationStatus.DRAFT]: [QuotationStatus.SENT],
      [QuotationStatus.SENT]: [QuotationStatus.ACCEPTED, QuotationStatus.REJECTED],
      [QuotationStatus.ACCEPTED]: [],
      [QuotationStatus.REJECTED]: [],
    };
    if (!allowed[quotation.status].includes(status)) {
      throw ApiError.badRequest(`Cannot change quotation from ${quotation.status} to ${status}`);
    }
    quotation.status = status;
    if (status === QuotationStatus.SENT) quotation.sentAt = new Date();
    if (status === QuotationStatus.ACCEPTED) quotation.acceptedAt = new Date();
    if (status === QuotationStatus.REJECTED) quotation.rejectedAt = new Date();
    await quotation.save();
    await syncLeadStatus(quotation, status, scope.userId);
    return quotation;
  },

  async remove(id: string, scope: CallerScope) {
    const quotation = await visible(id, scope);
    if (quotation.status !== QuotationStatus.DRAFT) throw ApiError.badRequest("Only draft quotations can be deleted");
    if (quotation.leadId) {
      await Lead.updateOne(
        { _id: quotation.leadId, quotationId: quotation._id },
        {
          $unset: { quotationId: 1 },
          $push: {
            activities: {
              type: LeadActivityType.QUOTATION,
              note: `Draft quotation ${quotation.quotationNumber} deleted`,
              actorId: oid(scope.userId),
              createdAt: new Date(),
            },
          },
        },
      );
    }
    await quotation.deleteOne();
  },

  async convert(id: string, scope: CallerScope) {
    const quotation = await visible(id, scope);
    if (quotation.status !== QuotationStatus.ACCEPTED) throw ApiError.badRequest("Only accepted quotations can be converted to a project");
    if (quotation.convertedProjectId) throw ApiError.conflict("Quotation has already been converted to a project");
    const year = new Date().getFullYear();
    let projectCode = "";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const next = await Project.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } }) + 1 + attempt;
      projectCode = `PM-${year}-${String(next).padStart(6, "0")}`;
      if (!(await Project.exists({ projectCode }))) break;
    }
    const project = await Project.create({
      companyId: quotation.companyId,
      branchId: quotation.branchId,
      projectCode,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      address: quotation.address,
      serviceType: quotation.serviceType,
      status: ProjectStatus.NEW,
      createdBy: oid(scope.userId),
      notes: [quotation.treatmentDescription, `Converted from quotation ${quotation.quotationNumber}`].filter(Boolean).join("\n"),
    });
    await ProjectStatusHistory.create({
      companyId: quotation.companyId,
      projectId: project._id,
      fromStatus: null,
      toStatus: ProjectStatus.NEW,
      changedBy: oid(scope.userId),
      remarks: `Created from quotation ${quotation.quotationNumber}`,
    });
    quotation.convertedProjectId = project._id;
    quotation.convertedAt = new Date();
    await quotation.save();
    return { quotation, project };
  },
};
