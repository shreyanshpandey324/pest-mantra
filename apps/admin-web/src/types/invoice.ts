import { ServiceType } from "./project";

export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "void";
export type InvoicePaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "other";

export interface InvoiceItem { description: string; quantity: number; rate: number; amount: number; }
export interface InvoicePayment { _id?: string; amount: number; method: InvoicePaymentMethod; reference?: string; notes?: string; paidAt: string; recordedBy: string; }
export interface Invoice {
  _id: string; companyId?: string; branchId?: string; invoiceNumber: string; projectId: string; quotationId?: string;
  customerName: string; customerPhone: string; customerEmail?: string; customerCompany?: string; address: string; city?: string;
  serviceType: ServiceType; items: InvoiceItem[]; subtotal: number; discount: number; taxRate: number; taxAmount: number;
  additionalCharges: number; grandTotal: number; amountPaid: number; balanceDue: number; dueDate: string; status: InvoiceStatus;
  notes?: string; terms?: string; payments: InvoicePayment[]; issuedAt?: string; paidAt?: string; voidedAt?: string;
  createdBy: string; createdAt: string; updatedAt: string;
}
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { draft: "Draft", issued: "Issued", partially_paid: "Partially Paid", paid: "Paid", overdue: "Overdue", void: "Void" };
export const PAYMENT_METHOD_LABELS: Record<InvoicePaymentMethod, string> = { cash: "Cash", upi: "UPI", card: "Card", bank_transfer: "Bank Transfer", cheque: "Cheque", other: "Other" };
