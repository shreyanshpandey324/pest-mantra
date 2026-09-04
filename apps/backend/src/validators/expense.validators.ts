import { z } from "zod";
import { ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from "../models/Expense";

const dateString = z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid date");

export const createExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().positive().max(100000000),
  expenseDate: dateString,
  description: z.string().trim().min(2).max(500),
  vendor: z.string().trim().max(180).optional(),
  paymentMethod: z.nativeEnum(ExpensePaymentMethod).optional(),
  paymentReference: z.string().trim().max(180).optional(),
  projectId: z.string().trim().min(1).optional(),
  technicianId: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(1500).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();
export const createExpenseClaimSchema = createExpenseSchema.omit({ technicianId: true });
export const updateExpenseClaimSchema = createExpenseClaimSchema.partial();

export const expenseStatusSchema = z.object({
  status: z.enum([ExpenseStatus.APPROVED, ExpenseStatus.REJECTED, ExpenseStatus.PAID]),
  note: z.string().trim().max(500).optional(),
  paidAt: dateString.optional(),
});

export const listExpensesSchema = z.object({
  status: z.nativeEnum(ExpenseStatus).optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  projectId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(120).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});

export const financeSummarySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateExpenseClaimInput = z.infer<typeof createExpenseClaimSchema>;
export type UpdateExpenseClaimInput = z.infer<typeof updateExpenseClaimSchema>;
