import { z } from "zod";
import { ServiceType } from "../models/Project";

export const rescheduleServiceReminderSchema = z.object({
  dueDate: z.string().trim().min(1, "Next service date is required").refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Next service date must be valid",
  ),
  notes: z.string().trim().max(1000, "Notes cannot exceed 1000 characters").optional(),
});

export const listServiceRemindersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  timing: z.enum(["overdue", "due_today", "due_soon", "upcoming", "scheduled"]).optional(),
  serviceType: z.nativeEnum(ServiceType).optional(),
  unread: z.enum(["true", "false"]).optional(),
  from: z.string().trim().optional().refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "From date must be valid",
  ),
  to: z.string().trim().optional().refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "To date must be valid",
  ),
  sort: z.enum(["due_asc", "due_desc", "created_desc"]).default("due_asc"),
});

export type RescheduleServiceReminderInput = z.infer<typeof rescheduleServiceReminderSchema>;
export type ListServiceRemindersInput = z.infer<typeof listServiceRemindersSchema>;
