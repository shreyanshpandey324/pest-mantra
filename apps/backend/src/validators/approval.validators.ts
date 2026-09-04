import { z } from "zod";
import { ApprovalCategory, ApprovalStatus } from "../models/ApprovalRequest";
export const createApprovalSchema = z.object({ category: z.nativeEnum(ApprovalCategory), title: z.string().trim().min(3).max(180), description: z.string().trim().max(2000).optional(), amount: z.coerce.number().min(0).optional(), relatedType: z.string().trim().max(80).optional(), relatedId: z.string().trim().optional() });
export const resolveApprovalSchema = z.object({ status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]), resolutionNote: z.string().trim().max(1000).optional() });
