import { z } from "zod";
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "../models/Complaint";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optionalId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id").optional();

export const listComplaintsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  assignedTo: optionalId,
  overdue: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const createComplaintSchema = z.object({
  companyId: optionalId,
  branchId: optionalId,
  projectId: optionalId,
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(CUSTOMER_PHONE_REGEX, "Invalid phone"),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(3000),
  category: z.nativeEnum(ComplaintCategory),
  priority: z.nativeEnum(ComplaintPriority).default(ComplaintPriority.MEDIUM),
  assignedTo: optionalId,
});

export const updateComplaintSchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  assignedTo: optionalId.nullable(),
  subject: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(3).max(3000).optional(),
  resolution: z.string().trim().max(3000).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const complaintCommentSchema = z.object({ note: z.string().trim().min(1).max(1500) });
export const complaintIdSchema = z.object({ id: objectId });

export type ListComplaintsInput = z.infer<typeof listComplaintsSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
