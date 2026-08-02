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

/** Roles permitted to use the admin web dashboard. Technicians use the mobile app instead. */
export const ADMIN_WEB_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN];
