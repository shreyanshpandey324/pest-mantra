import { z } from "zod";
import { ServiceType } from "../models/Project";
import { LeadActivityType, LeadPriority, LeadSource, LeadStatus } from "../models/Lead";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

const optionalDate = z.string().trim().optional().refine(
  (value) => !value || !Number.isNaN(new Date(value).getTime()),
  "Date must be valid",
);

const leadFields = {
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(CUSTOMER_PHONE_REGEX, "Enter a valid customer phone number"),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  serviceType: z.nativeEnum(ServiceType),
  source: z.nativeEnum(LeadSource),
  sourceDetail: z.string().trim().max(200).optional(),
  priority: z.nativeEnum(LeadPriority).default(LeadPriority.WARM),
  assignedTo: z.string().trim().optional(),
  followUpAt: optionalDate,
  siteVisitAt: optionalDate,
  notes: z.string().trim().max(2000).optional(),
  companyId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
};

export const createLeadSchema = z.object(leadFields);
export const updateLeadSchema = z.object(leadFields).partial();

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  note: z.string().trim().max(1000).optional(),
  lostReason: z.string().trim().max(1000).optional(),
});

export const addLeadActivitySchema = z.object({
  type: z.nativeEnum(LeadActivityType),
  note: z.string().trim().min(1).max(1000),
  scheduledFor: optionalDate,
});

export const listLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  assignedTo: z.string().trim().optional(),
  overdue: z.enum(["true", "false"]).optional(),
  from: optionalDate,
  to: optionalDate,
  sort: z.enum(["updated_desc", "created_desc", "follow_up_asc"]).default("updated_desc"),
});

export const listLeadAssigneesSchema = z.object({
  companyId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type AddLeadActivityInput = z.infer<typeof addLeadActivitySchema>;
export type ListLeadsInput = z.infer<typeof listLeadsSchema>;
