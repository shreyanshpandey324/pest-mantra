import { User } from "../models/User";
import { Company } from "../models/Company";
import { Branch } from "../models/Branch";
import {
  NotificationPreference,
} from "../models/NotificationPreference";

import { ApiError } from "../utils/ApiError";

import {
  authService,
} from "./auth.service";

import {
  UpdateAccountSettingsInput,
  UpdatePasswordSettingsInput,
  UpdateNotificationSettingsInput,
} from "../validators/settings.validators";

export const settingsService = {
  /**
   * Get all settings information for
   * the currently authenticated user.
   */
  async getSettings(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    const company = user.companyId
      ? await Company.findById(user.companyId)
      : null;

    const branch = user.branchId
      ? await Branch.findById(user.branchId)
      : null;

    let notifications =
      await NotificationPreference.findOne({
        userId: user._id,
      });

    if (!notifications) {
      notifications =
        await NotificationPreference.create({
          userId: user._id,
          emailNotifications: true,
          projectNotifications: true,
          systemNotifications: true,
        });
    }

    return {
      account: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email ?? "",
        role: user.role,
        isActive: user.isActive,
      },

      company: company
        ? {
            id: company._id,
            name: company.name,
            phone: company.phone ?? "",
            email: company.email ?? "",
            status: company.status,
            isActive: company.isActive,
          }
        : null,

      branch: branch
        ? {
            id: branch._id,
            name: branch.name,
            city: branch.city,
            state: branch.state,
            isActive: branch.isActive,
          }
        : null,

      notifications: {
        emailNotifications:
          notifications.emailNotifications,

        projectNotifications:
          notifications.projectNotifications,

        systemNotifications:
          notifications.systemNotifications,
      },
    };
  },

  /**
   * Update the currently authenticated
   * user's own account information.
   */
  async updateAccount(
    userId: string,
    input: UpdateAccountSettingsInput
  ) {
    const user =
      await User.findById(userId);

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    const normalizedEmail =
      input.email?.trim().toLowerCase();

    const existingPhone =
      await User.findOne({
        phone: input.phone,
        _id: {
          $ne: user._id,
        },
      });

    if (existingPhone) {
      throw ApiError.conflict(
        "This phone number is already registered"
      );
    }

    if (normalizedEmail) {
      const existingEmail =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id,
          },
        });

      if (existingEmail) {
        throw ApiError.conflict(
          "This email address is already registered"
        );
      }
    }

    user.name = input.name.trim();

    user.phone =
      input.phone.trim();

    user.email =
      normalizedEmail || undefined;

    await user.save();

    return user;
  },

  /**
   * Change the currently authenticated
   * user's password.
   */
  async updatePassword(
    userId: string,
    input: UpdatePasswordSettingsInput
  ) {
    const user =
      await User.findById(userId).select(
        "+passwordHash +tokenVersion"
      );

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    if (
      input.newPassword !==
      input.confirmPassword
    ) {
      throw ApiError.badRequest(
        "New password and confirmation password do not match"
      );
    }

    const currentPasswordMatches =
      await user.comparePassword(
        input.currentPassword
      );

    if (!currentPasswordMatches) {
      throw ApiError.unauthorized(
        "Current password is incorrect"
      );
    }

    if (
      input.currentPassword ===
      input.newPassword
    ) {
      throw ApiError.badRequest(
        "New password must be different from the current password"
      );
    }

    /*
     * User.pre("save") automatically hashes
     * passwordHash before saving.
     */
    user.passwordHash =
      input.newPassword;

    await user.save();

    /*
     * Invalidate all existing refresh
     * sessions after password change.
     */
    await authService.revokeAllSessions(
      user._id.toString()
    );

    return true;
  },

  /**
   * Update notification preferences.
   */
  async updateNotifications(
    userId: string,
    input: UpdateNotificationSettingsInput
  ) {
    const user =
      await User.findById(userId);

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    const preferences =
      await NotificationPreference.findOneAndUpdate(
        {
          userId: user._id,
        },
        {
          $set: {
            emailNotifications:
              input.emailNotifications,

            projectNotifications:
              input.projectNotifications,

            systemNotifications:
              input.systemNotifications,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return preferences;
  },
};