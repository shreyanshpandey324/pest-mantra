import { ServiceType } from "./project";

export type LeadStatus = "new" | "contacted" | "follow_up" | "qualified" | "quotation_sent" | "won" | "lost";
export type LeadPriority = "hot" | "warm" | "cold";
export type LeadSource = "call" | "website" | "referral" | "whatsapp" | "walk_in" | "google" | "social" | "other";
export type LeadActivityType = "note" | "call" | "follow_up" | "site_visit" | "status_change" | "quotation";

export interface LeadActivity {
  _id?: string;
  type: LeadActivityType;
  note: string;
  actorId: string;
  actorName?: string;
  fromStatus?: LeadStatus;
  toStatus?: LeadStatus;
  scheduledFor?: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  companyId: string;
  branchId: string;
  leadNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  serviceType: ServiceType;
  source: LeadSource;
  sourceDetail?: string;
  priority: LeadPriority;
  status: LeadStatus;
  assignedTo: string;
  assignedToName?: string;
  followUpAt?: string;
  siteVisitAt?: string;
  notes?: string;
  lostReason?: string;
  quotationId?: string;
  wonAt?: string;
  lostAt?: string;
  activities?: LeadActivity[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadMetrics {
  total: number;
  open: number;
  qualified: number;
  won: number;
  lost: number;
  overdueFollowUps: number;
  dueToday: number;
  hot: number;
  conversionRate: number;
  sourceBreakdown: { source: LeadSource; count: number }[];
}

export interface LeadListResponse {
  leads: Lead[];
  metrics: LeadMetrics;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface LeadAssignee {
  _id: string;
  name: string;
  role: "super_admin" | "office_admin";
  companyId?: string;
  branchId?: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  qualified: "Qualified",
  quotation_sent: "Quotation Sent",
  won: "Won",
  lost: "Lost",
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  call: "Call",
  website: "Website",
  referral: "Referral",
  whatsapp: "WhatsApp",
  walk_in: "Walk-in",
  google: "Google",
  social: "Social",
  other: "Other",
};
