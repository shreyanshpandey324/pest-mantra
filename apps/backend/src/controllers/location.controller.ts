import { Response } from "express";

import {
  asyncHandler,
} from "../utils/asyncHandler";

import {
  sendSuccess,
} from "../utils/ApiResponse";

import {
  LocationService,
} from "../services/location.service";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  getCallerScope,
} from "../utils/callerScope";

import {
  UpdateLocationInput,
} from "../validators/location.validators";

export const locationController = {
  /*
  |--------------------------------------------------------------------------
  | UPDATE OWN LOCATION
  |--------------------------------------------------------------------------
  */

  update: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      /*
       * Validation has already happened
       * in the route middleware.
       *
       * Technician ID is NEVER accepted
       * from the request body.
       */
      const input =
        req.body as UpdateLocationInput;

      const location =
        await LocationService.updateLocation(
          {
            technicianId:
              scope.userId,

            latitude:
              input.latitude,

            longitude:
              input.longitude,

            accuracy:
              input.accuracy,

            speed:
              input.speed,

            heading:
              input.heading,

            batteryLevel:
              input.batteryLevel,

            isCharging:
              input.isCharging,
          },
          scope
        );

      sendSuccess(
        res,
        200,
        "Location updated",
        {
          location,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | OWN LATEST LOCATION
  |--------------------------------------------------------------------------
  */

  mine: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const location =
        await LocationService.getLatestLocation(
          scope.userId,
          scope
        );

      sendSuccess(
        res,
        200,
        "Latest location",
        {
          location,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | LIVE COMPANY LOCATIONS
  |--------------------------------------------------------------------------
  */

  live: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const locations =
        await LocationService.getLiveLocations(
          scope
        );

      sendSuccess(
        res,
        200,
        "Live locations",
        {
          locations,
        }
      );
    }
  ),
};