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

export const otpAudienceSchema = z.enum(["admin", "technician"]);

export const otpEligibilitySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      PHONE_REGEX,
      "Enter a valid 10-digit Indian mobile number"
    ),
  audience: otpAudienceSchema,
});

export type OtpEligibilityInput = z.infer<typeof otpEligibilitySchema>;

export const otpVerifySchema = z.object({
  idToken: z
    .string()
    .trim()
    .min(1, "OTP verification token is required"),
  audience: otpAudienceSchema,
});

export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

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

  // Office Admins use registered phone + password for dashboard sign-in.
  // Technician passwords remain optional while the field app uses OTP.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .optional(),

  otpLoginEnabled: z.boolean().optional(),

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
}).superRefine((data, ctx) => {
  if (
    (data.role === UserRole.OFFICE_ADMIN || data.role === UserRole.TECHNICIAN) &&
    !data.password
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "Password is required for Office Admin and Technician accounts",
    });
  }
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

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
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

export const resetUserPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

export const otpAccessSchema = z.object({
  enabled: z.boolean(),
});

export type OtpAccessInput = z.infer<typeof otpAccessSchema>;
