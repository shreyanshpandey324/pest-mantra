import { z } from "zod";

export const updateAccountSettingsSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    phone: z
      .string()
      .trim()
      .regex(
        /^[6-9]\d{9}$/,
        "Phone must be a valid 10-digit Indian mobile number"
      ),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
  });

export const updatePasswordSettingsSchema =
  z.object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(
        8,
        "New password must be at least 8 characters"
      )
      .max(
        128,
        "New password cannot exceed 128 characters"
      ),

    confirmPassword: z
      .string()
      .min(
        1,
        "Please confirm the new password"
      ),
  });

export const updateNotificationSettingsSchema =
  z.object({
    emailNotifications: z.boolean(),

    projectNotifications: z.boolean(),

    systemNotifications: z.boolean(),
  });

export type UpdateAccountSettingsInput =
  z.infer<
    typeof updateAccountSettingsSchema
  >;

export type UpdatePasswordSettingsInput =
  z.infer<
    typeof updatePasswordSettingsSchema
  >;

export type UpdateNotificationSettingsInput =
  z.infer<
    typeof updateNotificationSettingsSchema
  >;