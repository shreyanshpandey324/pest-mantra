import { z } from "zod";
import { PHONE_REGEX, EMAIL_REGEX } from "../utils/constants";

export const createTechnicianSchema = z.object({
  name: z.string().trim().min(2).max(100),

  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Enter a valid 10-digit Indian mobile number"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Invalid email address")
    .optional(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),

  employeeCode: z
    .string()
    .trim()
    .min(2)
    .max(30),

  skills: z.array(z.string().trim()).default([]),

  vehicleNumber: z
    .string()
    .trim()
    .max(30)
    .optional(),

  branchId: z
    .string()
    .trim()
    .min(1, "Branch is required"),
});

export type CreateTechnicianInput =
  z.infer<typeof createTechnicianSchema>;

export const updateTechnicianSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_REGEX, "Invalid email address")
    .optional(),

  skills: z.array(z.string().trim()).optional(),

  vehicleNumber: z
    .string()
    .trim()
    .max(30)
    .optional(),

  isActive: z.boolean().optional(),
});

export type UpdateTechnicianInput =
  z.infer<typeof updateTechnicianSchema>;

export const technicianIdSchema = z.object({
  technicianId: z.string().trim().min(1),
});

export type TechnicianIdInput =
  z.infer<typeof technicianIdSchema>;