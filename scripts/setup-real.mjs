import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const rl = createInterface({ input, output });
const root = process.cwd();
const force = process.argv.includes("--force");
const targets = ["apps/backend/.env", "apps/admin-web/.env.local", "apps/technician-app/.env.local"];

const existingTargets = targets.filter((file) => existsSync(join(root, file)));
if (existingTargets.length && !force) {
  console.error("\nSetup stopped so existing environment files are not overwritten:");
  for (const file of existingTargets) console.error(`  - ${file}`);
  console.error("\nBack them up first, or intentionally rerun: npm run setup:real -- --force\n");
  rl.close();
  process.exit(1);
}

const ask = async (q, required = true) => {
  while (true) {
    const value = (await rl.question(q)).trim();
    if (value || !required) return value;
    console.log("This value is required.");
  }
};

const askPassword = async (q, required = true) => {
  while (true) {
    const value = await ask(q, required);
    if (!value && !required) return value;
    if (value.length >= 8) return value;
    console.log("Use at least 8 characters.");
  }
};

const dotenvValue = (value) => JSON.stringify(String(value));

console.log("\nPest Mantra REAL MODE setup");
console.log("This creates local .env files. They are git-ignored and are not added to the source ZIP.\n");

const mongo = await ask("MongoDB connection URI (Atlas recommended): ");
if (!/^mongodb(?:\+srv)?:\/\//i.test(mongo)) {
  console.error("MongoDB URI must start with mongodb:// or mongodb+srv://");
  rl.close();
  process.exit(1);
}
const p1 = await askPassword("Shreyansh Pandey password: ");
const p2 = await askPassword("Aaryan password: ");
const p3 = await askPassword("Ajeet password: ");
const techPassword = await askPassword("Technician seed password (optional; Enter to skip): ", false);
const jwtAccess = randomBytes(48).toString("base64url");
const jwtRefresh = randomBytes(48).toString("base64url");

const backend = `NODE_ENV=development\nPORT=4000\nMONGODB_URI=${dotenvValue(mongo)}\nJWT_ACCESS_SECRET=${dotenvValue(jwtAccess)}\nJWT_REFRESH_SECRET=${dotenvValue(jwtRefresh)}\nJWT_ACCESS_EXPIRES_IN=15m\nJWT_REFRESH_EXPIRES_IN=7d\nCORS_ORIGINS=http://localhost:3000,http://localhost:3001\n\nSEED_SUPER_ADMIN_NAME=Shreyansh Pandey\nSEED_SUPER_ADMIN_PHONE=8076573177\nSEED_SUPER_ADMIN_EMAIL=shreyanshpandey@pestmantra.in\nSEED_SUPER_ADMIN_PASSWORD=${dotenvValue(p1)}\nSEED_SUPER_ADMIN_2_NAME=Aaryan\nSEED_SUPER_ADMIN_2_PHONE=8076532193\nSEED_SUPER_ADMIN_2_EMAIL=itzaaryan7781@gmail.com\nSEED_SUPER_ADMIN_2_PASSWORD=${dotenvValue(p2)}\nSEED_OFFICE_ADMIN_NAME=Ajeet\nSEED_OFFICE_ADMIN_PHONE=9910273207\nSEED_OFFICE_ADMIN_EMAIL=\nSEED_OFFICE_ADMIN_PASSWORD=${dotenvValue(p3)}\nSEED_OFFICE_ADMIN_BRANCH_ID=\nSEED_DEFAULT_COMPANY_NAME=Pest Mantra\nSEED_DEFAULT_BRANCH_NAME=Main Branch\nSEED_DEFAULT_BRANCH_CITY=Delhi\nSEED_DEFAULT_BRANCH_STATE=Delhi\nSEED_TECHNICIAN_COMPANY_ID=\nSEED_TECHNICIAN_PASSWORD=${techPassword ? dotenvValue(techPassword) : ""}\nOTP_BOOTSTRAP_PHONES=\nFIREBASE_PROJECT_ID=\nFIREBASE_CLIENT_EMAIL=\nFIREBASE_PRIVATE_KEY=\nBACKGROUND_JOBS_ENABLED=true\nBACKGROUND_JOB_INTERVAL_MINUTES=15\nCOMMUNICATION_PROVIDER=disabled\nCOMMUNICATION_MAX_ATTEMPTS=3\n`;

const admin = `BACKEND_API_URL=http://localhost:4000/api/v1\nBACKEND_REQUEST_TIMEOUT_MS=15000\nJWT_ACCESS_SECRET=${dotenvValue(jwtAccess)}\nNODE_ENV=development\nNEXT_PUBLIC_FIREBASE_API_KEY=\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=\nNEXT_PUBLIC_FIREBASE_APP_ID=\nNEXT_PUBLIC_GOOGLE_MAPS_API_KEY=\nNEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=\n`;

const tech = `BACKEND_API_URL=http://localhost:4000/api/v1\nBACKEND_REQUEST_TIMEOUT_MS=15000\nNEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:4000\nJWT_ACCESS_SECRET=${dotenvValue(jwtAccess)}\nNODE_ENV=development\nNEXT_PUBLIC_FIREBASE_API_KEY=\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=\nNEXT_PUBLIC_FIREBASE_APP_ID=\n`;

for (const [rel, content] of [["apps/backend/.env", backend], ["apps/admin-web/.env.local", admin], ["apps/technician-app/.env.local", tech]]) {
  const path = join(root, rel); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content, { mode: 0o600 }); console.log(`Created ${rel}`);
}

console.log("\nNext steps:");
console.log("1. npm run seed:staff");
console.log("2. npm run real");
console.log("3. Admin login: http://localhost:3000/login");
console.log("\nTechnician Phone OTP requires Firebase credentials. Admin mobile+password does not require Firebase.\n");
rl.close();
