export enum UserRole {
  SUPER_ADMIN = "super_admin",
  OFFICE_ADMIN = "office_admin",
  TECHNICIAN = "technician",
}

export interface AuthUser {
  _id: string;

  companyId?: string;

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

/**
 * Roles that are allowed to access Admin Web.
 *
 * Technicians use the technician application.
 */
export const ADMIN_WEB_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.OFFICE_ADMIN,
];

/**
 * Human-readable role labels used by the Admin Web.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Developer / Super Admin",

  [UserRole.OFFICE_ADMIN]: "Office Admin",

  [UserRole.TECHNICIAN]: "Technician",
};