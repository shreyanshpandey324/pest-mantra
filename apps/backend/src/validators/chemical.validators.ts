import { z } from "zod";
import { ChemicalUnit } from "../models/Chemical";

export const createChemicalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  unit: z.nativeEnum(ChemicalUnit),
  currentStock: z.number().min(0).default(0),
  lowStockThreshold: z.number().min(0).default(5),
});
export type CreateChemicalInput = z.infer<typeof createChemicalSchema>;

export const restockChemicalSchema = z.object({
  quantity: z.number().positive("quantity must be greater than 0"),
});
export type RestockChemicalInput = z.infer<typeof restockChemicalSchema>;

export const checkoutChemicalSchema = z.object({
  technicianId: z.string().trim().min(1, "technicianId is required"),
  chemicalId: z.string().trim().min(1, "chemicalId is required"),
  quantityIssued: z.number().positive("quantityIssued must be greater than 0"),
});
export type CheckoutChemicalInput = z.infer<typeof checkoutChemicalSchema>;

export const returnChemicalSchema = z.object({
  returnQuantity: z.number().min(0, "returnQuantity cannot be negative"),
});
export type ReturnChemicalInput = z.infer<typeof returnChemicalSchema>;

export const logUsageSchema = z.object({
  projectId: z.string().trim().min(1, "projectId is required"),
  chemicalId: z.string().trim().min(1, "chemicalId is required"),
  quantityUsed: z.number().positive("quantityUsed must be greater than 0"),
});
export type LogUsageInput = z.infer<typeof logUsageSchema>;
