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
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const chemicalController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const activeOnly = req.query.all !== "true";
    const chemicals = await chemicalService.listChemicals(activeOnly);
    sendSuccess(res, 200, "Chemicals", { chemicals });
  }),

  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as CreateChemicalInput;
    const chemical = await chemicalService.createChemical(input);
    sendSuccess(res, 201, "Chemical created", { chemical });
  }),

  restock: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as RestockChemicalInput;
    const chemical = await chemicalService.restock(req.params.id, input);
    sendSuccess(res, 200, "Stock updated", { chemical });
  }),

  checkout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as CheckoutChemicalInput;
    const checkout = await chemicalService.checkout(input, scope);
    sendSuccess(res, 201, "Chemical checked out", { checkout });
  }),

  returnCheckout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as ReturnChemicalInput;
    const checkout = await chemicalService.returnCheckout(req.params.id, input, scope);
    sendSuccess(res, 200, "Return recorded", { checkout });
  }),

  listOpenCheckouts: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    // A technician calling this only ever sees their own open
    // checkouts, regardless of any query param — same "derive from
    // the verified identity, never trust client input for who this
    // is about" rule used everywhere else in the codebase.
    const technicianId = scope.role === UserRole.TECHNICIAN ? scope.userId : (req.query.technicianId as string | undefined);
    const checkouts = await chemicalService.listOpenCheckouts(technicianId);
    sendSuccess(res, 200, "Open checkouts", { checkouts });
  }),

  logUsage: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as LogUsageInput;
    const usage = await chemicalService.logUsage(input, scope);
    sendSuccess(res, 201, "Usage logged", { usage });
  }),

  getProjectUsage: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const usage = await chemicalService.getProjectUsage(req.params.projectId, scope);
    sendSuccess(res, 200, "Project chemical usage", { usage });
  }),
};
