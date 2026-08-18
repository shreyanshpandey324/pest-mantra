import { Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  settingsService,
} from "../services/settings.service";

import {
  UpdateAccountSettingsInput,
  UpdatePasswordSettingsInput,
  UpdateNotificationSettingsInput,
} from "../validators/settings.validators";

export const settingsController = {
  get: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const settings =
        await settingsService.getSettings(
          req.user.id
        );

      sendSuccess(
        res,
        200,
        "Settings loaded successfully",
        {
          settings,
        }
      );
    }
  ),

  updateAccount: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const user =
        await settingsService.updateAccount(
          req.user.id,
          req.body as UpdateAccountSettingsInput
        );

      sendSuccess(
        res,
        200,
        "Account settings updated successfully",
        {
          user: user.toJSON(),
        }
      );
    }
  ),

  updatePassword: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      await settingsService.updatePassword(
        req.user.id,
        req.body as UpdatePasswordSettingsInput
      );

      sendSuccess(
        res,
        200,
        "Password changed successfully. Please sign in again."
      );
    }
  ),

  updateNotifications: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const preferences =
        await settingsService.updateNotifications(
          req.user.id,
          req.body as UpdateNotificationSettingsInput
        );

      sendSuccess(
        res,
        200,
        "Notification settings updated successfully",
        {
          notifications: {
            emailNotifications:
              preferences.emailNotifications,

            projectNotifications:
              preferences.projectNotifications,

            systemNotifications:
              preferences.systemNotifications,
          },
        }
      );
    }
  ),
};