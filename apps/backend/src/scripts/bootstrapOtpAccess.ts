import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { User, UserRole } from "../models/User";
import { PHONE_REGEX } from "../utils/constants";
import { logger } from "../utils/logger";

function parsePhones(): string[] {
  const phones = (env.OTP_BOOTSTRAP_PHONES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const unique = [...new Set(phones)];
  if (unique.length === 0) {
    throw new Error(
      "OTP_BOOTSTRAP_PHONES is empty. Add the existing phone numbers that should be allowed to log in."
    );
  }

  const invalid = unique.filter((phone) => !PHONE_REGEX.test(phone));
  if (invalid.length > 0) {
    throw new Error(`Invalid Indian mobile number(s): ${invalid.join(", ")}`);
  }

  return unique;
}

async function run(): Promise<void> {
  const phones = parsePhones();
  await connectDB();

  const selected = await User.find({ phone: { $in: phones } });
  const foundPhones = new Set(selected.map((user) => user.phone));
  const missing = phones.filter((phone) => !foundPhones.has(phone));
  if (missing.length > 0) {
    throw new Error(
      `These numbers do not belong to existing Pest Mantra users: ${missing.join(", ")}`
    );
  }

  const hasActiveSuperAdmin = selected.some(
    (user) => user.role === UserRole.SUPER_ADMIN && user.isActive
  );
  if (!hasActiveSuperAdmin) {
    throw new Error(
      "The OTP bootstrap list must include at least one active Super Admin so the system cannot be locked out."
    );
  }

  // Enable the selected active accounts first. Only after that succeeds do we
  // disable every number not on the explicit bootstrap list.
  await User.updateMany(
    { phone: { $in: phones }, isActive: true },
    { $set: { otpLoginEnabled: true } }
  );
  await User.updateMany(
    { phone: { $nin: phones } },
    { $set: { otpLoginEnabled: false } }
  );
  await User.updateMany(
    { phone: { $in: phones }, isActive: false },
    { $set: { otpLoginEnabled: false } }
  );

  const enabled = await User.find({ otpLoginEnabled: true, isActive: true })
    .select("name phone role")
    .sort({ role: 1, name: 1 });

  logger.info(`OTP whitelist updated. Approved active accounts: ${enabled.length}.`);
  for (const user of enabled) {
    logger.info(`OTP approved: ${user.name} (${user.phone}) [${user.role}]`);
  }

  await disconnectDB();
}

run().catch(async (error) => {
  logger.error("OTP bootstrap failed", error);
  try {
    await disconnectDB();
  } catch {
    // Ignore cleanup failure after the primary error.
  }
  process.exit(1);
});
