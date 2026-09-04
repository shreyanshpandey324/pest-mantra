import { NextFunction, Request, Response } from "express";
import { CustomerPortalAccess } from "../models/CustomerPortalAccess";
import { ApiError } from "../utils/ApiError";
import { verifyCustomerPortalToken } from "../utils/customerPortalToken";

export interface CustomerPortalRequest extends Request {
  customerPortal?: {
    accessId: string;
    companyId: string;
    branchId: string;
    customerPhone: string;
    customerName: string;
  };
}

export async function authenticateCustomerPortal(
  req: CustomerPortalRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : undefined;
    if (!token) throw ApiError.unauthorized("Customer portal session missing");

    const payload = verifyCustomerPortalToken(token);
    const access = await CustomerPortalAccess.findOne({
      _id: payload.sub,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!access) throw ApiError.unauthorized("Customer portal access has expired or was revoked");
    if (
      access.companyId.toString() !== payload.companyId ||
      access.branchId.toString() !== payload.branchId ||
      access.customerPhone !== payload.customerPhone ||
      access.sessionVersion !== payload.sessionVersion
    ) {
      throw ApiError.unauthorized("Invalid customer portal session");
    }

    req.customerPortal = {
      accessId: access._id.toString(),
      companyId: access.companyId.toString(),
      branchId: access.branchId.toString(),
      customerPhone: access.customerPhone,
      customerName: access.customerName,
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(ApiError.unauthorized("Invalid or expired customer portal session"));
  }
}
