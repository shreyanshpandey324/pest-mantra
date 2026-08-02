import { connectDB, disconnectDB } from "../config/db";
import { Branch } from "../models/Branch";
import { TechnicianProfile, DutyStatus } from "../models/TechnicianProfile";
import { User, UserRole } from "../models/User";
import { logger } from "../utils/logger";

const DEFAULT_PASSWORD = "Pest@123";
const BRANCH_NAME = "Tughlakabad Office";
const BRANCH_CITY = "Delhi";
const BRANCH_STATE = "Delhi";
const FIXED_PHONE_NUMBERS = [
  "9876500001",
  "9876500002",
  "9876500003",
  "9876500004",
  "9876500005",
  "9876500006",
  "9876500007",
  "9876500008",
  "9876500009",
  "9876500010",
  "9876500011",
  "9876500012",
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

async function run(): Promise<void> {
  await connectDB();

  let branch = await Branch.findOne({ name: BRANCH_NAME });
  if (!branch) {
    branch = await Branch.create({
      name: BRANCH_NAME,
      city: BRANCH_CITY,
      state: BRANCH_STATE,
      isActive: true,
    });
    logger.info(`Branch created: ${branch.name}`);
  } else {
    logger.info(`Branch already exists: ${branch.name}`);
  }

  const existingUsers = await User.find({ role: UserRole.TECHNICIAN }).lean();
  const existingEmployeeCodes = new Set(
    (await TechnicianProfile.find({ employeeCode: { $in: TECHNICIANS.map((t) => t.employeeCode) } }).lean()).map(
      (profile) => profile.employeeCode
    )
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const [index, technician] of TECHNICIANS.entries()) {
    const existingUser = existingUsers.find((user) => user.name === technician.name);
    const employeeExists = existingEmployeeCodes.has(technician.employeeCode);

    if (existingUser || employeeExists) {
      skipped.push(`${technician.name} (${technician.employeeCode})`);
      continue;
    }

    const password = DEFAULT_PASSWORD;
    const phone = FIXED_PHONE_NUMBERS[index];

    const user = await User.create({
      name: technician.name,
      phone,
      passwordHash: password,
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
  if (created.length) {
    logger.info(`Created: ${created.join(", ")}`);
  }
  if (skipped.length) {
    logger.info(`Skipped: ${skipped.join(", ")}`);
  }

  await disconnectDB();
}

run().catch((err) => {
  logger.error("Technician seed failed", err);
  process.exit(1);
});
