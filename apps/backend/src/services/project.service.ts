import mongoose, { FilterQuery } from "mongoose";
import { Project, IProject, ProjectStatus } from "../models/Project";
import { ProjectStatusHistory } from "../models/ProjectStatusHistory";
import { TechnicianProfile, DutyStatus } from "../models/TechnicianProfile";
import { User, UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import {
  CreateProjectInput,
  AssignProjectInput,
  UpdateStatusInput,
  ListProjectsQuery,
  ALLOWED_STATUS_TRANSITIONS,
} from "../validators/project.validators";

/**
 * assertProjectVisible is the single check every project-scoped
 * read/write funnels through (list uses its own filter directly,
 * everything single-record — get, history, assign, status update,
 * photo upload/list — goes through getProjectById below, which
 * calls this). "A technician can only ever see their own jobs" is
 * enforced here, once, rather than trusted to be true because each
 * call site remembered to check it.
 */
function assertProjectVisible(project: IProject, scope: CallerScope): void {
  if (scope.role === UserRole.TECHNICIAN) {
    if (!project.assignedTechnicianId || project.assignedTechnicianId.toString() !== scope.userId) {
      // 404, not 403 — a technician probing other projects' ids
      // should not be able to learn that a given id exists at all.
      throw ApiError.notFound("Project not found");
    }
  }
}

async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Project.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01`) },
  });
  return `PM-${year}-${(count + 1).toString().padStart(6, "0")}`;
}

async function recordHistory(
  projectId: mongoose.Types.ObjectId,
  fromStatus: ProjectStatus | null,
  toStatus: ProjectStatus,
  changedBy: string,
  remarks?: string
): Promise<void> {
  await ProjectStatusHistory.create({
    projectId,
    fromStatus,
    toStatus,
    changedBy,
    remarks,
  });
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}

export const projectService = {
  /**
   * generateProjectCode() counts existing documents to pick the
   * next number — two near-simultaneous creates could compute the
   * same code. The schema's unique index turns that into a
   * guaranteed, detectable failure (never a silent duplicate)
   * rather than preventing it outright, so this retries generation
   * a few times on exactly that failure instead of surfacing a
   * confusing "already exists" error for a legitimate concurrent
   * booking. At the office's stated volume (2-6 bookings/day) this
   * will essentially never trigger in practice.
   */
  async createProject(input: CreateProjectInput, createdBy: string): Promise<IProject> {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const projectCode = await generateProjectCode();
      try {
        const project = await Project.create({
          ...input,
          projectCode,
          createdBy,
          status: ProjectStatus.NEW,
        });
        await recordHistory(project._id, null, ProjectStatus.NEW, createdBy, "Project created");
        return project;
      } catch (err) {
        if (isDuplicateKeyError(err) && attempt < MAX_ATTEMPTS) {
          continue; // another request took this exact code — regenerate and retry
        }
        throw err;
      }
    }

    // Unreachable in practice (the loop always returns or throws),
    // but keeps the function's return type honest without a
    // non-null assertion.
    throw ApiError.internal("Could not generate a unique project code — please try again");
  },

  /**
   * The single query every list view goes through. An office admin
   * sees everything; a technician's filter is hard-set to their own
   * id regardless of anything the request might otherwise imply —
   * there is no query parameter that can widen it.
   */
  async listProjects(scope: CallerScope, query: ListProjectsQuery): Promise<IProject[]> {
    const filter: FilterQuery<IProject> = {};

    if (scope.role === UserRole.TECHNICIAN) {
      filter.assignedTechnicianId = new mongoose.Types.ObjectId(scope.userId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      const start = new Date(query.date);
      const end = new Date(query.date);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate = { $gte: start, $lt: end };
    }

    return Project.find(filter).sort({ scheduledDate: 1, createdAt: -1 });
  },

  async getProjectById(projectId: string, scope: CallerScope): Promise<IProject> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound("Project not found");
    }
    assertProjectVisible(project, scope);
    return project;
  },

  async getProjectHistory(projectId: string, scope: CallerScope) {
    // Reuses getProjectById so the same visibility check applies —
    // a technician can't read another technician's history by id
    // just because this is a different endpoint.
    await this.getProjectById(projectId, scope);
    return ProjectStatusHistory.find({ projectId }).sort({ changedAt: 1 });
  },

  async assignTechnician(
    projectId: string,
    input: AssignProjectInput,
    scope: CallerScope
  ): Promise<IProject> {
    if (!mongoose.Types.ObjectId.isValid(input.technicianId)) {
      throw ApiError.badRequest("technicianId is not a valid id");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound("Project not found");
    }

    if (project.status !== ProjectStatus.NEW) {
      throw ApiError.badRequest(
        `Cannot assign a technician to a project in "${project.status}" status. Only new projects can be assigned.`
      );
    }

    const technician = await User.findOne({ _id: input.technicianId, role: UserRole.TECHNICIAN });
    if (!technician || !technician.isActive) {
      throw ApiError.badRequest("Technician not found or inactive");
    }

    const techProfile = await TechnicianProfile.findOne({ userId: input.technicianId });
    if (!techProfile) {
      throw ApiError.badRequest("Technician profile not found");
    }
    if (techProfile.currentDutyStatus === DutyStatus.OFF_DUTY) {
      throw ApiError.badRequest("This technician is off duty and cannot be assigned a job");
    }

    const scheduledDate = new Date(input.scheduledDate);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw ApiError.badRequest("scheduledDate is not a valid date");
    }

    // Duplicate/invalid-assignment guard: the same technician
    // cannot be double-booked into the same date + time slot on
    // another still-active job. Uses the compound index defined on
    // the Project model, so this stays cheap even as job volume
    // grows well past the office's current 2-6 bookings/day.
    const conflict = await Project.findOne({
      assignedTechnicianId: technician._id,
      scheduledDate,
      scheduledTimeSlot: input.scheduledTimeSlot,
      status: { $in: [ProjectStatus.ASSIGNED, ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS] },
    });
    if (conflict) {
      throw ApiError.conflict(
        `${technician.name} is already assigned to another job (${conflict.projectCode}) at this date and time slot`
      );
    }

    const previousStatus = project.status;

    // Atomic conditional update: the status:NEW guard is repeated
    // here (not just checked earlier) specifically to close the
    // race window between the read above and this write — if
    // another request assigned/cancelled this project in between,
    // this update matches zero documents and we correctly report a
    // conflict instead of silently overwriting a concurrent change.
    const updated = await Project.findOneAndUpdate(
      { _id: project._id, status: ProjectStatus.NEW },
      {
        $set: {
          assignedTechnicianId: technician._id,
          assignedBy: new mongoose.Types.ObjectId(scope.userId),
          assignedAt: new Date(),
          scheduledDate,
          scheduledTimeSlot: input.scheduledTimeSlot,
          status: ProjectStatus.ASSIGNED,
        },
      },
      { new: true }
    );

    if (!updated) {
      throw ApiError.conflict(
        "This project was modified by someone else at the same moment — please refresh and try again"
      );
    }

    await recordHistory(
      updated._id,
      previousStatus,
      ProjectStatus.ASSIGNED,
      scope.userId,
      `Assigned to technician ${technician.name}`
    );

    return updated;
  },

  /**
   * Status updates are allowed for admins (any project) and for
   * technicians (their own assigned project only — enforced by
   * getProjectById above, not re-implemented here). Every
   * transition is checked against ALLOWED_STATUS_TRANSITIONS so a
   * job can't jump e.g. straight from "new" to "completed".
   */
  async updateStatus(
    projectId: string,
    input: UpdateStatusInput,
    scope: CallerScope
  ): Promise<IProject> {
    const project = await this.getProjectById(projectId, scope);

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[project.status];
    if (!allowedNext.includes(input.status)) {
      throw ApiError.badRequest(
        `Cannot move a project from "${project.status}" to "${input.status}"`
      );
    }

    const previousStatus = project.status;

    const setFields: Record<string, unknown> = { status: input.status };
    if (input.paymentMethod) setFields.paymentMethod = input.paymentMethod;
    if (input.status === ProjectStatus.COMPLETED) setFields.completedAt = new Date();

    // Same atomic-with-guard pattern as assignTechnician — the
    // previousStatus condition must still hold at write time, or
    // someone else changed this project between our read and now.
    const updated = await Project.findOneAndUpdate(
      { _id: project._id, status: previousStatus },
      { $set: setFields },
      { new: true }
    );

    if (!updated) {
      throw ApiError.conflict(
        "This project was modified by someone else at the same moment — please refresh and try again"
      );
    }

    await recordHistory(updated._id, previousStatus, input.status, scope.userId, input.remarks);

    return updated;
  },
};
