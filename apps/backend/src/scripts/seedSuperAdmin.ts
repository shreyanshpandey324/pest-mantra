/**
 * Seeds Super Admin accounts from environment variables only.
 * No production credentials are stored in source control.
 */

import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { User, UserRole } from "../models/User";
import { logger } from "../utils/logger";

type SeedAdmin = {
  name: string;
  phone: string;
  email?: string;
  password: string;
};

function buildAdmin(
  label: string,
  values: {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
  }
): SeedAdmin | null {
  const supplied = Object.values(values).some(Boolean);
  if (!supplied) return null;

  if (!values.name || !values.phone || !values.password) {
    throw new Error(
      `${label} seed is incomplete. Name, phone and password are required.`
    );
  }

  return {
    name: values.name,
    phone: values.phone,
    email: values.email,
    password: values.password,
  };
}

async function run(): Promise<void> {
  await connectDB();

  const superAdmins = [
    buildAdmin("Primary Super Admin", {
      name: env.SEED_SUPER_ADMIN_NAME,
      phone: env.SEED_SUPER_ADMIN_PHONE,
      email: env.SEED_SUPER_ADMIN_EMAIL,
      password: env.SEED_SUPER_ADMIN_PASSWORD,
    }),
    buildAdmin("Second Super Admin", {
      name: env.SEED_SUPER_ADMIN_2_NAME,
      phone: env.SEED_SUPER_ADMIN_2_PHONE,
      email: env.SEED_SUPER_ADMIN_2_EMAIL,
      password: env.SEED_SUPER_ADMIN_2_PASSWORD,
    }),
  ].filter((admin): admin is SeedAdmin => admin !== null);

  if (superAdmins.length === 0) {
    throw new Error(
      "No Super Admin seed credentials configured. Set SEED_SUPER_ADMIN_NAME, SEED_SUPER_ADMIN_PHONE and SEED_SUPER_ADMIN_PASSWORD in apps/backend/.env."
    );
  }

  for (const admin of superAdmins) {
    const existing = await User.findOne({ phone: admin.phone }).select(
      "+passwordHash"
    );

    if (existing) {
      existing.name = admin.name;
      existing.email = admin.email;
      existing.role = UserRole.SUPER_ADMIN;
      existing.companyId = undefined;
      existing.branchId = undefined;
      existing.isActive = true;
      existing.otpLoginEnabled = false;
      existing.passwordHash = admin.password;
      await existing.save();
      logger.info(`Super Admin updated: ${admin.phone}`);
    } else {
      await User.create({
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        passwordHash: admin.password,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        otpLoginEnabled: false,
      });
      logger.info(`Super Admin created: ${admin.phone}`);
    }
  }

  logger.info(`Super Admin seed completed. Accounts processed: ${superAdmins.length}.`);
  await disconnectDB();
}

run().catch(async (err) => {
  logger.error("Seed script failed", err);
  try {
    await disconnectDB();
  } catch {
    // Ignore disconnect failure during fatal seed cleanup.
  }
  process.exit(1);
});
