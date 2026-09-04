import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { Branch } from "../models/Branch";
import { Company, CompanyStatus } from "../models/Company";
import { TechnicianProfile, DutyStatus } from "../models/TechnicianProfile";
import { User, UserRole } from "../models/User";
import { logger } from "../utils/logger";

const BRANCH_NAME = "Tughlakabad Office";
const BRANCH_CITY = "Delhi";
const BRANCH_STATE = "Delhi";
const FIXED_PHONE_NUMBERS = [
  "9876500001", "9876500002", "9876500003", "9876500004",
  "9876500005", "9876500006", "9876500007", "9876500008",
  "9876500009", "9876500010", "9876500011", "9876500012",
  "9876500013",
] as const;

const TECHNICIANS = [
  { name: "Dilip Kumar", employeeCode: "PM-TECH-0001" },
  { name: "Sonu Kumar", employeeCode: "PM-TECH-0002" },
  { name: "Dharmendra", employeeCode: "PM-TECH-0003" },
  { name: "Anup Kumar", employeeCode: "PM-TECH-0004" },
  { name: "Meghraj", employeeCode: "PM-TECH-0005" },
  { name: "Ravi Kumar", employeeCode: "PM-TECH-0006" },
  { name: "Sanjay Kumar", employeeCode: "PM-TECH-0007" },
  { name: "Sonu Kumar", employeeCode: "PM-TECH-0008" },
  { name: "Piyush Kumar", employeeCode: "PM-TECH-0009" },
  { name: "Nikhil Kumar", employeeCode: "PM-TECH-0010" },
  { name: "Radhe Kumar", employeeCode: "PM-TECH-0011" },
  { name: "Ashu Sharma", employeeCode: "PM-TECH-0012" },
  { name: "Akash", employeeCode: "PM-TECH-0013" },
] as const;

async function resolveCompanyId(): Promise<mongoose.Types.ObjectId> {
  if (env.SEED_TECHNICIAN_COMPANY_ID) {
    if (!mongoose.Types.ObjectId.isValid(env.SEED_TECHNICIAN_COMPANY_ID)) {
      throw new Error("SEED_TECHNICIAN_COMPANY_ID is not a valid MongoDB ObjectId.");
    }

    const company = await Company.findOne({
      _id: env.SEED_TECHNICIAN_COMPANY_ID,
      isActive: true,
      status: CompanyStatus.APPROVED,
    }).select("_id");

    if (!company) {
      throw new Error("Configured technician seed company is not active and approved.");
    }

    return company._id;
  }

  const companies = await Company.find({
    isActive: true,
    status: CompanyStatus.APPROVED,
  }).select("_id").limit(2);

  if (companies.length !== 1) {
    throw new Error(
      "Technician seed needs one unambiguous company. Set SEED_TECHNICIAN_COMPANY_ID in apps/backend/.env."
    );
  }

  return companies[0]._id;
}

async function run(): Promise<void> {
  await connectDB();

  if (!env.SEED_TECHNICIAN_PASSWORD) {
    throw new Error(
      "SEED_TECHNICIAN_PASSWORD is required. Do not keep a shared password in source code."
    );
  }

  const companyId = await resolveCompanyId();

  let branch = await Branch.findOne({
    companyId,
    name: BRANCH_NAME,
  });

  if (!branch) {
    branch = await Branch.create({
      companyId,
      name: BRANCH_NAME,
      city: BRANCH_CITY,
      state: BRANCH_STATE,
      isActive: true,
    });
    logger.info(`Branch created: ${branch.name}`);
  } else {
    logger.info(`Branch already exists: ${branch.name}`);
  }

  const existingUsers = await User.find({
    role: UserRole.TECHNICIAN,
    companyId,
  }).lean();

  const existingEmployeeCodes = new Set(
    (await TechnicianProfile.find({
      employeeCode: { $in: TECHNICIANS.map((t) => t.employeeCode) },
    }).lean()).map((profile) => profile.employeeCode)
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const [index, technician] of TECHNICIANS.entries()) {
    const phone = FIXED_PHONE_NUMBERS[index];
    // Phone is the user-level identity here. Names are not unique
    // (the seed intentionally contains two technicians named Sonu Kumar).
    const existingUser = existingUsers.find(
      (user) => user.phone === phone
    );
    const employeeExists = existingEmployeeCodes.has(technician.employeeCode);

    if (existingUser || employeeExists) {
      skipped.push(`${technician.name} (${technician.employeeCode})`);
      continue;
    }

    const user = await User.create({
      companyId,
      name: technician.name,
      phone,
      passwordHash: env.SEED_TECHNICIAN_PASSWORD,
      role: UserRole.TECHNICIAN,
      branchId: branch._id,
      isActive: true,
    });

    await TechnicianProfile.create({
      userId: user._id,
      employeeCode: technician.employeeCode,
      skills: ["Inspection", "Treatment"],
      currentDutyStatus: DutyStatus.OFF_DUTY,
    });

    created.push(`${technician.name} (${technician.employeeCode})`);
  }

  logger.info(`Technicians seed completed. Created: ${created.length}. Skipped: ${skipped.length}.`);
  if (created.length) logger.info(`Created: ${created.join(", ")}`);
  if (skipped.length) logger.info(`Skipped: ${skipped.join(", ")}`);

  await disconnectDB();
}

run().catch(async (err) => {
  logger.error("Technician seed failed", err);
  try {
    await disconnectDB();
  } catch {
    // Ignore disconnect failure during fatal seed cleanup.
  }
  process.exit(1);
});
