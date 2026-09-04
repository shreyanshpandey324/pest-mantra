/**
 * Seeds the initial Pest Mantra staff accounts from environment variables.
 *
 * - 2 Super Admins (optional second account)
 * - 1 Office Admin
 *
 * No passwords are hard-coded in source control. Set them in apps/backend/.env
 * before running `npm run seed:staff`.
 */

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { Company, CompanyStatus } from "../models/Company";
import { Branch } from "../models/Branch";
import { User, UserRole } from "../models/User";
import { logger } from "../utils/logger";

type SeedUser = {
  name: string;
  phone: string;
  email?: string;
  password: string;
};

function requireSeedUser(
  label: string,
  values: { name?: string; phone?: string; email?: string; password?: string }
): SeedUser {
  if (!values.name || !values.phone || !values.password) {
    throw new Error(`${label} seed is incomplete. Name, phone and password are required.`);
  }

  return {
    name: values.name,
    phone: values.phone,
    email: values.email || undefined,
    password: values.password,
  };
}

function optionalSeedUser(
  label: string,
  values: { name?: string; phone?: string; email?: string; password?: string }
): SeedUser | null {
  const supplied = Object.values(values).some(Boolean);
  if (!supplied) return null;
  return requireSeedUser(label, values);
}

async function upsertSuperAdmin(admin: SeedUser) {
  const existing = await User.findOne({ phone: admin.phone }).select("+passwordHash");

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
    logger.info(`Super Admin updated: ${admin.name} (${admin.phone})`);
    return existing;
  }

  const created = await User.create({
    name: admin.name,
    phone: admin.phone,
    email: admin.email,
    passwordHash: admin.password,
    role: UserRole.SUPER_ADMIN,
    isActive: true,
    otpLoginEnabled: false,
  });
  logger.info(`Super Admin created: ${admin.name} (${admin.phone})`);
  return created;
}

async function resolveOfficeAdminBranch(primarySuperAdminId: mongoose.Types.ObjectId) {
  if (env.SEED_OFFICE_ADMIN_BRANCH_ID) {
    if (!mongoose.Types.ObjectId.isValid(env.SEED_OFFICE_ADMIN_BRANCH_ID)) {
      throw new Error("SEED_OFFICE_ADMIN_BRANCH_ID is not a valid MongoDB ObjectId");
    }

    const branch = await Branch.findOne({
      _id: env.SEED_OFFICE_ADMIN_BRANCH_ID,
      isActive: true,
    });
    if (!branch) {
      throw new Error("SEED_OFFICE_ADMIN_BRANCH_ID does not refer to an active branch");
    }
    return branch;
  }

  // Prefer an existing active branch on non-empty databases.
  const existingBranch = await Branch.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (existingBranch) return existingBranch;

  // Fresh database bootstrap: create/activate a default Pest Mantra company + branch.
  const companyName = env.SEED_DEFAULT_COMPANY_NAME || "Pest Mantra";
  let company = await Company.findOne({ name: companyName });

  if (!company) {
    company = await Company.create({
      name: companyName,
      status: CompanyStatus.APPROVED,
      isActive: true,
      approvedAt: new Date(),
      approvedBy: primarySuperAdminId,
    });
    logger.info(`Default company created: ${company.name}`);
  } else {
    company.status = CompanyStatus.APPROVED;
    company.isActive = true;
    company.approvedAt = company.approvedAt || new Date();
    company.approvedBy = company.approvedBy || primarySuperAdminId;
    await company.save();
  }

  const branch = await Branch.create({
    companyId: company._id,
    name: env.SEED_DEFAULT_BRANCH_NAME || "Main Branch",
    city: env.SEED_DEFAULT_BRANCH_CITY || "Delhi",
    state: env.SEED_DEFAULT_BRANCH_STATE || "Delhi",
    isActive: true,
  });
  logger.info(`Default branch created: ${branch.name}`);
  return branch;
}

async function upsertOfficeAdmin(admin: SeedUser, branchId: mongoose.Types.ObjectId, companyId: mongoose.Types.ObjectId) {
  const existing = await User.findOne({ phone: admin.phone }).select("+passwordHash");

  if (existing) {
    existing.name = admin.name;
    existing.email = admin.email;
    existing.role = UserRole.OFFICE_ADMIN;
    existing.companyId = companyId;
    existing.branchId = branchId;
    existing.isActive = true;
    existing.otpLoginEnabled = false;
    existing.passwordHash = admin.password;
    await existing.save();
    logger.info(`Office Admin updated: ${admin.name} (${admin.phone})`);
    return existing;
  }

  const created = await User.create({
    name: admin.name,
    phone: admin.phone,
    email: admin.email,
    passwordHash: admin.password,
    role: UserRole.OFFICE_ADMIN,
    companyId,
    branchId,
    isActive: true,
    otpLoginEnabled: false,
  });
  logger.info(`Office Admin created: ${admin.name} (${admin.phone})`);
  return created;
}

async function run(): Promise<void> {
  await connectDB();

  const primary = requireSeedUser("Primary Super Admin", {
    name: env.SEED_SUPER_ADMIN_NAME,
    phone: env.SEED_SUPER_ADMIN_PHONE,
    email: env.SEED_SUPER_ADMIN_EMAIL,
    password: env.SEED_SUPER_ADMIN_PASSWORD,
  });

  const second = optionalSeedUser("Second Super Admin", {
    name: env.SEED_SUPER_ADMIN_2_NAME,
    phone: env.SEED_SUPER_ADMIN_2_PHONE,
    email: env.SEED_SUPER_ADMIN_2_EMAIL,
    password: env.SEED_SUPER_ADMIN_2_PASSWORD,
  });

  const officeAdmin = requireSeedUser("Office Admin", {
    name: env.SEED_OFFICE_ADMIN_NAME,
    phone: env.SEED_OFFICE_ADMIN_PHONE,
    email: env.SEED_OFFICE_ADMIN_EMAIL,
    password: env.SEED_OFFICE_ADMIN_PASSWORD,
  });

  const primaryUser = await upsertSuperAdmin(primary);
  if (second) await upsertSuperAdmin(second);

  const branch = await resolveOfficeAdminBranch(primaryUser._id);
  await upsertOfficeAdmin(officeAdmin, branch._id, branch.companyId);

  logger.info("Initial staff seed completed successfully.");
  await disconnectDB();
}

run().catch(async (err) => {
  logger.error("Initial staff seed failed", err);
  try {
    await disconnectDB();
  } catch {
    // Ignore disconnect failure during fatal seed cleanup.
  }
  process.exit(1);
});
