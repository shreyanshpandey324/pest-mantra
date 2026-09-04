import { z } from "zod";
import { AutomationTrigger } from "../models/AutomationRule";
export const automationRuleSchema = z.object({ name: z.string().trim().min(3).max(150), trigger: z.nativeEnum(AutomationTrigger), enabled: z.boolean().optional(), leadMinutes: z.coerce.number().int().min(-525600).max(525600).optional(), channels: z.array(z.enum(["in_app", "whatsapp", "sms", "email"])).min(1).max(4).optional(), template: z.string().trim().min(3).max(2000) });
export const automationRuleUpdateSchema = automationRuleSchema.partial();
