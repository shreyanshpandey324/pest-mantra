import { ApiError } from "./ApiError";
import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { UserRole } from "../models/User";

export interface CallerScope {
  role: UserRole;
  userId: string;
  companyId?: string;
  branchId?: string;
}

export function getCallerScope(
  req: AuthenticatedRequest
): CallerScope {
  if (!req.user) {
    throw ApiError.unauthorized();
  }

  return {
    role: req.user.role,
    userId: req.user.id,
    companyId: req.user.companyId,
    branchId: req.user.branchId,
  };
}