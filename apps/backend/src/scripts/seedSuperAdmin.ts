/**
 * Bootstraps the very first Super Admin account so someone can log
 * in and start creating branches, office admins, and technicians
 * through the normal admin-only user-creation endpoint.
 *
 * Run once: npm run seed:superadmin
 * Safe to re-run — it's a no-op if a super admin already exists.
 */
import { connectDB, disconnectDB } from "../config/db";
import { User, UserRole } from "../models/User";
import { env } from "../config/env";
import { logger } from "../utils/logger";

async function run(): Promise<void> {
  await connectDB();

  const existing = await User.findOne({ role: UserRole.SUPER_ADMIN });
  if (existing) {
    logger.info(`Super admin already exists (phone: ${existing.phone}). Skipping seed.`);
    await disconnectDB();
    return;
  }

  const name = env.SEED_SUPER_ADMIN_NAME;
  const phone = env.SEED_SUPER_ADMIN_PHONE;
  const password = env.SEED_SUPER_ADMIN_PASSWORD;

  if (!name || !phone || !password) {
    logger.error(
      "Missing SEED_SUPER_ADMIN_NAME / SEED_SUPER_ADMIN_PHONE / SEED_SUPER_ADMIN_PASSWORD in .env"
    );
    await disconnectDB();
    process.exit(1);
  }

  await User.create({
    name,
    phone,
    passwordHash: password, // hashed by the pre-save hook
    role: UserRole.SUPER_ADMIN,
    isActive: true,
  });

  logger.info(`Super admin created: ${phone}. Log in and rotate this password immediately.`);
  await disconnectDB();
}

run().catch((err) => {
  logger.error("Seed script failed", err);
  process.exit(1);
});
