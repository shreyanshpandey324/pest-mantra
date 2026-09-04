import { z } from "zod";

import {
  ServiceType,
  ProjectStatus,
  PaymentMethod,
  ProjectPriority,
  FailedVisitReason,
} from "../models/Project";

import {
  PhotoType,
} from "../models/ProjectPhoto";

import {
  CUSTOMER_PHONE_REGEX,
} from "../utils/constants";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Validates a date string without changing
 * the input type from string.
 *
 * The service layer can continue to receive
 * the original string and convert it to Date.
 */
const validDateString = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine(
    (value) => {
      const date = new Date(value);

      return !Number.isNaN(
        date.getTime()
      );
    },
    {
      message:
        "scheduledDate must be a valid date",
    }
  );

/*
|--------------------------------------------------------------------------
| Create Project
|--------------------------------------------------------------------------
*/

export const createProjectSchema =
  z.object({
    customerName: z
      .string()
      .trim()
      .min(
        2,
        "Customer name must contain at least 2 characters"
      )
      .max(
        100,
        "Customer name cannot exceed 100 characters"
      ),

    customerPhone: z
      .string()
      .trim()
      .regex(
        CUSTOMER_PHONE_REGEX,
        "Enter a valid customer phone number"
      ),

    address: z
      .string()
      .trim()
      .min(
        5,
        "Address must contain at least 5 characters"
      )
      .max(
        500,
        "Address cannot exceed 500 characters"
      ),

    serviceType:
      z.nativeEnum(
        ServiceType
      ),

    priority: z.nativeEnum(ProjectPriority).optional(),

    siteLocation: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      capturedAt: validDateString.optional(),
    }).optional(),

    companyId: z
      .string()
      .trim()
      .optional(),

    branchId: z
      .string()
      .trim()
      .optional(),

    notes: z
      .string()
      .trim()
      .max(
        1000,
        "Notes cannot exceed 1000 characters"
      )
      .optional(),
  });

export type CreateProjectInput =
  z.infer<
    typeof createProjectSchema
  >;

/*
|--------------------------------------------------------------------------
| Assign Project
|--------------------------------------------------------------------------
*/

export const assignProjectSchema =
  z.object({
    technicianId: z
      .string()
      .trim()
      .min(
        1,
        "technicianId is required"
      ),

    scheduledDate:
      validDateString,

    scheduledTimeSlot: z
      .string()
      .trim()
      .min(
        1,
        "scheduledTimeSlot is required"
      )
      .max(
        100,
        "scheduledTimeSlot cannot exceed 100 characters"
      ),

    priority: z.nativeEnum(ProjectPriority).optional(),
  });

export type AssignProjectInput =
  z.infer<
    typeof assignProjectSchema
  >;

/*
|--------------------------------------------------------------------------
| Project Status State Machine
|--------------------------------------------------------------------------
|
| These are the ONLY legal status
| transitions.
|
| The service layer is the final authority
| and enforces these transitions atomically.
|
*/

export const ALLOWED_STATUS_TRANSITIONS:
  Record<
    ProjectStatus,
    ProjectStatus[]
  > = {
    [ProjectStatus.NEW]: [
      ProjectStatus.ASSIGNED,
      ProjectStatus.CANCELLED,
    ],

    [ProjectStatus.ASSIGNED]: [
      ProjectStatus.EN_ROUTE,
      ProjectStatus.CANCELLED,
    ],

    [ProjectStatus.EN_ROUTE]: [
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.CANCELLED,
    ],

    [ProjectStatus.IN_PROGRESS]: [
      ProjectStatus.COMPLETED,
      ProjectStatus.CANCELLED,
    ],

    [ProjectStatus.COMPLETED]: [],

    [ProjectStatus.CANCELLED]: [],
  };

/*
|--------------------------------------------------------------------------
| Update Project Status
|--------------------------------------------------------------------------
*/

export const updateStatusSchema =
  z.object({
    status:
      z.nativeEnum(
        ProjectStatus
      ),

    remarks: z
      .string()
      .trim()
      .max(
        500,
        "Remarks cannot exceed 500 characters"
      )
      .optional(),

    paymentMethod:
      z.nativeEnum(
        PaymentMethod
      ).optional(),

    customerConfirmed:
      z.boolean().optional(),
  });

export type UpdateStatusInput =
  z.infer<
    typeof updateStatusSchema
  >;

/*
|--------------------------------------------------------------------------
| List Projects Query
|--------------------------------------------------------------------------
*/

export const listProjectsQuerySchema =
  z.object({
    status:
      z.nativeEnum(
        ProjectStatus
      ).optional(),

    search: z
      .string()
      .trim()
      .max(120)
      .optional(),

    date: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => {
          if (!value) {
            return true;
          }

          const date =
            new Date(value);

          return !Number.isNaN(
            date.getTime()
          );
        },
        {
          message:
            "date must be a valid date",
        }
      ),
  });

export type ListProjectsQuery =
  z.infer<
    typeof listProjectsQuerySchema
  >;


/*
|--------------------------------------------------------------------------
| Zero-Chaos field exception workflows
|--------------------------------------------------------------------------
*/

export const rescheduleProjectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  suggestedDate: validDateString.optional(),
  suggestedTimeSlot: z.string().trim().min(1).max(100).optional(),
});
export type RescheduleProjectInput = z.infer<typeof rescheduleProjectSchema>;

export const failedVisitSchema = z.object({
  reason: z.nativeEnum(FailedVisitReason),
  notes: z.string().trim().max(500).optional(),
});
export type FailedVisitInput = z.infer<typeof failedVisitSchema>;

export const reassignProjectSchema = z.object({
  technicianId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
});
export type ReassignProjectInput = z.infer<typeof reassignProjectSchema>;

/*
|--------------------------------------------------------------------------
| Project Photo Upload
|--------------------------------------------------------------------------
|
| Multipart requests cannot use the normal
| JSON validateBody middleware in the same
| way, so photo.controller.ts performs
| safeParse() manually.
|--------------------------------------------------------------------------
*/

export const photoUploadBodySchema =
  z.object({
    photoType:
      z.nativeEnum(
        PhotoType,
        {
          errorMap: () => ({
            message:
              "photoType must be 'before' or 'after'",
          }),
        }
      ),
  });

export type PhotoUploadBody =
  z.infer<
    typeof photoUploadBodySchema
  >;