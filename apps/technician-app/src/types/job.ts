export enum JobStatus {
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

export enum PaymentMethod {
  CASH = "cash",
  UPI = "upi",
  CHEQUE = "cheque",
  ADVANCE = "advance",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.UPI]: "UPI",
  [PaymentMethod.CHEQUE]: "Cheque",
  [PaymentMethod.ADVANCE]: "Advance (already paid)",
};

export interface Job {
  _id: string;
  projectCode: string;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: ServiceType;
  status: JobStatus;
  assignedTechnicianId?: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PhotoType {
  BEFORE = "before",
  AFTER = "after",
}

export interface JobPhoto {
  _id: string;
  projectId: string;
  uploadedBy: string;
  photoType: PhotoType;
  fileUrl: string;
  uploadedAt: string;
}

export type DutyStatus = "off_duty" | "on_duty_idle" | "en_route" | "on_site" | "busy";
