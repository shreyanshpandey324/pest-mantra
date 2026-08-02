import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import { User, UserRole } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    branchId?: string;
  };
}

/**
 * Verifies the access token and attaches a minimal, trusted
 * identity to req.user. Every protected route relies on this
 * having run first — it is the single source of truth for
 * "who is making this request", never a client-supplied field.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      throw ApiError.unauthorized("Authentication token missing");
    }

    const payload = verifyAccessToken(token);

    // Re-check the user still exists and is active on every request.
    // A revoked/deactivated user's old access token stops working
    // within its own short lifetime the moment we look them up again
    // (and immediately once it expires and refresh is attempted).
    const user = await User.findById(payload.sub).select("_id role branchId isActive");
    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Account is inactive or no longer exists");
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      branchId: user.branchId?.toString(),
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

/**
 * Role gate. Usage: requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN)
 * Must run after `authenticate`.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
