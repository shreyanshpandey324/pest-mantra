import { DutyLog } from "../models/DutyLog";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import mongoose from "mongoose";

function companyFilter(
  scope: CallerScope
): Record<string, unknown> {
  if (!scope.companyId) {
    return {};
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

  return {
    companyId: new mongoose.Types.ObjectId(
      scope.companyId
    ),
  };
}

export interface MileageReportEntry {
  technicianId: string;
  technicianName?: string;
  dutyStartAt: string;
  dutyEndAt?: string;
  odometerStart: number;
  odometerEnd?: number;
  distanceKm?: number;
}

export const mileageService = {
  async getReport(
    scope: CallerScope
  ): Promise<MileageReportEntry[]> {
    const logs = await DutyLog.find({
      odometerStart: {
        $exists: true,
      },
      ...companyFilter(scope),
    })
      .sort({
        dutyStartAt: -1,
      })
      .lean();

    const technicianIds = [
      ...new Set(
        logs.map((log) =>
          log.technicianId.toString()
        )
      ),
    ];

    const technicians = await User.find({
      _id: {
        $in: technicianIds.map(
          (id) =>
            new mongoose.Types.ObjectId(id)
        ),
      },
    }).select("_id name");

    const technicianNames = new Map(
      technicians.map((technician) => [
        technician._id.toString(),
        technician.name,
      ])
    );

    return logs.map((log) => ({
      technicianId:
        log.technicianId.toString(),

      technicianName:
        technicianNames.get(
          log.technicianId.toString()
        ),

      dutyStartAt:
        log.dutyStartAt.toISOString(),

      dutyEndAt:
        log.dutyEndAt?.toISOString(),

      odometerStart:
        log.odometerStart,

      odometerEnd:
        log.odometerEnd,

      distanceKm:
        log.distanceKm,
    }));
  },
};