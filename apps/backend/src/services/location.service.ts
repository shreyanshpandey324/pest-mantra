import mongoose from "mongoose";

import { Location } from "../models/Location";
import {
  User,
  UserRole,
} from "../models/User";
import { TechnicianProfile } from "../models/TechnicianProfile";

import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";

/*
|--------------------------------------------------------------------------
| Live Location Configuration
|--------------------------------------------------------------------------
*/

const LIVE_LOCATION_MAX_AGE_MS =
  2 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getCompanyId(
  scope: CallerScope
): mongoose.Types.ObjectId | undefined {
  if (!scope.companyId) {
    return undefined;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      scope.companyId
    )
  ) {
    throw ApiError.badRequest(
      "Invalid company id"
    );
  }

  return new mongoose.Types.ObjectId(
    scope.companyId
  );
}

function getTechnicianId(
  technicianId: string
): mongoose.Types.ObjectId {
  if (
    !mongoose.Types.ObjectId.isValid(
      technicianId
    )
  ) {
    throw ApiError.badRequest(
      "Invalid technician id"
    );
  }

  return new mongoose.Types.ObjectId(
    technicianId
  );
}

function getAgeSeconds(
  recordedAt: Date | string
): number {
  const timestamp =
    new Date(recordedAt).getTime();

  return Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) / 1000
    )
  );
}

function isLocationLive(
  recordedAt: Date | string
): boolean {
  const timestamp =
    new Date(recordedAt).getTime();

  return (
    Date.now() - timestamp <=
    LIVE_LOCATION_MAX_AGE_MS
  );
}

/*
|--------------------------------------------------------------------------
| Location Service
|--------------------------------------------------------------------------
*/

export class LocationService {
  /*
  |--------------------------------------------------------------------------
  | UPDATE LOCATION
  |--------------------------------------------------------------------------
  */

  static async updateLocation(
    data: {
      technicianId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      batteryLevel?: number;
      isCharging?: boolean;
    },
    scope: CallerScope
  ) {
    const companyId =
      getCompanyId(scope);

    /*
     * Technician identity always comes
     * from the authenticated user.
     */
    const authenticatedTechnicianId =
      getTechnicianId(
        scope.userId
      );

    /*
     * Validate the supplied technician ID
     * and make sure it matches the caller.
     */
    const suppliedTechnicianId =
      getTechnicianId(
        data.technicianId
      );

    if (
      suppliedTechnicianId.toString() !==
      authenticatedTechnicianId.toString()
    ) {
      throw ApiError.forbidden(
        "You can only update your own location"
      );
    }

    /*
     * Verify that the authenticated account
     * is an active technician.
     */
    const technician =
      await User.findOne({
        _id:
          authenticatedTechnicianId,
        role:
          UserRole.TECHNICIAN,
        isActive: true,
        ...(companyId
          ? {
              companyId,
            }
          : {}),
      }).select(
        "_id name companyId"
      );

    if (!technician) {
      throw ApiError.forbidden(
        "Technician account is not valid or is not linked to this company"
      );
    }

    /*
     * Save GPS location.
     */
    return Location.create({
      companyId,

      technicianId:
        authenticatedTechnicianId,

      latitude:
        data.latitude,

      longitude:
        data.longitude,

      accuracy:
        data.accuracy ?? 0,

      speed:
        data.speed ?? 0,

      heading:
        data.heading ?? 0,

      batteryLevel:
        data.batteryLevel,

      isCharging:
        data.isCharging,

      recordedAt:
        new Date(),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | LATEST LOCATION
  |--------------------------------------------------------------------------
  */

  static async getLatestLocation(
    technicianId: string,
    scope: CallerScope
  ) {
    const technicianObjectId =
      getTechnicianId(
        technicianId
      );

    const companyId =
      getCompanyId(scope);

    /*
     * Verify technician belongs to the
     * caller's accessible company.
     */
    const technician =
      await User.findOne({
        _id:
          technicianObjectId,

        role:
          UserRole.TECHNICIAN,

        ...(companyId
          ? {
              companyId,
            }
          : {}),
      }).select(
        "_id name companyId"
      );

    if (!technician) {
      throw ApiError.notFound(
        "Technician not found"
      );
    }

    /*
     * Get technician profile.
     */
    const profile =
      await TechnicianProfile.findOne({
        userId:
          technicianObjectId,

        ...(companyId
          ? {
              companyId,
            }
          : {}),
      }).select(
        "employeeCode currentDutyStatus"
      );

    /*
     * Get latest GPS record.
     */
    const filter: Record<
      string,
      unknown
    > = {
      technicianId:
        technicianObjectId,
    };

    if (companyId) {
      filter.companyId =
        companyId;
    }

    const location =
      await Location.findOne(
        filter
      )
        .sort({
          recordedAt: -1,
        })
        .lean();

    if (!location) {
      return null;
    }

    const ageSeconds =
      getAgeSeconds(
        location.recordedAt
      );

    return {
      technicianId:
        technician._id.toString(),

      technicianName:
        technician.name,

      employeeCode:
        profile?.employeeCode ?? null,

      dutyStatus:
        profile?.currentDutyStatus ??
        null,

      latitude:
        location.latitude,

      longitude:
        location.longitude,

      accuracy:
        location.accuracy ?? 0,

      speed:
        location.speed ?? 0,

      heading:
        location.heading ?? 0,

      batteryLevel:
        location.batteryLevel ?? null,

      isCharging:
        location.isCharging ?? null,

      recordedAt:
        location.recordedAt,

      ageSeconds,

      isLive:
        isLocationLive(
          location.recordedAt
        ),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | LIVE LOCATIONS
  |--------------------------------------------------------------------------
  |
  | Returns the latest location for every
  | technician visible to the caller.
  |
  */

  static async getLiveLocations(
    scope: CallerScope
  ) {
    const companyId =
      getCompanyId(scope);

    const match: Record<
      string,
      unknown
    > = {};

    /*
     * Company admins are automatically
     * restricted to their own company.
     *
     * Super Admin without companyId can
     * see locations across companies.
     */
    if (companyId) {
      match.companyId =
        companyId;
    }

    /*
     * Get latest location per technician.
     */
    const locations =
      await Location.aggregate([
        {
          $match: match,
        },

        {
          $sort: {
            recordedAt: -1,
          },
        },

        {
          $group: {
            _id:
              "$technicianId",

            latest: {
              $first:
                "$$ROOT",
            },
          },
        },

        {
          $replaceRoot: {
            newRoot:
              "$latest",
          },
        },

        {
          $sort: {
            recordedAt: -1,
          },
        },
      ]);

    if (locations.length === 0) {
      return [];
    }

    /*
     * Collect technician IDs.
     */
    const technicianIds =
      locations.map(
        (location) =>
          location.technicianId
      );

    /*
     * Fetch technician basic information.
     *
     * Only required fields are selected.
     */
    const technicians =
      await User.find({
        _id: {
          $in:
            technicianIds,
        },

        role:
          UserRole.TECHNICIAN,

        ...(companyId
          ? {
              companyId,
            }
          : {}),
      }).select(
        "_id name companyId"
      );

    /*
     * Fetch technician profiles.
     */
    const profiles =
      await TechnicianProfile.find({
        userId: {
          $in:
            technicianIds,
        },

        ...(companyId
          ? {
              companyId,
            }
          : {}),
      }).select(
        "userId employeeCode currentDutyStatus"
      );

    /*
     * Build lookup maps.
     */
    const technicianMap =
      new Map(
        technicians.map(
          (technician) => [
            technician._id.toString(),
            technician,
          ]
        )
      );

    const profileMap =
      new Map(
        profiles.map(
          (profile) => [
            profile.userId.toString(),
            profile,
          ]
        )
      );

    /*
     * Build frontend-friendly response.
     */
    return locations
      .map((location) => {
        const technicianId =
          location.technicianId.toString();

        const technician =
          technicianMap.get(
            technicianId
          );

        const profile =
          profileMap.get(
            technicianId
          );

        /*
         * Ignore orphaned location records
         * where the technician no longer exists.
         */
        if (!technician) {
          return null;
        }

        const ageSeconds =
          getAgeSeconds(
            location.recordedAt
          );

        return {
          technicianId,

          technicianName:
            technician.name,

          employeeCode:
            profile?.employeeCode ??
            null,

          dutyStatus:
            profile?.currentDutyStatus ??
            null,

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          accuracy:
            location.accuracy ?? 0,

          speed:
            location.speed ?? 0,

          heading:
            location.heading ?? 0,

          batteryLevel:
            location.batteryLevel ?? null,

          isCharging:
            location.isCharging ?? null,

          recordedAt:
            location.recordedAt,

          ageSeconds,

          isLive:
            isLocationLive(
              location.recordedAt
            ),
        };
      })
      .filter(
        (
          location
        ): location is NonNullable<
          typeof location
        > =>
          location !== null
      );
  }
}