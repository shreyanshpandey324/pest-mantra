import { z } from "zod";
import { CompanyStatus } from "../models/Company";

export const createCompanySchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150),

    phone: z
      .string()
      .trim()
      .optional(),

    email: z
      .string()
      .trim()
      .email()
      .optional(),
  });

export type CreateCompanyInput =
  z.infer<
    typeof createCompanySchema
  >;

export const updateCompanySchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(150)
      .optional(),

    phone: z
      .string()
      .trim()
      .optional(),

    email: z
      .string()
      .trim()
      .email()
      .optional(),

    status: z
      .nativeEnum(CompanyStatus)
      .optional(),

    isActive: z
      .boolean()
      .optional(),
  });

export type UpdateCompanyInput =
  z.infer<
    typeof updateCompanySchema
  >;

export const createBranchSchema =
  z.object({
    companyId: z
      .string()
      .trim()
      .min(1),

    name: z
      .string()
      .trim()
      .min(2)
      .max(100),

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

export type CreateBranchInput =
  z.infer<
    typeof createBranchSchema
  >;

export const updateBranchSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    city: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    state: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    isActive: z
      .boolean()
      .optional(),
  });

export type UpdateBranchInput =
  z.infer<
    typeof updateBranchSchema
  >;