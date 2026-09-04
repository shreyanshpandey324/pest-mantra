import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "apps/backend/.env",
  "apps/admin-web/.env.local",
  "apps/technician-app/.env.local",
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error("\nREAL MODE SETUP REQUIRED");
  console.error("Missing environment files:");
  for (const file of missing) console.error(`  - ${file}`);
  console.error("\nRun: npm run setup:real\n");
  process.exit(1);
}

const backendEnv = readFileSync(join(root, "apps/backend/.env"), "utf8");
const adminEnv = readFileSync(join(root, "apps/admin-web/.env.local"), "utf8");
const badMarkers = ["replace-with-a-long-random-secret", "replace-with-a-different-long-random-secret", "mongodb://localhost:27017/pest_mantra"];
if (badMarkers.some((m) => backendEnv.includes(m)) || adminEnv.includes("replace-with-a-long-random-secret")) {
  console.error("\nREAL MODE is not configured yet. Placeholder MongoDB/JWT values are still present.");
  console.error("Run: npm run setup:real\n");
  process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function run(args, label) {
  const child = spawn(npm, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`${label} exited with code ${code}`);
  });
  children.push(child);
  return child;
}

console.log("\nPest Mantra REAL MODE");
console.log("MongoDB + authenticated sessions are required.");
console.log("Admin Web:      http://localhost:3000/login");
console.log("Technician App: http://localhost:3001/login");
console.log("Backend API:    http://localhost:4000\n");

console.log("Building backend...");
const build = spawn(npm, ["run", "build:backend"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
build.on("exit", (code) => {
  if (code !== 0) {
    console.error("Backend build failed.");
    process.exit(code || 1);
  }
  run(["run", "start", "--workspace=@pest-mantra/backend"], "Backend");
  run(["run", "dev", "--workspace=@pest-mantra/admin-web", "--", "--hostname", "0.0.0.0", "-p", "3000"], "Admin Web");
  run(["run", "dev", "--workspace=@pest-mantra/technician-app", "--", "-p", "3001", "--hostname", "0.0.0.0"], "Technician App");

  if (process.platform === "win32") {
    setTimeout(() => spawn("cmd", ["/c", "start", "", "http://localhost:3000/login"], { detached: true, stdio: "ignore" }).unref(), 7000);
  }
});

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
