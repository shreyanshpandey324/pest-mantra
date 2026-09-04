import { Response } from "express";

import {
  asyncHandler,
} from "../utils/asyncHandler";

import {
  sendSuccess,
} from "../utils/ApiResponse";

import {
  ApiError,
} from "../utils/ApiError";

import {
  userService,
} from "../services/user.service";

import {
  CreateUserInput,
  OtpAccessInput,
  ResetUserPasswordInput,
  UpdateUserInput,
} from "../validators/auth.validators";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  getCallerScope,
} from "../utils/callerScope";

export const userController = {
  list: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope = getCallerScope(req);
      const users = await userService.listUsers(scope);

      sendSuccess(res, 200, "Users retrieved successfully", {
        users: users.map((user) => user.toJSON()),
      });
    }
  ),

  /**
   * Create user.
   */
  create: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope =
        getCallerScope(req);

      const input =
        req.body as CreateUserInput;

      const user =
        await userService.createUser(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "User created successfully",
        {
          user: user.toJSON(),
        }
      );
    }
  ),

  /**
   * Update user.
   */
  update: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope =
        getCallerScope(req);

      const user =
        await userService.updateUser(
          req.params.id,
          req.body as UpdateUserInput,
          scope
        );

      sendSuccess(
        res,
        200,
        "User updated successfully",
        {
          user: user.toJSON(),
        }
      );
    }
  ),

  resetPassword: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope = getCallerScope(req);
      await userService.resetOfficeAdminPassword(
        req.params.id,
        req.body as ResetUserPasswordInput,
        scope
      );

      sendSuccess(res, 200, "Office Admin password updated successfully");
    }
  ),

  setOtpAccess: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope = getCallerScope(req);
      const user = await userService.setOtpAccess(
        req.params.id,
        req.body as OtpAccessInput,
        scope
      );

      sendSuccess(res, 200, "OTP login access updated", {
        user: user.toJSON(),
      });
    }
  ),

  /**
   * Deactivate user while preserving historical references.
   */
  delete: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const scope =
        getCallerScope(req);

      await userService.deleteUser(
        req.params.id,
        scope
      );

      sendSuccess(
        res,
        200,
        "User deactivated successfully"
      );
    }
  ),
};
