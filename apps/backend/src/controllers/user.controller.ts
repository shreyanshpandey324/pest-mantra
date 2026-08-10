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
  UpdateUserInput,
} from "../validators/auth.validators";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  getCallerScope,
} from "../utils/callerScope";

export const userController = {
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

  /**
   * Delete user.
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
        "User deleted successfully"
      );
    }
  ),
};