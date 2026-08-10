import { z } from "zod";
import { UserRole } from "../models/User";
import { DutyStatus } from "../models/TechnicianProfile";
import { PHONE_REGEX } from "../utils/constants";

export const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      PHONE_REGEX,
      "Enter a valid 10-digit Indian mobile number"
    ),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput =
  z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  phone: z
    .string()
    .trim()
    .regex(
      PHONE_REGEX,
      "Enter a valid 10-digit Indian mobile number"
    ),

  email: z
    .string()
    .trim()
    .email()
    .optional(),

  password: z
    .string()
    .min(
      8,
      "Password must be at least 8 characters"
    )
    .regex(
      /[A-Z]/,
      "Password must contain at least one uppercase letter"
    )
    .regex(
      /[a-z]/,
      "Password must contain at least one lowercase letter"
    )
    .regex(
      /[0-9]/,
      "Password must contain at least one number"
    ),

  role: z.nativeEnum(UserRole),

  /*
   * Required when a Super Admin creates
   * an Office Admin or Technician.
   *
   * Ignored for normal Office Admin requests;
   * their company comes from their authenticated
   * session.
   */
  companyId: z
    .string()
    .trim()
    .optional(),

  branchId: z
    .string()
    .trim()
    .optional(),
});

export type CreateUserInput =
  z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  phone: z
    .string()
    .trim()
    .regex(
      PHONE_REGEX,
      "Enter a valid 10-digit Indian mobile number"
    ),

  email: z
    .string()
    .trim()
    .email()
    .optional(),

  branchId: z
    .string()
    .trim()
    .optional(),

  isActive: z
    .boolean()
    .optional(),

  vehicleNumber: z
    .string()
    .trim()
    .max(50)
    .optional(),

  skills: z
    .array(z.string().trim())
    .optional(),

  dutyStatus: z
    .nativeEnum(DutyStatus)
    .optional(),
});

export type UpdateUserInput =
  z.infer<typeof updateUserSchema>;