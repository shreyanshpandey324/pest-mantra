import { z } from "zod";

const dataUrlSchema = z
  .string()
  .min(100, "Customer signature is required")
  .max(350000, "Customer signature image is too large")
  .refine(
    (value) => /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value),
    "Customer signature must be a PNG signature captured in the app"
  );

export const saveServiceReportSchema = z.object({
  treatmentSummary: z.string().trim().min(10, "Treatment summary must be at least 10 characters").max(3000),
  observations: z.string().trim().max(2000).optional(),
  recommendations: z.string().trim().max(2000).optional(),
  nextServiceDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "nextServiceDate must be a valid date"),
  customerSignedBy: z.string().trim().min(2, "Customer/signatory name is required").max(100),
  customerSignatureDataUrl: dataUrlSchema,
});

export type SaveServiceReportInput = z.infer<typeof saveServiceReportSchema>;
