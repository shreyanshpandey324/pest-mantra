import { Schema, model, Document, Types } from "mongoose";
import { ServiceType } from "./Project";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

export enum InvoiceStatus {
  DRAFT = "draft",
  ISSUED = "issued",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERDUE = "overdue",
  VOID = "void",
}

export enum InvoicePaymentMethod {
  CASH = "cash",
  UPI = "upi",
  CARD = "card",
  BANK_TRANSFER = "bank_transfer",
  CHEQUE = "cheque",
  OTHER = "other",
}

export interface IInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface IInvoicePayment {
  _id?: Types.ObjectId;
  amount: number;
  method: InvoicePaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: Date;
  recordedBy: Types.ObjectId;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  invoiceNumber: string;
  projectId: Types.ObjectId;
  quotationId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCompany?: string;
  address: string;
  city?: string;
  serviceType: ServiceType;
  items: IInvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  additionalCharges: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: Date;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  payments: IInvoicePayment[];
  issuedAt?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true, trim: true, maxlength: 300 },
  quantity: { type: Number, required: true, min: 0.01 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const paymentSchema = new Schema<IInvoicePayment>({
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: Object.values(InvoicePaymentMethod), required: true },
  reference: { type: String, trim: true, maxlength: 150 },
  notes: { type: String, trim: true, maxlength: 500 },
  paidAt: { type: Date, required: true, default: Date.now },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { _id: true });

const invoiceSchema = new Schema<IInvoice>({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true, index: true },
  quotationId: { type: Schema.Types.ObjectId, ref: "Quotation", index: true },
  customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  customerPhone: { type: String, required: true, trim: true, validate: { validator: (v: string) => CUSTOMER_PHONE_REGEX.test(v), message: "Invalid phone" } },
  customerEmail: { type: String, trim: true, lowercase: true },
  customerCompany: { type: String, trim: true, maxlength: 150 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  city: { type: String, trim: true, maxlength: 100 },
  serviceType: { type: String, enum: Object.values(ServiceType), required: true },
  items: { type: [itemSchema], required: true, validate: { validator: (v: IInvoiceItem[]) => v.length > 0, message: "At least one line item is required" } },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  taxAmount: { type: Number, default: 0, min: 0 },
  additionalCharges: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true, index: true },
  status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.DRAFT, index: true },
  notes: { type: String, trim: true, maxlength: 2000 },
  terms: { type: String, trim: true, maxlength: 5000 },
  payments: { type: [paymentSchema], default: [] },
  issuedAt: Date,
  paidAt: Date,
  voidedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true });

invoiceSchema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
invoiceSchema.index({ companyId: 1, customerPhone: 1, createdAt: -1 });

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
