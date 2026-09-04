import fs from "fs/promises";
import path from "path";
import mongoose, { FilterQuery } from "mongoose";
import { Expense, ExpenseCategory, ExpenseStatus, IExpense } from "../models/Expense";
import { Invoice, InvoiceStatus } from "../models/Invoice";
import { Project } from "../models/Project";
import { User, UserRole } from "../models/User";
import { Branch } from "../models/Branch";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { CreateExpenseInput, UpdateExpenseInput, CreateExpenseClaimInput, UpdateExpenseClaimInput } from "../validators/expense.validators";
import { projectService } from "./project.service";
import { UPLOAD_DIR } from "../middleware/upload.middleware";

function oid(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function safeReceiptPath(filePath: string): string {
  const root = path.resolve(UPLOAD_DIR);
  const target = path.resolve(filePath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw ApiError.forbidden("Invalid receipt file path");
  }
  return target;
}

async function removeReceiptFile(filePath: string | undefined): Promise<void> {
  if (!filePath) return;
  try {
    await fs.unlink(safeReceiptPath(filePath));
  } catch {
    // A missing/invalid old file must not roll back a successful database
    // update or tempt the service into deleting anything outside UPLOAD_DIR.
  }
}

function sanitizeExpense(expense: IExpense) {
  const plain = expense.toObject() as Record<string, unknown>;
  delete plain.receiptStoragePath;
  return plain;
}

function tenant(scope: CallerScope): FilterQuery<IExpense> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  return { companyId: oid(scope.companyId), branchId: oid(scope.branchId) };
}

function range(from?: string, to?: string) {
  const result: { $gte?: Date; $lte?: Date } = {};
  if (from) { const d = new Date(from); d.setHours(0, 0, 0, 0); result.$gte = d; }
  if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); result.$lte = d; }
  return Object.keys(result).length ? result : undefined;
}

async function generateExpenseNumber() {
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  for (let i = 0; i < 20; i++) {
    const count = await Expense.countDocuments({ createdAt: { $gte: start } });
    const number = `PM-E-${year}-${String(count + 1 + i).padStart(5, "0")}`;
    if (!(await Expense.exists({ expenseNumber: number }))) return number;
  }
  throw ApiError.internal("Could not generate expense number");
}

async function visible(id: string, scope: CallerScope, includeStorage = false) {
  const filter = { _id: oid(id), ...tenant(scope) };
  const expense = includeStorage
    ? await Expense.findOne(filter).select("+receiptStoragePath")
    : await Expense.findOne(filter);
  if (!expense) throw ApiError.notFound("Expense not found");
  return expense;
}


async function claimVisible(id: string, scope: CallerScope, includeStorage = false) {
  if (scope.role !== UserRole.TECHNICIAN) throw ApiError.forbidden("Technician access required");
  const filter: FilterQuery<IExpense> = { _id: oid(id), technicianId: oid(scope.userId) };
  if (scope.companyId) filter.companyId = oid(scope.companyId);
  if (scope.branchId) filter.branchId = oid(scope.branchId);
  const expense = includeStorage
    ? await Expense.findOne(filter).select("+receiptStoragePath")
    : await Expense.findOne(filter);
  if (!expense) throw ApiError.notFound("Expense claim not found");
  return expense;
}

async function validateTechnician(technicianId: string | undefined, scope: CallerScope) {
  if (!technicianId) return undefined;
  const tech = await User.findOne({ _id: oid(technicianId, "Invalid technician id"), role: UserRole.TECHNICIAN, isActive: true }).select("_id companyId branchId");
  if (!tech) throw ApiError.badRequest("Technician not found or inactive");
  if (scope.role !== UserRole.SUPER_ADMIN && (tech.companyId?.toString() !== scope.companyId || tech.branchId?.toString() !== scope.branchId)) {
    throw ApiError.badRequest("Technician is outside your company or branch");
  }
  return tech._id;
}

async function scopeFromProject(projectId: string | undefined, scope: CallerScope) {
  if (!projectId) {
    return {
      projectId: undefined,
      companyId: scope.companyId ? oid(scope.companyId) : undefined,
      branchId: scope.branchId ? oid(scope.branchId) : undefined,
    };
  }
  const project = await projectService.getProjectById(projectId, scope);
  return { projectId: project._id, companyId: project.companyId, branchId: project.branchId };
}

function parseExpenseInput(input: CreateExpenseInput | UpdateExpenseInput) {
  return {
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.expenseDate !== undefined ? { expenseDate: new Date(input.expenseDate) } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.vendor !== undefined ? { vendor: input.vendor || undefined } : {}),
    ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
    ...(input.paymentReference !== undefined ? { paymentReference: input.paymentReference || undefined } : {}),
    ...(input.notes !== undefined ? { notes: input.notes || undefined } : {}),
  };
}

export const expenseService = {
  async listClaims(scope: CallerScope) {
    if (scope.role !== UserRole.TECHNICIAN) throw ApiError.forbidden("Technician access required");
    const filter: any = { technicianId: oid(scope.userId) };
    if (scope.companyId) filter.companyId = oid(scope.companyId);
    if (scope.branchId) filter.branchId = oid(scope.branchId);
    return Expense.find(filter)
      .populate("projectId", "projectCode customerName serviceType")
      .sort({ expenseDate: -1, createdAt: -1 });
  },

  async createClaim(input: CreateExpenseClaimInput, scope: CallerScope) {
    if (scope.role !== UserRole.TECHNICIAN) throw ApiError.forbidden("Technician access required");
    const projectScope = await scopeFromProject(input.projectId, scope);
    return Expense.create({
      ...parseExpenseInput(input),
      expenseNumber: await generateExpenseNumber(),
      projectId: projectScope.projectId,
      companyId: projectScope.companyId,
      branchId: projectScope.branchId,
      technicianId: oid(scope.userId),
      status: ExpenseStatus.PENDING,
      createdBy: oid(scope.userId),
    });
  },

  async updateClaim(id: string, input: UpdateExpenseClaimInput, scope: CallerScope) {
    const expense = await claimVisible(id, scope);
    if (expense.status !== ExpenseStatus.PENDING) throw ApiError.badRequest("Only pending claims can be edited");
    Object.assign(expense, parseExpenseInput(input));
    if (input.projectId !== undefined) {
      const projectScope = await scopeFromProject(input.projectId || undefined, scope);
      expense.projectId = projectScope.projectId;
      expense.companyId = projectScope.companyId;
      expense.branchId = projectScope.branchId;
    }
    await expense.save();
    return expense;
  },

  async attachClaimReceipt(id: string, file: Express.Multer.File, scope: CallerScope) {
    const expense = await claimVisible(id, scope, true);
    const previousPath = expense.receiptStoragePath;
    const nextPath = safeReceiptPath(file.path);
    expense.receiptStoragePath = nextPath;
    expense.receiptOriginalName = file.originalname;
    expense.receiptMimeType = file.mimetype;
    await expense.save();
    if (previousPath !== nextPath) await removeReceiptFile(previousPath);
    return sanitizeExpense(expense);
  },

  async claimReceiptPath(id: string, scope: CallerScope) {
    const expense = await claimVisible(id, scope, true);
    if (!expense.receiptStoragePath) throw ApiError.notFound("Receipt not found");
    const target = safeReceiptPath(expense.receiptStoragePath);
    try { await fs.access(target); } catch { throw ApiError.notFound("Receipt file not found"); }
    return target;
  },

  async removeClaim(id: string, scope: CallerScope) {
    const expense = await claimVisible(id, scope, true);
    if (expense.status !== ExpenseStatus.PENDING && expense.status !== ExpenseStatus.REJECTED) throw ApiError.badRequest("Only pending or rejected claims can be deleted");
    const receiptPath = expense.receiptStoragePath;
    await expense.deleteOne();
    await removeReceiptFile(receiptPath);
  },
  async list(scope: CallerScope, query: { status?: ExpenseStatus; category?: ExpenseCategory; projectId?: string; search?: string; from?: string; to?: string }) {
    const filter: any = { ...tenant(scope) };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.projectId) filter.projectId = oid(query.projectId, "Invalid project id");
    const dateRange = range(query.from, query.to);
    if (dateRange) filter.expenseDate = dateRange;
    if (query.search) filter.$or = [
      { expenseNumber: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { vendor: { $regex: query.search, $options: "i" } },
    ];
    return Expense.find(filter)
      .populate("projectId", "projectCode customerName serviceType")
      .populate("technicianId", "name phone")
      .populate("createdBy", "name")
      .sort({ expenseDate: -1, createdAt: -1 });
  },

  async get(id: string, scope: CallerScope) {
    const expense = await visible(id, scope);
    await expense.populate([
      { path: "projectId", select: "projectCode customerName serviceType" },
      { path: "technicianId", select: "name phone" },
      { path: "createdBy", select: "name" },
      { path: "approvedBy", select: "name" },
    ]);
    return expense;
  },

  async create(input: CreateExpenseInput, scope: CallerScope) {
    const projectScope = await scopeFromProject(input.projectId, scope);
    const technicianId = await validateTechnician(input.technicianId, scope);
    const expense = await Expense.create({
      ...parseExpenseInput(input),
      expenseNumber: await generateExpenseNumber(),
      projectId: projectScope.projectId,
      companyId: projectScope.companyId,
      branchId: projectScope.branchId,
      technicianId,
      status: ExpenseStatus.PENDING,
      createdBy: oid(scope.userId, "Invalid user identity"),
    });
    return expense;
  },

  async update(id: string, input: UpdateExpenseInput, scope: CallerScope) {
    const expense = await visible(id, scope);
    if (expense.status !== ExpenseStatus.PENDING) throw ApiError.badRequest("Only pending expenses can be edited");
    Object.assign(expense, parseExpenseInput(input));
    if (input.projectId !== undefined) {
      const projectScope = await scopeFromProject(input.projectId || undefined, scope);
      expense.projectId = projectScope.projectId;
      expense.companyId = projectScope.companyId;
      expense.branchId = projectScope.branchId;
    }
    if (input.technicianId !== undefined) expense.technicianId = await validateTechnician(input.technicianId || undefined, scope);
    await expense.save();
    return expense;
  },

  async changeStatus(id: string, target: ExpenseStatus.APPROVED | ExpenseStatus.REJECTED | ExpenseStatus.PAID, note: string | undefined, paidAt: string | undefined, scope: CallerScope) {
    const expense = await visible(id, scope);
    if (target === ExpenseStatus.APPROVED) {
      if (expense.status !== ExpenseStatus.PENDING) throw ApiError.badRequest("Only pending expenses can be approved");
      expense.status = ExpenseStatus.APPROVED;
      expense.approvedBy = oid(scope.userId);
      expense.approvedAt = new Date();
      expense.approvalNote = note;
    } else if (target === ExpenseStatus.REJECTED) {
      if (expense.status !== ExpenseStatus.PENDING) throw ApiError.badRequest("Only pending expenses can be rejected");
      expense.status = ExpenseStatus.REJECTED;
      expense.approvedBy = oid(scope.userId);
      expense.approvedAt = new Date();
      expense.approvalNote = note;
    } else {
      if (expense.status !== ExpenseStatus.APPROVED) throw ApiError.badRequest("Approve the expense before marking it paid");
      expense.status = ExpenseStatus.PAID;
      expense.paidAt = paidAt ? new Date(paidAt) : new Date();
    }
    await expense.save();
    return expense;
  },

  async attachReceipt(id: string, file: Express.Multer.File, scope: CallerScope) {
    const expense = await visible(id, scope, true);
    const previousPath = expense.receiptStoragePath;
    const nextPath = safeReceiptPath(file.path);
    expense.receiptStoragePath = nextPath;
    expense.receiptOriginalName = file.originalname;
    expense.receiptMimeType = file.mimetype;
    await expense.save();
    if (previousPath !== nextPath) await removeReceiptFile(previousPath);
    return sanitizeExpense(expense);
  },

  async receiptPath(id: string, scope: CallerScope) {
    const expense = await visible(id, scope, true);
    if (!expense.receiptStoragePath) throw ApiError.notFound("Receipt not found");
    const target = safeReceiptPath(expense.receiptStoragePath);
    try { await fs.access(target); } catch { throw ApiError.notFound("Receipt file not found"); }
    return target;
  },

  async remove(id: string, scope: CallerScope) {
    const expense = await visible(id, scope, true);
    if (expense.status !== ExpenseStatus.PENDING && expense.status !== ExpenseStatus.REJECTED) {
      throw ApiError.badRequest("Only pending or rejected expenses can be deleted");
    }
    const receiptPath = expense.receiptStoragePath;
    await expense.deleteOne();
    await removeReceiptFile(receiptPath);
  },

  async summary(scope: CallerScope, query: { from?: string; to?: string }) {
    const expenseTenant = tenant(scope);
    const invoiceTenant: any = scope.role === UserRole.SUPER_ADMIN ? {} : { companyId: oid(scope.companyId!), branchId: oid(scope.branchId!) };
    const dateRange = range(query.from, query.to);
    const expenseFilter: any = { ...expenseTenant, ...(dateRange ? { expenseDate: dateRange } : {}) };
    const invoiceFilter: any = { ...invoiceTenant, status: { $nin: [InvoiceStatus.DRAFT, InvoiceStatus.VOID] }, ...(dateRange ? { createdAt: dateRange } : {}) };
    const cashExpenseFilter: any = { ...expenseTenant, status: ExpenseStatus.PAID, ...(dateRange ? { paidAt: dateRange } : {}) };
    const cashInvoiceFilter: any = { ...invoiceTenant, status: { $ne: InvoiceStatus.VOID }, ...(dateRange ? { "payments.paidAt": dateRange } : {}) };

    const [expenses, invoices, cashExpenses, cashInvoices] = await Promise.all([
      Expense.find(expenseFilter).lean(),
      Invoice.find(invoiceFilter).lean(),
      Expense.find(cashExpenseFilter).lean(),
      Invoice.find(cashInvoiceFilter).lean(),
    ]);

    const recognizedExpenses = expenses.filter((e) => e.status === ExpenseStatus.APPROVED || e.status === ExpenseStatus.PAID);
    const pendingExpenses = expenses.filter((e) => e.status === ExpenseStatus.PENDING);
    const billedRevenue = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const collectedRevenue = cashInvoices.reduce((sum, invoice) => {
      if (!dateRange) return sum + invoice.amountPaid;
      return sum + invoice.payments.reduce((paymentSum, payment) => {
        const paidAt = new Date(payment.paidAt).getTime();
        const afterStart = !dateRange.$gte || paidAt >= dateRange.$gte.getTime();
        const beforeEnd = !dateRange.$lte || paidAt <= dateRange.$lte.getTime();
        return paymentSum + (afterStart && beforeEnd ? payment.amount : 0);
      }, 0);
    }, 0);
    const outstanding = invoices.reduce((sum, i) => sum + i.balanceDue, 0);
    const recognizedCost = recognizedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashCost = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
    const estimatedProfit = billedRevenue - recognizedCost;
    const cashProfit = collectedRevenue - cashCost;

    const categoryMap = new Map<string, number>();
    for (const e of recognizedExpenses) categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount);

    const projects = await Project.find({ _id: { $in: [...new Set([...invoices.map(i => i.projectId?.toString()), ...recognizedExpenses.map(e => e.projectId?.toString())].filter(Boolean))] } }).select("_id serviceType branchId").lean();
    const projectMap = new Map(projects.map(p => [p._id.toString(), p]));
    const serviceMap = new Map<string, { revenue: number; expenses: number }>();
    for (const invoice of invoices) {
      const service = projectMap.get(invoice.projectId.toString())?.serviceType || invoice.serviceType;
      const current = serviceMap.get(service) || { revenue: 0, expenses: 0 };
      current.revenue += invoice.grandTotal;
      serviceMap.set(service, current);
    }
    for (const expense of recognizedExpenses) {
      if (!expense.projectId) continue;
      const service = projectMap.get(expense.projectId.toString())?.serviceType;
      if (!service) continue;
      const current = serviceMap.get(service) || { revenue: 0, expenses: 0 };
      current.expenses += expense.amount;
      serviceMap.set(service, current);
    }

    const branchIds = [...new Set([...invoices.map(i => i.branchId?.toString()), ...recognizedExpenses.map(e => e.branchId?.toString())].filter(Boolean) as string[])];
    const branches = await Branch.find({ _id: { $in: branchIds } }).select("_id name city").lean();
    const branchName = new Map(branches.map(b => [b._id.toString(), `${b.name}${b.city ? ` · ${b.city}` : ""}`]));
    const branchMap = new Map<string, { revenue: number; expenses: number }>();
    for (const i of invoices) {
      const key = i.branchId?.toString() || "unassigned";
      const current = branchMap.get(key) || { revenue: 0, expenses: 0 };
      current.revenue += i.grandTotal;
      branchMap.set(key, current);
    }
    for (const e of recognizedExpenses) {
      const key = e.branchId?.toString() || "unassigned";
      const current = branchMap.get(key) || { revenue: 0, expenses: 0 };
      current.expenses += e.amount;
      branchMap.set(key, current);
    }

    return {
      billedRevenue,
      collectedRevenue,
      outstanding,
      recognizedCost,
      paidExpenses: cashCost,
      pendingApproval: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
      estimatedProfit,
      cashProfit,
      estimatedMargin: billedRevenue > 0 ? Number(((estimatedProfit / billedRevenue) * 100).toFixed(1)) : 0,
      categoryBreakdown: [...categoryMap.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      serviceProfitability: [...serviceMap.entries()].map(([serviceType, v]) => ({ serviceType, revenue: v.revenue, expenses: v.expenses, profit: v.revenue - v.expenses })).sort((a, b) => b.profit - a.profit),
      branchProfitability: [...branchMap.entries()].map(([branchId, v]) => ({ branchId, branchName: branchName.get(branchId) || "Unassigned", revenue: v.revenue, expenses: v.expenses, profit: v.revenue - v.expenses })).sort((a, b) => b.profit - a.profit),
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
    };
  },
};
