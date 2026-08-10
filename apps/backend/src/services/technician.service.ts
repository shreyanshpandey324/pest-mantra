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
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";

export interface TechnicianListItem {
  user: IUser;
  profile: ITechnicianProfile;
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

export const technicianService = {
  /**
   * Admin-facing technician list.
   *
   * A company admin can ONLY see technicians
   * belonging to their own company.
   */
  async listTechnicians(
    scope: CallerScope
  ): Promise<TechnicianListItem[]> {
    const userFilter: Record<string, unknown> = {
      role: UserRole.TECHNICIAN,
      isActive: true,
      ...companyFilter(scope),
    };

    const technicians = await User.find(
      userFilter
    );

    const profiles = await TechnicianProfile.find({
      userId: {
        $in: technicians.map(
          (technician) => technician._id
        ),
      },
      ...companyFilter(scope),
    });

    const profileByUserId =
      new Map(
        profiles.map((profile) => [
          profile.userId.toString(),
          profile,
        ])
      );

    const result: TechnicianListItem[] = [];

    for (const user of technicians) {
      const profile =
        profileByUserId.get(
          user._id.toString()
        );

      if (profile) {
        result.push({
          user,
          profile,
        });
      }
    }

    return result;
  },

  /**
   * Get one technician.
   *
   * Company admins cannot access a technician
   * belonging to another company.
   */
  async getById(
    technicianId: string,
    scope: CallerScope
  ) {
    const technicianObjectId =
      validObjectId(
        technicianId,
        "Technician not found"
      );

    const userFilter: Record<
      string,
      unknown
    > = {
      _id: technicianObjectId,
      role: UserRole.TECHNICIAN,
      ...companyFilter(scope),
    };

    const user =
      await User.findOne(
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
    todayStart.setHours(
      0,
      0,
      0,
      0
    );

    const todayEnd = new Date();
    todayEnd.setHours(
      23,
      59,
      59,
      999
    );

    const projectCompanyFilter =
      companyFilter(scope);

    const [
      todayAssignedJobs,
      totalCompletedJobs,
    ] = await Promise.all([
      Project.countDocuments({
        assignedTechnicianId:
          user._id,
        scheduledDate: {
          $gte: todayStart,
          $lte: todayEnd,
        },
        ...projectCompanyFilter,
      }),

      Project.countDocuments({
        assignedTechnicianId:
          user._id,
        status:
          ProjectStatus.COMPLETED,
        ...projectCompanyFilter,
      }),
    ]);

    return {
      id: user._id.toString(),
      name: user.name,
      employeeCode:
        profile.employeeCode,
      phone: user.phone,
      email:
        user.email ?? null,

      dutyStatus:
        profile.currentDutyStatus,

      vehicleNumber:
        profile.vehicleNumber,

      skills:
        profile.skills,

      branch: branch
        ? {
            id: branch._id.toString(),
            name: branch.name,
            city: branch.city,
            state: branch.state,
            isActive:
              branch.isActive,
          }
        : null,

      createdAt:
        user.createdAt,

      isActive:
        user.isActive,

      stats: {
        todayAssignedJobs,
        totalCompletedJobs,
      },
    };
  },

  /**
   * Technician's own profile.
   *
   * The userId comes from the verified JWT,
   * never from client input.
   */
  async getOwnProfile(
    userId: string,
    scope: CallerScope
  ): Promise<ITechnicianProfile> {
    const userObjectId =
      validObjectId(
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

  /**
   * Start duty.
   */
  async startDuty(
    technicianId: string,
    scope: CallerScope
  ): Promise<ITechnicianProfile> {
    const technicianObjectId =
      validObjectId(
        technicianId,
        "Invalid technician id"
      );

    const now = new Date();

    const updated =
      await TechnicianProfile.findOneAndUpdate(
        {
          userId:
            technicianObjectId,
          currentDutyStatus:
            DutyStatus.OFF_DUTY,
          ...companyFilter(scope),
        },
        {
          $set: {
            currentDutyStatus:
              DutyStatus.ON_DUTY_IDLE,
            lastStatusChangeAt:
              now,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      const exists =
        await TechnicianProfile.exists({
          userId:
            technicianObjectId,
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
      technicianId:
        technicianObjectId,
      dutyStartAt: now,
    });

    return updated;
  },

  /**
   * End duty.
   */
  async endDuty(
    technicianId: string,
    scope: CallerScope
  ): Promise<ITechnicianProfile> {
    const technicianObjectId =
      validObjectId(
        technicianId,
        "Invalid technician id"
      );

    const now = new Date();

    const updated =
      await TechnicianProfile.findOneAndUpdate(
        {
          userId:
            technicianObjectId,
          currentDutyStatus: {
            $ne: DutyStatus.OFF_DUTY,
          },
          ...companyFilter(scope),
        },
        {
          $set: {
            currentDutyStatus:
              DutyStatus.OFF_DUTY,
            lastStatusChangeAt:
              now,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      const exists =
        await TechnicianProfile.exists({
          userId:
            technicianObjectId,
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

    const openLog =
      await DutyLog.findOne({
        technicianId:
          technicianObjectId,
        dutyEndAt: {
          $exists: false,
        },
        ...companyFilter(scope),
      }).sort({
        dutyStartAt: -1,
      });

    if (openLog) {
      openLog.dutyEndAt = now;
      await openLog.save();
    }

    return updated;
  },
};