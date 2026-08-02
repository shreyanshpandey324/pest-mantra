import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { technicianService } from "../services/technician.service";
import { getCallerScope } from "../utils/callerScope";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const technicianController = {
  list: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const technicians = await technicianService.listTechnicians();

    sendSuccess(res, 200, "Technicians", {
      technicians: technicians.map(({ user, profile }) => ({
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        isActive: user.isActive,

        employeeCode: profile.employeeCode,
        vehicleNumber: profile.vehicleNumber,
        skills: profile.skills,

        dutyStatus: profile.currentDutyStatus,
      })),
    });
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const technician = await technicianService.getById(req.params.id);

    sendSuccess(res, 200, "Technician profile loaded successfully", {
      technician,
    });
  }),

  startDuty: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const profile = await technicianService.startDuty(scope.userId);

    sendSuccess(res, 200, "Duty started", {
      profile,
    });
  }),

  endDuty: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const profile = await technicianService.endDuty(scope.userId);

    sendSuccess(res, 200, "Duty ended", {
      profile,
    });
  }),

  getMyStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const profile = await technicianService.getOwnProfile(scope.userId);

    sendSuccess(res, 200, "Duty status", {
      profile,
    });
  }),
};