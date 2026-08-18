export enum ProjectStatus {
  NEW = "new",
  ASSIGNED = "assigned",
  EN_ROUTE = "en_route",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ServiceType {
  COCKROACH = "cockroach",
  ANTS = "ants",
  RODENT = "rodent",
  FLY = "fly",
  TERMITE = "termite",
  BED_BUG = "bed_bug",
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.COCKROACH]: "Cockroach",
  [ServiceType.ANTS]: "Ants",
  [ServiceType.RODENT]: "Rodent",
  [ServiceType.FLY]: "Fly",
  [ServiceType.TERMITE]: "Termite",
  [ServiceType.BED_BUG]: "Bed Bug",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "New",
  [ProjectStatus.ASSIGNED]: "Assigned",
  [ProjectStatus.EN_ROUTE]: "En Route",
  [ProjectStatus.IN_PROGRESS]: "In Progress",
  [ProjectStatus.COMPLETED]: "Completed",
  [ProjectStatus.CANCELLED]: "Cancelled",
};

export enum PaymentMethod {
  CASH = "cash",
  UPI = "upi",
  CHEQUE = "cheque",
  ADVANCE = "advance",
}

export interface AssignedTechnician {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  branchId?: string;
}

export interface Project {
  _id: string;

  /*
   * Ownership / scope
   *
   * These values come from the backend.
   * The frontend must NOT use client-provided
   * values to bypass authorization.
   */
  companyId?: string;
  branchId?: string;

  projectCode: string;

  customerName: string;
  customerPhone: string;
  address: string;

  serviceType: ServiceType;
  status: ProjectStatus;

  assignedTechnicianId?: AssignedTechnician;

  assignedBy?: string;
  assignedAt?: string;

  scheduledDate?: string;
  scheduledTimeSlot?: string;

  createdBy: string;

  paymentMethod?: PaymentMethod;

  notes?: string;

  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface TechnicianListItem {
  id: string;
  name: string;
  phone: string;

  email?: string;

  /*
   * Technician's actual branch from backend.
   */
  branchId?: string;

  isActive: boolean;

  employeeCode: string;
  vehicleNumber?: string;
  skills: string[];

  dutyStatus:
    | "off_duty"
    | "on_duty_idle"
    | "en_route"
    | "on_site"
    | "busy";
}

export interface EditTechnicianFormData {
  id: string;
  name: string;
  phone: string;
  email?: string;

  branchId?: string;

  employeeCode: string;
  vehicleNumber?: string;
  skills: string[];

  isActive: boolean;

  dutyStatus: TechnicianListItem["dutyStatus"];
}

export interface ProjectStatusHistoryEntry {
  _id: string;
  projectId: string;

  fromStatus: ProjectStatus | null;
  toStatus: ProjectStatus;

  changedBy: string;
  changedAt: string;

  remarks?: string;
}