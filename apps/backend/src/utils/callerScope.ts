import { ApiError } from "./ApiError";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

export interface CallerScope {
  role: UserRole;
  userId: string;
}

/**
 * Every controller that touches project/photo data needs the same
 * three lines: pull the verified identity off req.user, or reject
 * if somehow missing. This was previously copy-pasted identically
 * into project.controller.ts and photo.controller.ts — now it's
 * one function both import.
 */
export function getCallerScope(req: AuthenticatedRequest): CallerScope {
  if (!req.user) throw ApiError.unauthorized();
  return { role: req.user.role, userId: req.user.id };
}
