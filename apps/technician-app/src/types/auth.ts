export enum UserRole {
  SUPER_ADMIN = "super_admin",
  OFFICE_ADMIN = "office_admin",
  TECHNICIAN = "technician",
}

export interface AuthUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  branchId?: string;
  isActive: boolean;
  otpLoginEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  details?: unknown;
}

/** This app is technician-only — an admin account can authenticate against the
 *  same backend but has no business getting a session here; they use admin-web. */
export const TECHNICIAN_APP_ROLES: UserRole[] = [UserRole.TECHNICIAN];
