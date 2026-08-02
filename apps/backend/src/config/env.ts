import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * All environment variables are validated at boot time.
 * If anything required is missing or malformed, the process
 * fails fast with a clear error instead of crashing later
 * at an unpredictable point (e.g. mid-request, on first JWT sign).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "Use a duration like 15m, 1h, or 7d")
    .default("15m"),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "Use a duration like 15m, 1h, or 7d")
    .default("7d"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  SEED_SUPER_ADMIN_NAME: z.string().optional(),
  SEED_SUPER_ADMIN_PHONE: z.string().optional(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
};

// Extra hard guard: never allow default/example secrets in production.
if (env.isProduction) {
  const insecureMarkers = ["replace-with", "changeme", "secret"];
  const secretsToCheck = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET];
  for (const secret of secretsToCheck) {
    if (insecureMarkers.some((marker) => secret.toLowerCase().includes(marker))) {
      // eslint-disable-next-line no-console
      console.error("❌ Refusing to start in production with a placeholder JWT secret.");
      process.exit(1);
    }
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    // eslint-disable-next-line no-console
    console.error("❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be identical.");
    process.exit(1);
  }
}
