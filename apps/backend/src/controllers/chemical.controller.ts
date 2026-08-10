import { Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";

import { chemicalService } from "../services/chemical.service";

import { getCallerScope } from "../utils/callerScope";

import { UserRole } from "../models/User";

import {
  CreateChemicalInput,
  RestockChemicalInput,
  CheckoutChemicalInput,
  ReturnChemicalInput,
  LogUsageInput,
} from "../validators/chemical.validators";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const chemicalController = {
  /*
  |--------------------------------------------------------------------------
  | LIST CHEMICALS
  |--------------------------------------------------------------------------
  */
  list: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const activeOnly =
        req.query.all !== "true";

      const chemicals =
        await chemicalService.listChemicals(
          scope,
          activeOnly
        );

      sendSuccess(
        res,
        200,
        "Chemicals",
        {
          chemicals,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | CREATE CHEMICAL
  |--------------------------------------------------------------------------
  */
  create: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as CreateChemicalInput;

      const chemical =
        await chemicalService.createChemical(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "Chemical created",
        {
          chemical,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | RESTOCK
  |--------------------------------------------------------------------------
  */
  restock: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as RestockChemicalInput;

      const chemical =
        await chemicalService.restock(
          req.params.id,
          input,
          scope
        );

      sendSuccess(
        res,
        200,
        "Stock updated",
        {
          chemical,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | CHECKOUT CHEMICAL
  |--------------------------------------------------------------------------
  */
  checkout: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as CheckoutChemicalInput;

      const checkout =
        await chemicalService.checkout(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "Chemical checked out",
        {
          checkout,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | RETURN CHEMICAL
  |--------------------------------------------------------------------------
  */
  returnCheckout: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as ReturnChemicalInput;

      const checkout =
        await chemicalService.returnCheckout(
          req.params.id,
          input,
          scope
        );

      sendSuccess(
        res,
        200,
        "Return recorded",
        {
          checkout,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | OPEN CHECKOUTS
  |--------------------------------------------------------------------------
  |
  | Technician:
  |   Always sees only their own records.
  |
  | Admin:
  |   May optionally provide ?technicianId=...
  |
  */
  listOpenCheckouts: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const technicianId =
        scope.role ===
        UserRole.TECHNICIAN
          ? scope.userId
          : typeof req.query
                .technicianId ===
              "string"
            ? req.query
                .technicianId
            : undefined;

      const checkouts =
        await chemicalService.listOpenCheckouts(
          scope,
          technicianId
        );

      sendSuccess(
        res,
        200,
        "Open checkouts",
        {
          checkouts,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | LOG PROJECT CHEMICAL USAGE
  |--------------------------------------------------------------------------
  */
  logUsage: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as LogUsageInput;

      const usage =
        await chemicalService.logUsage(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "Usage logged",
        {
          usage,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | PROJECT CHEMICAL USAGE
  |--------------------------------------------------------------------------
  */
  getProjectUsage: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const usage =
        await chemicalService.getProjectUsage(
          req.params.projectId,
          scope
        );

      sendSuccess(
        res,
        200,
        "Project chemical usage",
        {
          usage,
        }
      );
    }
  ),
};