import { z } from "zod";
import { ContractFrequency, ContractStatus } from "../models/ServiceContract";
import { ServiceType } from "../models/Project";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date");

const serviceContractBaseSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(CUSTOMER_PHONE_REGEX),
  customerEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().trim().min(5).max(500),
  serviceType: z.nativeEnum(ServiceType),
  frequency: z.nativeEnum(ContractFrequency),
  customIntervalDays: z.number().int().min(1).max(365).optional(),
  startDate: dateString,
  endDate: dateString,
  contractValue: z.number().min(0),
  includedVisits: z.number().int().min(1).max(100),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(5000).optional(),
  companyId: z.string().optional(),
  branchId: z.string().optional(),
});

export const createServiceContractSchema = serviceContractBaseSchema.superRefine(
  (value, ctx) => {
    if (new Date(value.endDate) <= new Date(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }

    if (
      value.frequency === ContractFrequency.CUSTOM &&
      !value.customIntervalDays
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom interval is required",
        path: ["customIntervalDays"],
      });
    }
  },
);

// Keep the update schema as an object so `.partial()` remains valid.
// Cross-field checks that depend on the existing record are enforced in the service.
export const updateServiceContractSchema = serviceContractBaseSchema.partial();

export const serviceContractStatusSchema = z.object({
  status: z.enum([
    ContractStatus.ACTIVE,
    ContractStatus.PAUSED,
    ContractStatus.CANCELLED,
  ]),
});

export const listServiceContractsSchema = z.object({
  status: z.nativeEnum(ContractStatus).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateServiceContractInput = z.infer<
  typeof createServiceContractSchema
>;
export type UpdateServiceContractInput = z.infer<
  typeof updateServiceContractSchema
>;
