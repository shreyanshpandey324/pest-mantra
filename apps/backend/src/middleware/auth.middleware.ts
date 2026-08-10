import {
  NextFunction,
  Request,
  Response,
} from "express";

import { ApiError } from "../utils/ApiError";

import {
  verifyAccessToken,
} from "../utils/jwt";

import {
  User,
  UserRole,
} from "../models/User";

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
    role: UserRole;
    companyId?: string;
    branchId?: string;
  };
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATE
|--------------------------------------------------------------------------
|
| Authentication flow:
|
| 1. Read Bearer token.
| 2. Verify JWT signature + expiry.
| 3. Load the CURRENT user from MongoDB.
| 4. Reject deleted/deactivated accounts.
| 5. Build req.user from database values.
|
| Important:
| companyId and branchId are NOT trusted from
| the client or directly copied from request data.
| They come from the current database record.
|
*/
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authorization =
      req.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer "
      )
        ? authorization.slice(7).trim()
        : undefined;

    if (!token) {
      throw ApiError.unauthorized(
        "Authentication token missing"
      );
    }

    /*
     * verifyAccessToken throws when the
     * token is invalid or expired.
     */
    const payload =
      verifyAccessToken(token);

    if (!payload.sub) {
      throw ApiError.unauthorized(
        "Invalid authentication token"
      );
    }

    /*
     * Always load the current account.
     *
     * This means:
     * - deactivated users are immediately blocked
     * - current role is respected
     * - current company is respected
     * - current branch is respected
     *
     * We do not blindly trust old JWT claims
     * for authorization.
     */
    const user =
      await User.findById(
        payload.sub
      ).select(
        "_id role companyId branchId isActive"
      );

    if (
      !user ||
      !user.isActive
    ) {
      throw ApiError.unauthorized(
        "Account is inactive or no longer exists"
      );
    }

    /*
     * Build the authenticated identity
     * from the verified database record.
     */
    req.user = {
      id: user._id.toString(),

      role: user.role,

      companyId:
        user.companyId?.toString(),

      branchId:
        user.branchId?.toString(),
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
      return;
    }

    next(
      ApiError.unauthorized(
        "Invalid or expired token"
      )
    );
  }
}

/*
|--------------------------------------------------------------------------
| ROLE AUTHORIZATION
|--------------------------------------------------------------------------
|
| Authentication answers:
| "Who are you?"
|
| requireRole answers:
| "Are you allowed to use this endpoint?"
|
*/

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(
        ApiError.unauthorized(
          "Authentication required"
        )
      );

      return;
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      next(
        ApiError.forbidden(
          "You do not have permission to perform this action"
        )
      );

      return;
    }

    next();
  };
}