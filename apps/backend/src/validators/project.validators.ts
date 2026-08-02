import { z } from "zod";
import { ServiceType, ProjectStatus, PaymentMethod } from "../models/Project";
import { PhotoType } from "../models/ProjectPhoto";
import { PHONE_REGEX } from "../utils/constants";

export const createProjectSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(PHONE_REGEX, "Enter a valid 10-digit Indian mobile number"),
  address: z.string().trim().min(5).max(500),
  serviceType: z.nativeEnum(ServiceType),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const assignProjectSchema = z.object({
  technicianId: z.string().trim().min(1, "technicianId is required"),
  scheduledDate: z.string().trim().min(1, "scheduledDate is required"),
  scheduledTimeSlot: z.string().trim().min(1, "scheduledTimeSlot is required"),
});
export type AssignProjectInput = z.infer<typeof assignProjectSchema>;

/**
 * The status state machine — only these transitions are legal.
 * Enforced in the service layer, not just documented here: this
 * object is the single source of truth both the admin and
 * technician status-update endpoints check against.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.NEW]: [ProjectStatus.ASSIGNED, ProjectStatus.CANCELLED],
  [ProjectStatus.ASSIGNED]: [ProjectStatus.EN_ROUTE, ProjectStatus.CANCELLED],
  [ProjectStatus.EN_ROUTE]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
  [ProjectStatus.IN_PROGRESS]: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELLED]: [],
};

export const updateStatusSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
  remarks: z.string().trim().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const listProjectsQuerySchema = z.object({
  status: z.nativeEnum(ProjectStatus).optional(),
  date: z.string().trim().optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

/**
 * Validated by hand inside photo.controller.ts rather than via the
 * validateBody middleware, because this field arrives alongside a
 * multipart file upload (multer populates req.body with it), not a
 * JSON body — but it's still checked with the same Zod approach
 * used everywhere else, not a bespoke if-statement.
 */
export const photoUploadBodySchema = z.object({
  photoType: z.nativeEnum(PhotoType, {
    errorMap: () => ({ message: "photoType must be 'before' or 'after'" }),
  }),
});
export type PhotoUploadBody = z.infer<typeof photoUploadBodySchema>;
