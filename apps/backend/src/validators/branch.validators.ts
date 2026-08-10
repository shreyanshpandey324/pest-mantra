import { z } from "zod";

export const createBranchSchema = z.object({
  companyId: z
    .string()
    .trim()
    .optional(),

  name: z
    .string()
    .trim()
    .min(2, "Branch name must be at least 2 characters")
    .max(150, "Branch name cannot exceed 150 characters"),

  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(100, "City cannot exceed 100 characters"),

  state: z
    .string()
    .trim()
    .min(2, "State is required")
    .max(100, "State cannot exceed 100 characters"),
});

export type CreateBranchInput =
  z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(150),

  city: z
    .string()
    .trim()
    .min(2)
    .max(100),

  state: z
    .string()
    .trim()
    .min(2)
    .max(100),

  isActive: z
    .boolean()
    .optional(),
});

export type UpdateBranchInput =
  z.infer<typeof updateBranchSchema>;