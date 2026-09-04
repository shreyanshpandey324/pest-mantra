import { z } from "zod";
import { InvoicePaymentMethod, InvoiceStatus } from "../models/Invoice";

const item = z.object({
  description: z.string().trim().min(2).max(300),
  quantity: z.number().positive(),
  rate: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  projectId: z.string().min(1),
  dueDate: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid due date"),
  items: z.array(item).min(1).optional(),
  discount: z.number().min(0).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(0),
  additionalCharges: z.number().min(0).optional().default(0),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(5000).optional(),
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid due date").optional(),
  items: z.array(item).min(1).optional(),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  additionalCharges: z.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(5000).optional(),
});

export const invoiceStatusSchema = z.object({
  status: z.enum([InvoiceStatus.ISSUED, InvoiceStatus.VOID]),
});

export const addPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.nativeEnum(InvoicePaymentMethod),
  reference: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(500).optional(),
  paidAt: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid payment date").optional(),
});

export const listInvoicesSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
