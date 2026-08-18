import mongoose, {
  FilterQuery,
} from "mongoose";
import fs from "fs/promises";
import path from "path";

import {
  Project,
  IProject,
  ProjectStatus,
} from "../models/Project";

import {
  ProjectStatusHistory,
} from "../models/ProjectStatusHistory";

import {
  ProjectChemicalUsage,
} from "../models/ProjectChemicalUsage";

import {
  ProjectPhoto,
} from "../models/ProjectPhoto";

import {
  TechnicianProfile,
  DutyStatus,
} from "../models/TechnicianProfile";

import {
  User,
  UserRole,
} from "../models/User";

import {
  Branch,
} from "../models/Branch";

import {
  ApiError,
} from "../utils/ApiError";

import {
  CallerScope,
} from "../utils/callerScope";

import {
  UPLOAD_DIR,
} from "../middleware/upload.middleware";

import {
  CreateProjectInput,
  AssignProjectInput,
  UpdateStatusInput,
  ListProjectsQuery,
  ALLOWED_STATUS_TRANSITIONS,
} from "../validators/project.validators";

/*
|--------------------------------------------------------------------------
| Tenant / authorization helpers
|--------------------------------------------------------------------------
*/

function tenantFilter(
  scope: CallerScope
): FilterQuery<IProject> {
  if (scope.role === UserRole.SUPER_ADMIN) {
    return {};
  }

  if (!scope.companyId) {
    throw ApiError.forbidden(
      "Your account is not linked to a company"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(scope.companyId)) {
    throw ApiError.forbidden("Your company id is invalid");
  }

  const filter: FilterQuery<IProject> = {
    companyId: new mongoose.Types.ObjectId(scope.companyId),
  };

  if (!scope.branchId) {
    throw ApiError.forbidden(
      "Your account is not linked to a branch"
    );
  }

  if (!mongoose.Types.ObjectId.isValid(scope.branchId)) {
    throw ApiError.forbidden("Your branch id is invalid");
  }

  filter.branchId = new mongoose.Types.ObjectId(scope.branchId);
  return filter;
}

function assertProjectVisible(
  project: IProject,
  scope: CallerScope
): void {
  if (scope.role !== UserRole.SUPER_ADMIN) {
    if (!scope.companyId || !project.companyId || project.companyId.toString() !== scope.companyId) {
      throw ApiError.notFound("Project not found");
    }

    if (!scope.branchId || !project.branchId || project.branchId.toString() !== scope.branchId) {
      throw ApiError.notFound("Project not found");
    }
  }

  if (scope.role === UserRole.TECHNICIAN) {
    if (!project.assignedTechnicianId || project.assignedTechnicianId.toString() !== scope.userId) {
      throw ApiError.notFound("Project not found");
    }
  }
}

/*
|--------------------------------------------------------------------------
| Project code
|--------------------------------------------------------------------------
*/

async function generateProjectCode(): Promise<string> {
  const year =
    new Date().getFullYear();

  const count =
    await Project.countDocuments({
      createdAt: {
        $gte: new Date(
          `${year}-01-01`
        ),
      },
    });

  return `PM-${year}-${(
    count + 1
  )
    .toString()
    .padStart(6, "0")}`;
}

/*
|--------------------------------------------------------------------------
| Creator company
|--------------------------------------------------------------------------
*/

async function getCreatorScope(
  createdBy: string
): Promise<{
  companyId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
}> {
  if (!mongoose.Types.ObjectId.isValid(createdBy)) {
    throw ApiError.unauthorized("Invalid creating user identity");
  }

  const creator = await User.findById(createdBy).select(
    "_id role companyId branchId"
  );

  if (!creator) {
    throw ApiError.unauthorized("Creating user no longer exists");
  }

  if (creator.role !== UserRole.SUPER_ADMIN && !creator.companyId) {
    throw ApiError.forbidden("Your account is not linked to a company");
  }

  if (creator.role !== UserRole.SUPER_ADMIN && !creator.branchId) {
    throw ApiError.forbidden("Your account is not linked to a branch");
  }

  return {
    companyId: creator.companyId,
    branchId: creator.branchId,
  };
}

async function validateBranchForProject(
  companyId: mongoose.Types.ObjectId,
  branchId: mongoose.Types.ObjectId
): Promise<void> {
  const branch = await Branch.findOne({
    _id: branchId,
    companyId,
    isActive: true,
  }).select("_id");

  if (!branch) {
    throw ApiError.badRequest(
      "Branch not found, inactive, or outside the selected company"
    );
  }
}

/*
|--------------------------------------------------------------------------
| History
|--------------------------------------------------------------------------
*/

async function recordHistory(
  projectId: mongoose.Types.ObjectId,
  fromStatus:
    | ProjectStatus
    | null,
  toStatus: ProjectStatus,
  changedBy: string,
  remarks?: string,
  companyId?:
    | mongoose.Types.ObjectId
    | null
): Promise<void> {
  await ProjectStatusHistory.create({
    companyId:
      companyId ?? undefined,

    projectId,

    fromStatus,

    toStatus,

    changedBy:
      new mongoose.Types.ObjectId(
        changedBy
      ),

    remarks,
  });
}

/*
|--------------------------------------------------------------------------
| Mongo duplicate-key detector
|--------------------------------------------------------------------------
*/

function isDuplicateKeyError(
  err: unknown
): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (
      err as {
        code: unknown;
      }
    ).code === 11000
  );
}

/*
|--------------------------------------------------------------------------
| Photo-file cleanup helpers
|--------------------------------------------------------------------------
*/

function safeUploadPath(
  filePath: string
): string {
  const uploadRoot =
    path.resolve(
      UPLOAD_DIR
    );

  const resolved =
    path.resolve(
      filePath
    );

  const relative =
    path.relative(
      uploadRoot,
      resolved
    );

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw ApiError.forbidden(
      "Invalid stored photo path"
    );
  }

  return resolved;
}

async function removePhotoFiles(
  storagePaths: string[]
): Promise<void> {
  for (
    const storagePath of storagePaths
  ) {
    try {
      const safePath =
        safeUploadPath(
          storagePath
        );

      await fs.unlink(
        safePath
      );
    } catch (err: unknown) {
      /*
       * A missing file is harmless.
       * Database cleanup should not fail
       * merely because the physical file
       * was already removed.
       */
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as {
          code?: string;
        }).code === "ENOENT"
      ) {
        continue;
      }
    }
  }
}

/*
|--------------------------------------------------------------------------
| Related-data cleanup
|--------------------------------------------------------------------------
*/

async function cleanupProjectData(
  projectIds: mongoose.Types.ObjectId[],
  companyId?: mongoose.Types.ObjectId
): Promise<void> {
  if (
    projectIds.length === 0
  ) {
    return;
  }

  const projectFilter:
    | FilterQuery<IProject>
    | Record<string, unknown> = {
    projectId: {
      $in: projectIds,
    },
  };

  if (companyId) {
    projectFilter.companyId =
      companyId;
  }

  /*
   * Get physical photo paths before
   * deleting photo records.
   */
  const photos =
    await ProjectPhoto.find(
      projectFilter
    ).select(
      "+storagePath"
    );

  const storagePaths =
    photos
      .map(
        (photo) =>
          photo.storagePath
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      );

  /*
   * Delete related MongoDB records.
   */
  await Promise.all([
    ProjectStatusHistory.deleteMany(
      projectFilter
    ),

    ProjectChemicalUsage.deleteMany(
      projectFilter
    ),

    ProjectPhoto.deleteMany(
      projectFilter
    ),
  ]);

  /*
   * Delete physical files after the
   * database records are removed.
   */
  await removePhotoFiles(
    storagePaths
  );
}

/*
|--------------------------------------------------------------------------
| Service
|--------------------------------------------------------------------------
*/

export const projectService = {
  /*
  |--------------------------------------------------------------------------
  | CREATE PROJECT
  |--------------------------------------------------------------------------
  */

  async createProject(
    input: CreateProjectInput,
    scope: CallerScope
  ): Promise<IProject> {
    const MAX_ATTEMPTS = 5;

    const creatorScope = await getCreatorScope(scope.userId);

    let companyId = creatorScope.companyId;
    let branchId = creatorScope.branchId;

    if (scope.role === UserRole.SUPER_ADMIN) {
      if (input.companyId) {
        if (!mongoose.Types.ObjectId.isValid(input.companyId)) {
          throw ApiError.badRequest("companyId is invalid");
        }
        companyId = new mongoose.Types.ObjectId(input.companyId);
      }

      if (input.branchId) {
        if (!companyId) {
          throw ApiError.badRequest("companyId is required when branchId is provided");
        }
        if (!mongoose.Types.ObjectId.isValid(input.branchId)) {
          throw ApiError.badRequest("branchId is invalid");
        }
        branchId = new mongoose.Types.ObjectId(input.branchId);
      }
    } else {
      if (input.companyId && input.companyId !== companyId?.toString()) {
        throw ApiError.forbidden("You cannot create a project outside your company");
      }
      if (input.branchId && input.branchId !== branchId?.toString()) {
        throw ApiError.forbidden("You cannot create a project outside your branch");
      }
    }

    if (companyId && branchId) {
      await validateBranchForProject(companyId, branchId);
    }

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS;
      attempt++
    ) {
      const projectCode =
        await generateProjectCode();

      try {
        const project =
          await Project.create({
            ...input,

            companyId,
            branchId,

            projectCode,

            createdBy:
              new mongoose.Types.ObjectId(
                scope.userId
              ),

            status:
              ProjectStatus.NEW,
          });

        await recordHistory(
          project._id,
          null,
          ProjectStatus.NEW,
          scope.userId,
          "Project created",
          companyId
        );

        return project;
      } catch (err) {
        if (
          isDuplicateKeyError(err) &&
          attempt < MAX_ATTEMPTS
        ) {
          continue;
        }

        throw err;
      }
    }

    throw ApiError.internal(
      "Could not generate a unique project code. Please try again."
    );
  },

  /*
  |--------------------------------------------------------------------------
  | LIST PROJECTS
  |--------------------------------------------------------------------------
  */

  async listProjects(
    scope: CallerScope,
    query: ListProjectsQuery
  ): Promise<IProject[]> {
    const filter:
      FilterQuery<IProject> = {
      ...tenantFilter(scope),
    };

    if (
      scope.role ===
      UserRole.TECHNICIAN
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          scope.userId
        )
      ) {
        throw ApiError.unauthorized(
          "Invalid user identity"
        );
      }

      filter.assignedTechnicianId =
        new mongoose.Types.ObjectId(
          scope.userId
        );
    }

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.date) {
      const start =
        new Date(
          query.date
        );

      if (
        Number.isNaN(
          start.getTime()
        )
      ) {
        throw ApiError.badRequest(
          "date is not a valid date"
        );
      }

      start.setHours(
        0,
        0,
        0,
        0
      );

      const end =
        new Date(start);

      end.setDate(
        end.getDate() + 1
      );

      filter.scheduledDate = {
        $gte: start,
        $lt: end,
      };
    }

    return Project.find(
      filter
    ).sort({
      scheduledDate: 1,
      createdAt: -1,
    });
  },

  /*
  |--------------------------------------------------------------------------
  | GET PROJECT
  |--------------------------------------------------------------------------
  */

  async getProjectById(
    projectId: string,
    scope: CallerScope
  ): Promise<IProject> {
    if (
      !mongoose.Types.ObjectId.isValid(
        projectId
      )
    ) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    const project =
      await Project.findOne({
        _id: projectId,

        ...tenantFilter(scope),
      })
        .populate(
          "assignedTechnicianId",
          "name phone email companyId"
        )
        .populate(
          "assignedBy",
          "name"
        );

    if (!project) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    assertProjectVisible(
      project,
      scope
    );

    return project;
  },

  /*
  |--------------------------------------------------------------------------
  | PROJECT HISTORY
  |--------------------------------------------------------------------------
  */

  async getProjectHistory(
    projectId: string,
    scope: CallerScope
  ) {
    await this.getProjectById(
      projectId,
      scope
    );

    const filter:
      FilterQuery<
        typeof ProjectStatusHistory
      > = {
      projectId:
        new mongoose.Types.ObjectId(
          projectId
        ),
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      filter.companyId =
        new mongoose.Types.ObjectId(
          scope.companyId
        );
    }

    return ProjectStatusHistory.find(
      filter
    )
      .populate(
        "changedBy",
        "name phone role"
      )
      .sort({
        changedAt: 1,
      });
  },

  /*
  |--------------------------------------------------------------------------
  | ASSIGN TECHNICIAN
  |--------------------------------------------------------------------------
  */

  async assignTechnician(
    projectId: string,
    input: AssignProjectInput,
    scope: CallerScope
  ): Promise<IProject> {
    if (
      !mongoose.Types.ObjectId.isValid(
        input.technicianId
      )
    ) {
      throw ApiError.badRequest(
        "technicianId is not a valid id"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        projectId
      )
    ) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    if (
      scope.role !==
        UserRole.SUPER_ADMIN &&
      scope.role !==
        UserRole.OFFICE_ADMIN
    ) {
      throw ApiError.forbidden(
        "Only admins can assign technicians"
      );
    }

    const project =
      await Project.findOne({
        _id: projectId,

        ...tenantFilter(scope),
      });

    if (!project) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    if (
      project.status !==
      ProjectStatus.NEW
    ) {
      throw ApiError.badRequest(
        `Cannot assign a technician to a project in "${project.status}" status. Only new projects can be assigned.`
      );
    }

    const technicianFilter:
      FilterQuery<typeof User> = {
      _id:
        new mongoose.Types.ObjectId(
          input.technicianId
        ),

      role:
        UserRole.TECHNICIAN,

      isActive: true,
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      technicianFilter.companyId =
        new mongoose.Types.ObjectId(
          scope.companyId
        );

      if (!scope.branchId) {
        throw ApiError.forbidden("Your account is not linked to a branch");
      }

      technicianFilter.branchId = new mongoose.Types.ObjectId(scope.branchId);
    }

    const technician =
      await User.findOne(
        technicianFilter
      );

    if (!technician) {
      throw ApiError.badRequest(
        "Technician not found, inactive, or outside your company"
      );
    }

    if (
      project.companyId &&
      (
        !technician.companyId ||
        project.companyId.toString() !==
          technician.companyId.toString()
      )
    ) {
      throw ApiError.badRequest(
        "Technician does not belong to the project's company"
      );
    }

    if (
      project.companyId &&
      !technician.companyId
    ) {
      throw ApiError.badRequest(
        "Technician is not linked to a company"
      );
    }

    if (project.branchId) {
      if (!technician.branchId || technician.branchId.toString() !== project.branchId.toString()) {
        throw ApiError.badRequest(
          "Technician does not belong to the project's branch"
        );
      }
    }

    const profileFilter:
      FilterQuery<
        typeof TechnicianProfile
      > = {
      userId:
        technician._id,
    };

    if (technician.companyId) {
      profileFilter.companyId = technician.companyId;
    }

    if (technician.branchId) {
      profileFilter.branchId = technician.branchId;
    }

    const technicianProfile =
      await TechnicianProfile.findOne(
        profileFilter
      );

    if (!technicianProfile) {
      throw ApiError.badRequest(
        "Technician profile not found"
      );
    }

    if (
      technicianProfile.currentDutyStatus ===
      DutyStatus.OFF_DUTY
    ) {
      throw ApiError.badRequest(
        "This technician is off duty and cannot be assigned a job"
      );
    }

    const scheduledDate =
      new Date(
        input.scheduledDate
      );

    if (
      Number.isNaN(
        scheduledDate.getTime()
      )
    ) {
      throw ApiError.badRequest(
        "scheduledDate is not a valid date"
      );
    }

    const conflictFilter:
      FilterQuery<IProject> = {
      assignedTechnicianId:
        technician._id,

      scheduledDate,

      scheduledTimeSlot:
        input.scheduledTimeSlot,

      status: {
        $in: [
          ProjectStatus.ASSIGNED,
          ProjectStatus.EN_ROUTE,
          ProjectStatus.IN_PROGRESS,
        ],
      },
    };

    if (
      project.companyId
    ) {
      conflictFilter.companyId =
        project.companyId;
    }

    const conflict =
      await Project.findOne(
        conflictFilter
      );

    if (conflict) {
      throw ApiError.conflict(
        `${technician.name} is already assigned to another job (${conflict.projectCode}) at this date and time slot`
      );
    }

    const updated =
      await Project.findOneAndUpdate(
        {
          _id: project._id,

          status:
            ProjectStatus.NEW,

          ...tenantFilter(scope),
        },
        {
          $set: {
            assignedTechnicianId:
              technician._id,

            assignedBy:
              new mongoose.Types.ObjectId(
                scope.userId
              ),

            assignedAt:
              new Date(),

            scheduledDate,

            scheduledTimeSlot:
              input.scheduledTimeSlot,

            status:
              ProjectStatus.ASSIGNED,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      throw ApiError.conflict(
        "This project was modified by someone else at the same moment. Please refresh and try again."
      );
    }

    await recordHistory(
      updated._id,
      ProjectStatus.NEW,
      ProjectStatus.ASSIGNED,
      scope.userId,
      `Assigned to technician ${technician.name}`,
      updated.companyId
    );

    return updated;
  },

  /*
  |--------------------------------------------------------------------------
  | UPDATE STATUS
  |--------------------------------------------------------------------------
  */

  async updateStatus(
    projectId: string,
    input: UpdateStatusInput,
    scope: CallerScope
  ): Promise<IProject> {
    const project =
      await this.getProjectById(
        projectId,
        scope
      );

    const allowedNext =
      ALLOWED_STATUS_TRANSITIONS[
        project.status
      ];

    if (
      !allowedNext ||
      !allowedNext.includes(
        input.status
      )
    ) {
      throw ApiError.badRequest(
        `Cannot move a project from "${project.status}" to "${input.status}"`
      );
    }

    const previousStatus =
      project.status;

    const setFields: Record<
      string,
      unknown
    > = {
      status:
        input.status,
    };

    if (
      input.paymentMethod
    ) {
      setFields.paymentMethod =
        input.paymentMethod;
    }

    if (
      input.status ===
      ProjectStatus.COMPLETED
    ) {
      setFields.completedAt =
        new Date();
    }

    if (
      input.status ===
      ProjectStatus.CANCELLED
    ) {
      setFields.completedAt =
        undefined;
    }

    const updated =
      await Project.findOneAndUpdate(
        {
          _id:
            project._id,

          status:
            previousStatus,

          ...tenantFilter(scope),
        },
        {
          $set:
            setFields,
        },
        {
          new: true,
        }
      );

    if (!updated) {
      throw ApiError.conflict(
        "This project was modified by someone else at the same moment. Please refresh and try again."
      );
    }

    await recordHistory(
      updated._id,
      previousStatus,
      input.status,
      scope.userId,
      input.remarks,
      updated.companyId
    );

    return updated;
  },

  /*
  |--------------------------------------------------------------------------
  | DELETE PROJECT
  |--------------------------------------------------------------------------
  */

  async deleteProject(
    projectId: string,
    scope: CallerScope
  ): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(
        projectId
      )
    ) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    if (
      scope.role !==
        UserRole.SUPER_ADMIN &&
      scope.role !==
        UserRole.OFFICE_ADMIN
    ) {
      throw ApiError.forbidden(
        "Only admins can delete projects"
      );
    }

    const project =
      await Project.findOne({
        _id: projectId,

        ...tenantFilter(scope),
      });

    if (!project) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    const deleted =
      await Project.deleteOne({
        _id:
          project._id,

        ...tenantFilter(scope),
      });

    if (
      deleted.deletedCount === 0
    ) {
      throw ApiError.conflict(
        "Project could not be deleted. Please refresh and try again."
      );
    }

    await cleanupProjectData(
      [project._id],
      project.companyId
    );
  },

  /*
  |--------------------------------------------------------------------------
  | DELETE ALL PROJECTS
  |--------------------------------------------------------------------------
  |
  | Testing/admin maintenance operation.
  | Always requires company context.
  |
  */

  async deleteAllProjects(
    scope: CallerScope
  ): Promise<number> {
    if (scope.role !== UserRole.SUPER_ADMIN && scope.role !== UserRole.OFFICE_ADMIN) {
      throw ApiError.forbidden("Only admins can delete projects");
    }

    const filter: FilterQuery<IProject> = tenantFilter(scope);

    const projects = await Project.find(filter).select("_id companyId");
    const projectIds = projects.map((project) => project._id);

    if (projectIds.length === 0) {
      return 0;
    }

    const deleted = await Project.deleteMany(filter);

    await cleanupProjectData(
      projectIds,
      scope.role === UserRole.SUPER_ADMIN ? undefined : new mongoose.Types.ObjectId(scope.companyId!)
    );

    return deleted.deletedCount;
  }
};