import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * All environment variables are validated at boot time.
 * If anything required is missing or malformed, the process
 * fails fast with a clear error instead of crashing later
 * at an unpredictable point (e.g. mid-request, on first JWT sign).
 */
const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().email().optional()
);

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalWebhookSecret = z.preprocess(
  emptyToUndefined,
  z.string().min(16).optional()
);
const optionalSeedPassword = z.preprocess(
  emptyToUndefined,
  z.string().min(8).optional()
);
const optionalUploadDir = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional()
);

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

  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  UPLOAD_DIR: optionalUploadDir,

  SEED_SUPER_ADMIN_NAME: z.string().optional(),
  SEED_SUPER_ADMIN_PHONE: z.string().optional(),
  SEED_SUPER_ADMIN_EMAIL: optionalEmail,
  SEED_SUPER_ADMIN_PASSWORD: z.string().optional(),

  SEED_SUPER_ADMIN_2_NAME: z.string().optional(),
  SEED_SUPER_ADMIN_2_PHONE: z.string().optional(),
  SEED_SUPER_ADMIN_2_EMAIL: optionalEmail,
  SEED_SUPER_ADMIN_2_PASSWORD: z.string().optional(),

  SEED_OFFICE_ADMIN_NAME: z.string().optional(),
  SEED_OFFICE_ADMIN_PHONE: z.string().optional(),
  SEED_OFFICE_ADMIN_EMAIL: optionalEmail,
  SEED_OFFICE_ADMIN_PASSWORD: z.string().optional(),
  SEED_OFFICE_ADMIN_BRANCH_ID: z.string().optional(),

  SEED_DEFAULT_COMPANY_NAME: z.string().optional(),
  SEED_DEFAULT_BRANCH_NAME: z.string().optional(),
  SEED_DEFAULT_BRANCH_CITY: z.string().optional(),
  SEED_DEFAULT_BRANCH_STATE: z.string().optional(),

  SEED_TECHNICIAN_COMPANY_ID: z.string().optional(),
  SEED_TECHNICIAN_PASSWORD: optionalSeedPassword,

  // Optional comma-separated allowlist used by `npm run otp:bootstrap`.
  // The script requires at least one active Super Admin in the list.
  OTP_BOOTSTRAP_PHONES: z.string().optional(),

  // Firebase Admin (server-side verification of Firebase Phone Auth
  // ID tokens). The server still boots without these, but OTP login
  // cannot complete until they are configured.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  BACKGROUND_JOBS_ENABLED: z.enum(["true", "false"]).default("true"),
  BACKGROUND_JOB_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  COMMUNICATION_PROVIDER: z.enum(["disabled", "webhook"]).default("disabled"),
  COMMUNICATION_WEBHOOK_URL: optionalUrl,
  COMMUNICATION_WEBHOOK_SECRET: optionalWebhookSecret,
  COMMUNICATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
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
  backgroundJobsEnabled: parsed.data.BACKGROUND_JOBS_ENABLED === "true",
  communicationProvider: parsed.data.COMMUNICATION_PROVIDER,
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
