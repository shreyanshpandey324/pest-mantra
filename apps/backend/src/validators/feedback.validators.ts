import { z } from "zod";
import { FeedbackTag } from "../models/Feedback";

export const submitFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  wouldRecommend: z.boolean(),
  tags: z.array(z.nativeEnum(FeedbackTag)).max(6).optional().default([]),
  comment: z.string().trim().max(1500).optional(),
});

export const listFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  technicianId: z.string().trim().min(1).optional(),
  search: z.string().trim().max(100).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type ListFeedbackInput = z.infer<typeof listFeedbackSchema>;
