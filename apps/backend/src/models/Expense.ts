import { Schema, model, Document, Types } from "mongoose";

export enum ExpenseCategory {
  FUEL = "fuel",
  CHEMICAL = "chemical",
  TECHNICIAN_ALLOWANCE = "technician_allowance",
  TRAVEL = "travel",
  EQUIPMENT = "equipment",
  VEHICLE_MAINTENANCE = "vehicle_maintenance",
  OFFICE = "office",
  UTILITIES = "utilities",
  MARKETING = "marketing",
  OTHER = "other",
}

export enum ExpenseStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
}

export enum ExpensePaymentMethod {
  CASH = "cash",
  UPI = "upi",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  CHEQUE = "cheque",
  OTHER = "other",
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  expenseNumber: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: Date;
  description: string;
  vendor?: string;
  paymentMethod?: ExpensePaymentMethod;
  paymentReference?: string;
  projectId?: Types.ObjectId;
  technicianId?: Types.ObjectId;
  status: ExpenseStatus;
  approvalNote?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  receiptStoragePath?: string;
  receiptOriginalName?: string;
  receiptMimeType?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
  expenseNumber: { type: String, required: true, unique: true, index: true },
  category: { type: String, enum: Object.values(ExpenseCategory), required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  expenseDate: { type: Date, required: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 2, maxlength: 500 },
  vendor: { type: String, trim: true, maxlength: 180 },
  paymentMethod: { type: String, enum: Object.values(ExpensePaymentMethod) },
  paymentReference: { type: String, trim: true, maxlength: 180 },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
  technicianId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  status: { type: String, enum: Object.values(ExpenseStatus), default: ExpenseStatus.PENDING, index: true },
  approvalNote: { type: String, trim: true, maxlength: 500 },
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: Date,
  paidAt: Date,
  receiptStoragePath: { type: String, select: false },
  receiptOriginalName: { type: String, trim: true, maxlength: 255 },
  receiptMimeType: { type: String, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 1500 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true });

expenseSchema.index({ companyId: 1, branchId: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, branchId: 1, status: 1, expenseDate: -1 });
expenseSchema.index({ projectId: 1, status: 1 });

export const Expense = model<IExpense>("Expense", expenseSchema);
