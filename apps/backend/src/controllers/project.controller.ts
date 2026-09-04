import { Response } from "express";

import {
  asyncHandler,
} from "../utils/asyncHandler";

import {
  sendSuccess,
} from "../utils/ApiResponse";

import {
  ApiError,
} from "../utils/ApiError";

import {
  projectService,
} from "../services/project.service";

import {
  getCallerScope,
} from "../utils/callerScope";

import {
  CreateProjectInput,
  AssignProjectInput,
  UpdateStatusInput,
  ListProjectsQuery,
  RescheduleProjectInput,
  FailedVisitInput,
  ReassignProjectInput,
} from "../validators/project.validators";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

export const projectController = {
  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  create: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as CreateProjectInput;

      const project =
        await projectService.createProject(
          input,
          scope
        );

      sendSuccess(
        res,
        201,
        "Project created",
        {
          project,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | LIST
  |--------------------------------------------------------------------------
  */

  list: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const query =
        req.query as unknown as
          ListProjectsQuery;

      const projects =
        await projectService.listProjects(
          scope,
          query
        );

      sendSuccess(
        res,
        200,
        "Projects",
        {
          projects,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | GET BY ID
  |--------------------------------------------------------------------------
  */

  getById: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const project =
        await projectService.getProjectById(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Project",
        {
          project,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | HISTORY
  |--------------------------------------------------------------------------
  */

  getHistory: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const history =
        await projectService.getProjectHistory(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Project history",
        {
          history,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | ASSIGN TECHNICIAN
  |--------------------------------------------------------------------------
  */

  assign: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as AssignProjectInput;

      const project =
        await projectService.assignTechnician(
          req.params.id,
          input,
          scope
        );

      sendSuccess(
        res,
        200,
        "Technician assigned successfully",
        {
          project,
        }
      );
    }
  ),


  acknowledgeAssignment: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const project = await projectService.acknowledgeAssignment(req.params.id, getCallerScope(req));
    sendSuccess(res, 200, "Assignment acknowledged", { project });
  }),

  requestReschedule: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const project = await projectService.requestReschedule(req.params.id, req.body as RescheduleProjectInput, getCallerScope(req));
    sendSuccess(res, 200, "Reschedule request recorded", { project });
  }),

  failedVisit: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const project = await projectService.recordFailedVisit(req.params.id, req.body as FailedVisitInput, getCallerScope(req));
    sendSuccess(res, 200, "Failed visit recorded", { project });
  }),

  reassign: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const project = await projectService.reassignTechnician(req.params.id, req.body as ReassignProjectInput, getCallerScope(req));
    sendSuccess(res, 200, "Job handed over", { project });
  }),

  /*
  |--------------------------------------------------------------------------
  | UPDATE STATUS
  |--------------------------------------------------------------------------
  */

  updateStatus: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const input =
        req.body as UpdateStatusInput;

      const project =
        await projectService.updateStatus(
          req.params.id,
          input,
          scope
        );

      sendSuccess(
        res,
        200,
        "Project status updated",
        {
          project,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | DELETE ALL PROJECTS
  |--------------------------------------------------------------------------
  |
  | Testing-only operation.
  |
  | The service now handles:
  | - company restriction
  | - project deletion
  | - history cleanup
  | - chemical usage cleanup
  | - photo record cleanup
  | - physical photo cleanup
  |
  */

  deleteAll: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      if (!scope.companyId) {
        throw ApiError.badRequest(
          "Company context is required for this operation"
        );
      }

      const deletedCount =
        await projectService.deleteAllProjects(
          scope
        );

      sendSuccess(
        res,
        200,
        "All projects for the current company deleted",
        {
          deletedCount,
        }
      );
    }
  ),

  /*
  |--------------------------------------------------------------------------
  | DELETE PROJECT
  |--------------------------------------------------------------------------
  */

  delete: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      await projectService.deleteProject(
        req.params.id,
        scope
      );

      sendSuccess(
        res,
        200,
        "Project deleted successfully"
      );
    }
  ),
};