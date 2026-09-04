import mongoose from "mongoose";
import {
  User,
  UserRole,
  IUser,
} from "../models/User";
import {
  TechnicianProfile,
  DutyStatus,
  ITechnicianProfile,
} from "../models/TechnicianProfile";
import { DutyLog } from "../models/DutyLog";
import { Branch } from "../models/Branch";
import {
  Project,
  ProjectStatus,
} from "../models/Project";
import { Feedback } from "../models/Feedback";

import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";

export interface TechnicianListItem {
  user: IUser;
  profile: ITechnicianProfile;
  performance: {
    todayAssignedJobs: number;
    completedToday: number;
    totalCompletedJobs: number;
    averageRating?: number;
    distanceTodayKm: number;
  };
}

function validObjectId(
  id: string,
  message = "Invalid id"
): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(message);
  }

  return new mongoose.Types.ObjectId(id);
}

function companyFilter(
  scope: CallerScope
): Record<string, unknown> {
  if (!scope.companyId) {
    return {};
  }

  return {
    companyId: validObjectId(
      scope.companyId,
      "Invalid company id"
    ),
  };
}

function validateOdometer(
  value: unknown,
  fieldName: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw ApiError.badRequest(
      `${fieldName} must be a valid non-negative number`
    );
  }

  return value;
}

export const technicianService = {
  async listTechnicians(
    scope: CallerScope
  ): Promise<TechnicianListItem[]> {
    const userFilter: Record<string, unknown> = {
      role: UserRole.TECHNICIAN,
      isActive: true,
      ...companyFilter(scope),
      ...(scope.role === UserRole.OFFICE_ADMIN && scope.branchId ? { branchId: validObjectId(scope.branchId, "Invalid branch id") } : {}),
    };

    const technicians = await User.find(userFilter);

    const profiles = await TechnicianProfile.find({
      userId: {
        $in: technicians.map(
          (technician) => technician._id
        ),
      },
      ...companyFilter(scope),
      ...(scope.role === UserRole.OFFICE_ADMIN && scope.branchId ? { branchId: validObjectId(scope.branchId, "Invalid branch id") } : {}),
    });

    const profileByUserId = new Map(
      profiles.map((profile) => [
        profile.userId.toString(),
        profile,
      ])
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const technicianIds = technicians.map((technician) => technician._id);
    const scopeCompany = companyFilter(scope);
    const scopedBranch = scope.role === UserRole.OFFICE_ADMIN && scope.branchId ? { branchId: validObjectId(scope.branchId, "Invalid branch id") } : {};

    const [todayJobs, totalCompleted, ratings, mileage] = await Promise.all([
      Project.aggregate([
        { $match: { assignedTechnicianId: { $in: technicianIds }, scheduledDate: { $gte: todayStart, $lte: todayEnd }, ...scopeCompany, ...scopedBranch } },
        { $group: { _id: "$assignedTechnicianId", assigned: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", ProjectStatus.COMPLETED] }, 1, 0] } } } },
      ]),
      Project.aggregate([
        { $match: { assignedTechnicianId: { $in: technicianIds }, status: ProjectStatus.COMPLETED, ...scopeCompany, ...scopedBranch } },
        { $group: { _id: "$assignedTechnicianId", count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        { $match: { technicianId: { $in: technicianIds }, ...scopeCompany, ...scopedBranch } },
        { $group: { _id: "$technicianId", average: { $avg: "$rating" } } },
      ]),
      DutyLog.aggregate([
        { $match: { technicianId: { $in: technicianIds }, dutyStartAt: { $gte: todayStart, $lte: todayEnd }, ...scopeCompany } },
        { $group: { _id: "$technicianId", distance: { $sum: { $ifNull: ["$distanceKm", 0] } } } },
      ]),
    ]);

    const todayMap = new Map(todayJobs.map((row: any) => [row._id.toString(), row]));
    const completedMap = new Map(totalCompleted.map((row: any) => [row._id.toString(), row.count as number]));
    const ratingMap = new Map(ratings.map((row: any) => [row._id.toString(), Number(row.average)]));
    const mileageMap = new Map(mileage.map((row: any) => [row._id.toString(), Number(row.distance)]));

    const result: TechnicianListItem[] = [];
    for (const user of technicians) {
      const profile = profileByUserId.get(user._id.toString());
      if (!profile) continue;
      const key = user._id.toString();
      const today = todayMap.get(key) as any;
      result.push({
        user,
        profile,
        performance: {
          todayAssignedJobs: Number(today?.assigned ?? 0),
          completedToday: Number(today?.completed ?? 0),
          totalCompletedJobs: Number(completedMap.get(key) ?? 0),
          averageRating: ratingMap.has(key) ? Number(ratingMap.get(key)?.toFixed(1)) : undefined,
          distanceTodayKm: Number((mileageMap.get(key) ?? 0).toFixed(1)),
        },
      });
    }

    return result;
  },

  async getById(
    technicianId: string,
    scope: CallerScope
  ) {
    const technicianObjectId = validObjectId(
      technicianId,
      "Technician not found"
    );

    const userFilter: Record<string, unknown> = {
      _id: technicianObjectId,
      role: UserRole.TECHNICIAN,
      ...companyFilter(scope),
    };

    const user = await User.findOne(
      userFilter
    ).select(
      "-passwordHash -failedLoginAttempts -lockedUntil -tokenVersion"
    );

    if (!user) {
      throw ApiError.notFound(
        "Technician not found"
      );
    }

    const profile =
      await TechnicianProfile.findOne({
        userId: user._id,
        ...companyFilter(scope),
      });

    if (!profile) {
      throw ApiError.notFound(
        "Technician profile not found"
      );
    }

    const branch = user.branchId
      ? await Branch.findOne({
          _id: user.branchId,
          ...companyFilter(scope),
        })
      : null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const projectCompanyFilter =
      companyFilter(scope);

    const [
      todayAssignedJobs,
      totalCompletedJobs,
    ] = await Promise.all([
      Project.countDocuments({
        assignedTechnicianId: user._id,
        scheduledDate: {
          $gte: todayStart,
          $lte: todayEnd,
        },
        ...projectCompanyFilter,
      }),

      Project.countDocuments({
        assignedTechnicianId: user._id,
        status: ProjectStatus.COMPLETED,
        ...projectCompanyFilter,
      }),
    ]);

    return {
      id: user._id.toString(),
      name: user.name,
      employeeCode: profile.employeeCode,
      phone: user.phone,
      email: user.email ?? null,
      dutyStatus: profile.currentDutyStatus,
      vehicleNumber: profile.vehicleNumber,
      skills: profile.skills,

      branch: branch
        ? {
            id: branch._id.toString(),
            name: branch.name,
            city: branch.city,
            state: branch.state,
            isActive: branch.isActive,
          }
        : null,

      createdAt: user.createdAt,
      isActive: user.isActive,

      stats: {
        todayAssignedJobs,
        totalCompletedJobs,
      },
    };
  },

  async getOwnProfile(
    userId: string,
    scope: CallerScope
  ): Promise<ITechnicianProfile> {
    const userObjectId = validObjectId(
      userId,
      "Invalid user id"
    );

    const profile =
      await TechnicianProfile.findOne({
        userId: userObjectId,
        ...companyFilter(scope),
      });

    if (!profile) {
      throw ApiError.notFound(
        "Technician profile not found"
      );
    }

    return profile;
  },

  async startDuty(
    technicianId: string,
    scope: CallerScope,
    odometerStartInput: unknown
  ): Promise<ITechnicianProfile> {
    const technicianObjectId = validObjectId(
      technicianId,
      "Invalid technician id"
    );

    const odometerStart = validateOdometer(
      odometerStartInput,
      "odometerStart"
    );

    const now = new Date();

    const updated =
      await TechnicianProfile.findOneAndUpdate(
        {
          userId: technicianObjectId,
          currentDutyStatus: DutyStatus.OFF_DUTY,
          ...companyFilter(scope),
        },
        {
          $set: {
            currentDutyStatus:
              DutyStatus.ON_DUTY_IDLE,
            lastStatusChangeAt: now,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      const exists =
        await TechnicianProfile.exists({
          userId: technicianObjectId,
          ...companyFilter(scope),
        });

      throw exists
        ? ApiError.badRequest(
            "Duty is already active"
          )
        : ApiError.notFound(
            "Technician profile not found"
          );
    }

    await DutyLog.create({
      companyId: updated.companyId,
      technicianId: technicianObjectId,
      dutyStartAt: now,
      odometerStart,
    });

    return updated;
  },

  async endDuty(
    technicianId: string,
    scope: CallerScope,
    odometerEndInput: unknown
  ): Promise<ITechnicianProfile> {
    const technicianObjectId = validObjectId(
      technicianId,
      "Invalid technician id"
    );

    const odometerEnd = validateOdometer(
      odometerEndInput,
      "odometerEnd"
    );

    const openLog =
      await DutyLog.findOne({
        technicianId: technicianObjectId,
        dutyEndAt: {
          $exists: false,
        },
        ...companyFilter(scope),
      }).sort({
        dutyStartAt: -1,
      });

    if (!openLog) {
      throw ApiError.badRequest(
        "No active duty log found"
      );
    }

    if (odometerEnd < openLog.odometerStart) {
      throw ApiError.badRequest(
        "Odometer end cannot be less than odometer start"
      );
    }

    const now = new Date();

    const updated =
      await TechnicianProfile.findOneAndUpdate(
        {
          userId: technicianObjectId,
          currentDutyStatus: {
            $ne: DutyStatus.OFF_DUTY,
          },
          ...companyFilter(scope),
        },
        {
          $set: {
            currentDutyStatus:
              DutyStatus.OFF_DUTY,
            lastStatusChangeAt: now,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      const exists =
        await TechnicianProfile.exists({
          userId: technicianObjectId,
          ...companyFilter(scope),
        });

      throw exists
        ? ApiError.badRequest(
            "Duty is not currently active"
          )
        : ApiError.notFound(
            "Technician profile not found"
          );
    }

    openLog.dutyEndAt = now;
    openLog.odometerEnd = odometerEnd;
    openLog.distanceKm =
      odometerEnd - openLog.odometerStart;

    await openLog.save();

    return updated;
  },
};