import { z } from "zod";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";
import { ComplaintCategory, ComplaintPriority } from "../models/Complaint";

export const customerPortalLoginSchema = z.object({
  phone: z.string().trim().regex(CUSTOMER_PHONE_REGEX, "Enter a valid customer phone number"),
  accessCode: z.string().trim().min(8).max(24).transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")),
});

export const customerQuotationDecisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
});

export const customerComplaintSchema = z.object({
  projectId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid project id").optional(),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(3000),
  category: z.nativeEnum(ComplaintCategory),
  priority: z.nativeEnum(ComplaintPriority).default(ComplaintPriority.MEDIUM),
});

export type CustomerPortalLoginInput = z.infer<typeof customerPortalLoginSchema>;
export type CustomerQuotationDecisionInput = z.infer<typeof customerQuotationDecisionSchema>;
export type CustomerComplaintInput = z.infer<typeof customerComplaintSchema>;
