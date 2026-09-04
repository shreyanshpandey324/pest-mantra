import { ServiceType } from "./project";

export type ContractFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "half_yearly"
  | "annual"
  | "custom";
export type ContractStatus = "active" | "paused" | "cancelled" | "expired";
export type ContractVisitStatus =
  | "upcoming"
  | "project_created"
  | "completed"
  | "skipped";

export interface ContractVisit {
  _id: string;
  dueDate: string;
  status: ContractVisitStatus;
  projectId?: string;
  completedAt?: string;
}

export interface ServiceContract {
  _id: string;
  companyId?: string;
  branchId?: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  serviceType: ServiceType;
  frequency: ContractFrequency;
  customIntervalDays?: number;
  startDate: string;
  endDate: string;
  contractValue: number;
  includedVisits: number;
  status: ContractStatus;
  notes?: string;
  terms?: string;
  visits: ContractVisit[];
  renewedFrom?: string;
  renewedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const FREQUENCY_LABELS: Record<ContractFrequency, string> = {
  monthly: "Monthly",
  bimonthly: "Every 2 months",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  annual: "Annual",
  custom: "Custom",
};
