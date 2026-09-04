import { z } from "zod";
export const listAuditLogsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(100).optional(),
  actorId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid actor id").optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;
