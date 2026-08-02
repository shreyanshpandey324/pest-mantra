import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { projectService } from "../services/project.service";
import { getCallerScope } from "../utils/callerScope";
import {
  CreateProjectInput,
  AssignProjectInput,
  UpdateStatusInput,
  ListProjectsQuery,
} from "../validators/project.validators";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const projectController = {
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as CreateProjectInput;
    const project = await projectService.createProject(input, scope.userId);
    sendSuccess(res, 201, "Project created", { project });
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const query = req.query as unknown as ListProjectsQuery;
    const projects = await projectService.listProjects(scope, query);
    sendSuccess(res, 200, "Projects", { projects });
  }),

  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const project = await projectService.getProjectById(req.params.id, scope);
    sendSuccess(res, 200, "Project", { project });
  }),

  getHistory: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const history = await projectService.getProjectHistory(req.params.id, scope);
    sendSuccess(res, 200, "Project history", { history });
  }),

  assign: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as AssignProjectInput;
    const project = await projectService.assignTechnician(req.params.id, input, scope);
    sendSuccess(res, 200, "Technician assigned successfully", { project });
  }),

  updateStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const input = req.body as UpdateStatusInput;
    const project = await projectService.updateStatus(req.params.id, input, scope);
    sendSuccess(res, 200, "Project status updated", { project });
  }),
};
