import { z } from "zod";
import { NotificationAlertKind } from "../models/NotificationAlert";
export const listNotificationAlertsSchema = z.object({
  unread: z.enum(["true", "false"]).optional(), kind: z.nativeEnum(NotificationAlertKind).optional(),
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
