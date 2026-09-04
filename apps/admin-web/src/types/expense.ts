import { ServiceType } from "./project";

export type ExpenseCategory =
  | "fuel"
  | "chemical"
  | "technician_allowance"
  | "travel"
  | "equipment"
  | "vehicle_maintenance"
  | "office"
  | "utilities"
  | "marketing"
  | "other";

export type ExpenseStatus = "pending" | "approved" | "rejected" | "paid";
export type ExpensePaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "other";

export interface ExpenseProjectRef {
  _id: string;
  projectCode: string;
  customerName: string;
  serviceType: ServiceType;
}

export interface ExpenseTechnicianRef { _id?: string; id?: string; name: string; phone: string; }
export interface ExpenseUserRef { _id?: string; name: string; }

export interface Expense {
  _id: string;
  companyId?: string;
  branchId?: string;
  expenseNumber: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  description: string;
  vendor?: string;
  paymentMethod?: ExpensePaymentMethod;
  paymentReference?: string;
  projectId?: string | ExpenseProjectRef;
  technicianId?: string | ExpenseTechnicianRef;
  status: ExpenseStatus;
  approvalNote?: string;
  approvedBy?: string | ExpenseUserRef;
  approvedAt?: string;
  paidAt?: string;
  receiptOriginalName?: string;
  receiptMimeType?: string;
  notes?: string;
  createdBy: string | ExpenseUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  billedRevenue: number;
  collectedRevenue: number;
  outstanding: number;
  recognizedCost: number;
  paidExpenses: number;
  pendingApproval: number;
  estimatedProfit: number;
  cashProfit: number;
  estimatedMargin: number;
  categoryBreakdown: Array<{ category: ExpenseCategory; amount: number }>;
  serviceProfitability: Array<{ serviceType: ServiceType; revenue: number; expenses: number; profit: number }>;
  branchProfitability: Array<{ branchId: string; branchName: string; revenue: number; expenses: number; profit: number }>;
  invoiceCount: number;
  expenseCount: number;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  chemical: "Chemicals",
  technician_allowance: "Technician Allowance",
  travel: "Travel",
  equipment: "Equipment",
  vehicle_maintenance: "Vehicle Maintenance",
  office: "Office",
  utilities: "Utilities",
  marketing: "Marketing",
  other: "Other",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
};
