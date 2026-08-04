import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { LocationService } from "../services/location.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { getCallerScope } from "../utils/callerScope";

export const locationController = {
  update: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);

    const location = await LocationService.updateLocation({
      technicianId: scope.userId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracy: req.body.accuracy,
      speed: req.body.speed,
      heading: req.body.heading,
      batteryLevel: req.body.batteryLevel,
      isCharging: req.body.isCharging,
    });

    sendSuccess(res, 200, "Location updated", {
      location,
    });
  }),

  live: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const locations = await LocationService.getLiveLocations();

    sendSuccess(res, 200, "Live locations", {
      locations,
    });
  }),

  mine: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);

    const location = await LocationService.getLatestLocation(scope.userId);

    sendSuccess(res, 200, "Latest location", {
      location,
    });
  }),
};