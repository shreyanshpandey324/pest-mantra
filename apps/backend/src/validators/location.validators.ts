import { z } from "zod";

export const updateLocationSchema = z.object({
  latitude: z
    .number()
    .finite()
    .min(-90, "latitude must be between -90 and 90")
    .max(90, "latitude must be between -90 and 90"),

  longitude: z
    .number()
    .finite()
    .min(-180, "longitude must be between -180 and 180")
    .max(180, "longitude must be between -180 and 180"),

  accuracy: z
    .number()
    .finite()
    .min(0, "accuracy cannot be negative")
    .optional(),

  speed: z
    .number()
    .finite()
    .min(0, "speed cannot be negative")
    .optional(),

  heading: z
    .number()
    .finite()
    .min(0, "heading must be between 0 and 360")
    .max(360, "heading must be between 0 and 360")
    .optional(),

  batteryLevel: z
    .number()
    .finite()
    .min(0, "batteryLevel must be between 0 and 100")
    .max(100, "batteryLevel must be between 0 and 100")
    .optional(),

  isCharging: z
    .boolean()
    .optional(),
});

export type UpdateLocationInput =
  z.infer<typeof updateLocationSchema>;