import mongoose, { FilterQuery } from "mongoose";
import { Invoice, IInvoice, InvoiceStatus } from "../models/Invoice";
import { Quotation } from "../models/Quotation";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { projectService } from "./project.service";
import { CreateInvoiceInput, UpdateInvoiceInput, AddPaymentInput } from "../validators/invoice.validators";

function oid(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function tenant(scope: CallerScope): FilterQuery<IInvoice> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: oid(scope.companyId), branchId: oid(scope.branchId) };
}

function calculate(input: { items: { description: string; quantity: number; rate: number }[]; discount?: number; taxRate?: number; additionalCharges?: number }) {
  const items = input.items.map((x) => ({ ...x, amount: Number((x.quantity * x.rate).toFixed(2)) }));
  const subtotal = Number(items.reduce((s, x) => s + x.amount, 0).toFixed(2));
  const discount = Math.min(input.discount ?? 0, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = input.taxRate ?? 0;
  const taxAmount = Number((taxable * taxRate / 100).toFixed(2));
  const additionalCharges = input.additionalCharges ?? 0;
  const grandTotal = Number((taxable + taxAmount + additionalCharges).toFixed(2));
  return { items, subtotal, discount, taxRate, taxAmount, additionalCharges, grandTotal };
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  for (let i = 0; i < 20; i++) {
    const count = await Invoice.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
    const number = `PM-I-${year}-${String(count + 1 + i).padStart(5, "0")}`;
    if (!(await Invoice.exists({ invoiceNumber: number }))) return number;
  }
  throw ApiError.internal("Could not generate invoice number");
}

function refreshStatus(invoice: IInvoice) {
  if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.PAID) return;
  if (invoice.balanceDue <= 0) {
    invoice.status = InvoiceStatus.PAID;
    if (!invoice.paidAt) invoice.paidAt = new Date();
  } else if (invoice.dueDate.getTime() < Date.now()) {
    invoice.status = InvoiceStatus.OVERDUE;
  } else if (invoice.amountPaid > 0) {
    invoice.status = InvoiceStatus.PARTIALLY_PAID;
  } else {
    invoice.status = InvoiceStatus.ISSUED;
  }
}

async function visible(id: string, scope: CallerScope) {
  const invoice = await Invoice.findOne({ _id: oid(id), ...tenant(scope) });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  refreshStatus(invoice);
  if (invoice.isModified("status") || invoice.isModified("paidAt")) await invoice.save();
  return invoice;
}

export const invoiceService = {
  async list(scope: CallerScope, query: { status?: InvoiceStatus; search?: string }) {
    const filter: any = { ...tenant(scope) };
    if (query.status === InvoiceStatus.OVERDUE) {
      filter.dueDate = { $lt: new Date() };
      filter.balanceDue = { $gt: 0 };
      filter.status = { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] };
    } else if (query.status === InvoiceStatus.ISSUED) {
      filter.status = InvoiceStatus.ISSUED;
      filter.dueDate = { $gte: new Date() };
    } else if (query.status === InvoiceStatus.PARTIALLY_PAID) {
      filter.status = InvoiceStatus.PARTIALLY_PAID;
      filter.dueDate = { $gte: new Date() };
    } else if (query.status) {
      filter.status = query.status;
    }
    if (query.search) filter.$or = [
      { invoiceNumber: { $regex: query.search, $options: "i" } },
      { customerName: { $regex: query.search, $options: "i" } },
      { customerPhone: { $regex: query.search, $options: "i" } },
    ];
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    await Promise.all(invoices.map(async (invoice) => {
      const before = invoice.status;
      refreshStatus(invoice);
      if (invoice.status !== before) await invoice.save();
    }));
    return invoices;
  },

  async get(id: string, scope: CallerScope) {
    return visible(id, scope);
  },

  async create(input: CreateInvoiceInput, scope: CallerScope) {
    const project = await projectService.getProjectById(input.projectId, scope);
    if (await Invoice.exists({ projectId: project._id })) throw ApiError.conflict("An invoice already exists for this project");

    const quotation = await Quotation.findOne({ convertedProjectId: project._id });
    const sourceItems = input.items?.length ? input.items : quotation?.items?.map((x) => ({ description: x.description, quantity: x.quantity, rate: x.rate }));
    if (!sourceItems?.length) throw ApiError.badRequest("Add at least one invoice line item");

    const totals = calculate({
      items: sourceItems,
      discount: input.discount ?? quotation?.discount ?? 0,
      taxRate: input.taxRate ?? quotation?.taxRate ?? 0,
      additionalCharges: input.additionalCharges ?? quotation?.additionalCharges ?? 0,
    });
    const dueDate = new Date(input.dueDate);
    if (dueDate.getTime() < new Date().setHours(0, 0, 0, 0)) throw ApiError.badRequest("Due date cannot be in the past");

    return Invoice.create({
      companyId: project.companyId,
      branchId: project.branchId,
      invoiceNumber: await generateInvoiceNumber(),
      projectId: project._id,
      quotationId: quotation?._id,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerEmail: quotation?.customerEmail,
      customerCompany: quotation?.customerCompany,
      address: project.address,
      city: quotation?.city,
      serviceType: project.serviceType,
      ...totals,
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      dueDate,
      status: InvoiceStatus.DRAFT,
      notes: input.notes,
      terms: input.terms ?? quotation?.terms,
      createdBy: oid(scope.userId),
    });
  },

  async update(id: string, input: UpdateInvoiceInput, scope: CallerScope) {
    const invoice = await visible(id, scope);
    if (invoice.status !== InvoiceStatus.DRAFT) throw ApiError.badRequest("Only draft invoices can be edited");
    let totals: ReturnType<typeof calculate> | undefined;
    if (input.items) {
      totals = calculate({
        items: input.items,
        discount: input.discount ?? invoice.discount,
        taxRate: input.taxRate ?? invoice.taxRate,
        additionalCharges: input.additionalCharges ?? invoice.additionalCharges,
      });
    } else if (input.discount !== undefined || input.taxRate !== undefined || input.additionalCharges !== undefined) {
      totals = calculate({
        items: invoice.items.map((x) => ({ description: x.description, quantity: x.quantity, rate: x.rate })),
        discount: input.discount ?? invoice.discount,
        taxRate: input.taxRate ?? invoice.taxRate,
        additionalCharges: input.additionalCharges ?? invoice.additionalCharges,
      });
    }
    Object.assign(invoice, input, totals, input.dueDate ? { dueDate: new Date(input.dueDate) } : {});
    if (totals) invoice.balanceDue = totals.grandTotal - invoice.amountPaid;
    await invoice.save();
    return invoice;
  },

  async changeStatus(id: string, status: InvoiceStatus.ISSUED | InvoiceStatus.VOID, scope: CallerScope) {
    const invoice = await visible(id, scope);
    if (status === InvoiceStatus.ISSUED) {
      if (invoice.status !== InvoiceStatus.DRAFT) throw ApiError.badRequest("Only draft invoices can be issued");
      invoice.status = InvoiceStatus.ISSUED;
      invoice.issuedAt = new Date();
    } else {
      if (invoice.status === InvoiceStatus.PAID || invoice.amountPaid > 0) throw ApiError.badRequest("Paid invoices cannot be voided");
      invoice.status = InvoiceStatus.VOID;
      invoice.voidedAt = new Date();
    }
    await invoice.save();
    return invoice;
  },

  async addPayment(id: string, input: AddPaymentInput, scope: CallerScope) {
    const invoice = await visible(id, scope);
    if ([InvoiceStatus.DRAFT, InvoiceStatus.VOID].includes(invoice.status)) throw ApiError.badRequest("Issue the invoice before recording payment");
    if (invoice.balanceDue <= 0) throw ApiError.badRequest("Invoice is already fully paid");
    if (input.amount > invoice.balanceDue + 0.001) throw ApiError.badRequest("Payment cannot exceed the outstanding balance");

    invoice.payments.push({
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      recordedBy: oid(scope.userId),
    } as any);
    invoice.amountPaid = Number((invoice.amountPaid + input.amount).toFixed(2));
    invoice.balanceDue = Number(Math.max(0, invoice.grandTotal - invoice.amountPaid).toFixed(2));
    refreshStatus(invoice);
    await invoice.save();
    return invoice;
  },

  async remove(id: string, scope: CallerScope) {
    const invoice = await visible(id, scope);
    if (invoice.status !== InvoiceStatus.DRAFT) throw ApiError.badRequest("Only draft invoices can be deleted");
    await invoice.deleteOne();
  },
};
