import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { userService } from "../services/user.service";
import {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/auth.validators";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const userController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();

    const input = req.body as CreateUserInput;

    const user = await userService.createUser(
      input,
      req.user.role
    );

    sendSuccess(
      res,
      201,
      "User created successfully",
      {
        user: user.toJSON(),
      }
    );
  }),update: asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    if (!req.user)
      throw ApiError.unauthorized();

    const user =
      await userService.updateUser(
        req.params.id,
        req.body as UpdateUserInput
      );

    sendSuccess(
      res,
      200,
      "Technician updated successfully",
      {
        user: user.toJSON(),
      }
    );
  }
),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id);

    sendSuccess(
      res,
      200,
      "Technician deleted successfully"
    );
  }),
};