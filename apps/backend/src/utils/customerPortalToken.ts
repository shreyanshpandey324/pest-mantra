import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface CustomerPortalTokenPayload extends JwtPayload {
  sub: string;
  companyId: string;
  branchId: string;
  customerPhone: string;
  sessionVersion: number;
  tokenType: "customer_portal";
}

export function signCustomerPortalToken(
  payload: Omit<CustomerPortalTokenPayload, "tokenType">,
): string {
  return jwt.sign(
    { ...payload, tokenType: "customer_portal" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "12h" } as SignOptions,
  );
}

export function verifyCustomerPortalToken(token: string): CustomerPortalTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as CustomerPortalTokenPayload;
  if (!decoded || decoded.tokenType !== "customer_portal" || !decoded.sub) {
    throw new Error("Invalid customer portal token");
  }
  return decoded;
}
