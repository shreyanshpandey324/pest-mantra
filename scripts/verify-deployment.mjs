import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

const requiredFiles = [
  "package.json",
  "package-lock.json",
  ".node-version",
  "render.yaml",
  "00_DEPLOYMENT_HANDOVER_START_HERE.md",
  "DEPLOYMENT_READINESS.md",
  "DEPLOYMENT_RUNBOOK.md",
  "CLIENT_UAT_CHECKLIST.md",
  "FINAL_HANDOVER_CHECKLIST.md",
  "FINAL_RELIABILITY_AUDIT_2026-09-03.md",
  "THIRD_PARTY_LICENSE_SUMMARY.md",
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  "scripts/verify-api-contracts.mjs",
  "apps/backend/.env.example",
  "apps/admin-web/.env.example",
  "apps/technician-app/.env.example",
  "apps/admin-web/src/app/api/health/route.ts",
  "apps/technician-app/src/app/api/health/route.ts",
  "apps/admin-web/src/app/error.tsx",
  "apps/technician-app/src/app/error.tsx",
  "apps/admin-web/src/app/not-found.tsx",
  "apps/technician-app/src/app/not-found.tsx",
];

for (const file of requiredFiles) check(exists(file), `Missing required deployment file: ${file}`);

const packageJson = JSON.parse(read("package.json"));
const lockfile = JSON.parse(read("package-lock.json"));
const expectedWorkspaces = ["apps/backend", "apps/admin-web", "apps/technician-app"];

check(
  JSON.stringify(packageJson.workspaces) === JSON.stringify(expectedWorkspaces),
  "Root workspaces do not match the three deployable applications."
);
check(lockfile.lockfileVersion === 3, "package-lock.json must use lockfileVersion 3.");
check(Boolean(packageJson.scripts?.["verify:deployment"]), "verify:deployment script is not registered.");
check(Boolean(packageJson.scripts?.["verify:api-contracts"]), "verify:api-contracts script is not registered.");
check(Boolean(packageJson.scripts?.["smoke:live"]), "smoke:live script is not registered.");
check(Boolean(packageJson.scripts?.["audit:prod"]), "Production dependency-audit script is not registered.");
check(read(".node-version").trim() === "24.20.0", "Supported Node.js runtime pin is missing or unexpected.");
check(packageJson.engines?.node === ">=24.20.0 <25", "Root Node.js engine range must match the pinned LTS major.");

const renderYaml = read("render.yaml");
for (const service of ["pest-mantra-api", "pest-mantra-admin", "pest-mantra-technician"]) {
  check(renderYaml.includes(`name: ${service}`), `render.yaml is missing service ${service}.`);
}
check(renderYaml.includes("healthCheckPath: /ready"), "Backend readiness health check is not configured.");
check(
  (renderYaml.match(/healthCheckPath: \/api\/health/g) ?? []).length === 2,
  "Both Next.js services must use /api/health."
);
check(renderYaml.includes("fromGroup: pest-mantra-shared-auth"), "Shared JWT access secret group is not attached.");
check(renderYaml.includes("BACKEND_INTERNAL_HOSTPORT"), "Private backend service discovery is not configured.");
check(renderYaml.includes("mountPath: /opt/render/project/src/apps/backend/uploads"), "Persistent upload disk is not configured.");
check(/key: MONGODB_URI\s+sync: false/m.test(renderYaml), "MongoDB URI must be supplied as a secret at deploy time.");
check(
  (renderYaml.match(/npm ci --include=dev --no-audit --no-fund/g) ?? []).length === 3,
  "Every Render build must install build-time devDependencies explicitly."
);
check(
  (renderYaml.match(/- \.node-version/g) ?? []).length === 3,
  "Every Render build filter must react to Node.js runtime-pin changes."
);

const uploadMiddleware = read("apps/backend/src/middleware/upload.middleware.ts");
check(uploadMiddleware.includes("mkdirSync(UPLOAD_DIR"), "Upload directory is not created automatically.");
check(uploadMiddleware.includes("env.UPLOAD_DIR"), "Upload directory is not configurable for production.");
check(uploadMiddleware.includes("validateImageSignature"), "Uploaded image signatures are not validated.");

for (const app of ["admin-web", "technician-app"]) {
  const backendClient = read(`apps/${app}/src/lib/backend-client.ts`);
  check(backendClient.includes("AbortSignal.timeout"), `${app} backend requests have no timeout protection.`);
}

const technicianServiceWorker = read("apps/technician-app/public/sw.js");
const shellBlock = technicianServiceWorker.match(/const SHELL = \[([^\]]*)\]/)?.[1] ?? "";
check(!shellBlock.includes('"/jobs"'), "Authenticated technician job HTML must never be pre-cached.");

const userService = read("apps/backend/src/services/user.service.ts");
check(
  userService.includes("user.isActive = false") &&
    userService.includes("Reassign or cancel this technician's active jobs"),
  "Staff removal must preserve history and protect active technician assignments."
);

const projectService = read("apps/backend/src/services/project.service.ts");
check(
  projectService.includes("assertProjectsCanBeDeleted") &&
    projectService.includes("ServiceContract.exists") &&
    projectService.includes("Invoice.exists"),
  "Project deletion must protect linked business records."
);

const communicationService = read("apps/backend/src/services/communication.service.ts");
check(
  communicationService.includes("OutboundStatus.PROCESSING") &&
    communicationService.includes('"x-idempotency-key"'),
  "Outbound delivery must use an atomic processing claim and idempotency key."
);

const setupScript = read("scripts/setup-real.mjs");
check(
  setupScript.includes('process.argv.includes("--force")') &&
    setupScript.includes("existingTargets.length && !force"),
  "Environment setup must not overwrite existing configuration without explicit force."
);

const technicianPackage = JSON.parse(read("apps/technician-app/package.json"));
check(technicianPackage.scripts?.start === "next start", "Technician production start must honor the platform PORT.");

const allFiles = walk(root);
const relativeFiles = allFiles.map((file) => path.relative(root, file));
const forbiddenArtifact = relativeFiles.find((file) =>
  file.split(path.sep).some((segment) => ["node_modules", ".next", "dist"].includes(segment))
);
check(!forbiddenArtifact, `Generated dependency/build artifact must not be packaged: ${forbiddenArtifact ?? ""}`);

const realEnvFile = relativeFiles.find((file) => {
  const name = path.basename(file);
  return name.startsWith(".env") && name !== ".env.example";
});
check(!realEnvFile, `Real environment file must not be packaged: ${realEnvFile ?? ""}`);

const sensitiveFilename = relativeFiles.find((file) =>
  /(?:firebase-adminsdk|service-account).*\.json$/i.test(path.basename(file)) ||
  /\.(?:pem|key|p12|pfx)$/i.test(path.basename(file))
);
check(!sensitiveFilename, `Private provider credential file must not be packaged: ${sensitiveFilename ?? ""}`);

const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".yml", ".yaml", ".md", ".txt"]);
const privateKeyHeader = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const privateKeyFooter = ["-----END", "PRIVATE KEY-----"].join(" ");
for (const absolute of allFiles) {
  if (!textExtensions.has(path.extname(absolute)) || fs.statSync(absolute).size > 2_000_000) continue;
  const content = fs.readFileSync(absolute, "utf8");
  const relative = path.relative(root, absolute);
  const documentedPlaceholder = `${privateKeyHeader}\\n...\\n${privateKeyFooter}`;
  if (
    content.includes(privateKeyHeader) &&
    content.includes(privateKeyFooter) &&
    !content.includes(documentedPlaceholder)
  ) {
    failures.push(`Private key material found in ${relative}.`);
  }
  if (/mongodb(?:\+srv)?:\/\/[^\s:@/]+:[^\s@/]+@/i.test(content)) {
    failures.push(`Credential-bearing MongoDB URI found in ${relative}.`);
  }
  const providerSecretPatterns = [
    /AKIA[0-9A-Z]{16}/,
    /AIza[0-9A-Za-z_-]{35}/,
    /gh[pousr]_[A-Za-z0-9]{36,255}/,
    /xox[baprs]-[A-Za-z0-9-]{20,}/,
    /sk_live_[0-9A-Za-z]{16,}/,
  ];
  if (providerSecretPatterns.some((pattern) => pattern.test(content))) {
    failures.push(`Likely provider credential found in ${relative}.`);
  }
  if (/^(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/m.test(content)) {
    failures.push(`Unresolved merge-conflict marker found in ${relative}.`);
  }
}

const invalidJsonFiles = [];
for (const absolute of allFiles.filter((file) => path.extname(file) === ".json")) {
  try {
    JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    invalidJsonFiles.push(`${path.relative(root, absolute)} (${error.message})`);
  }
}
check(
  invalidJsonFiles.length === 0,
  `Invalid JSON file(s): ${invalidJsonFiles.join(", ")}`
);

const appSourceRoots = [
  path.join(root, "apps/backend/src"),
  path.join(root, "apps/admin-web/src"),
  path.join(root, "apps/technician-app/src"),
];
const sourceFiles = allFiles.filter((file) => /\.(?:ts|tsx)$/.test(file) && !file.endsWith(".d.ts"));
const localImportPattern = /(?:from\s+|import\s*\(\s*|import\s*)["']([^"']+)["']/g;
const missingLocalImports = [];

for (const sourceFile of sourceFiles) {
  const sourceRoot = appSourceRoots.find((candidate) => sourceFile.startsWith(`${candidate}${path.sep}`));
  if (!sourceRoot) continue;
  const source = fs.readFileSync(sourceFile, "utf8");
  for (const match of source.matchAll(localImportPattern)) {
    const specifier = match[1];
    if (!(specifier.startsWith(".") || specifier.startsWith("@/"))) continue;
    const target = specifier.startsWith("@/")
      ? path.join(sourceRoot, specifier.slice(2))
      : path.resolve(path.dirname(sourceFile), specifier);
    const candidates = [
      target,
      ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"].map((extension) => `${target}${extension}`),
      ...["index.ts", "index.tsx", "index.js", "index.jsx", "index.mjs"].map((name) => path.join(target, name)),
    ];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      missingLocalImports.push(`${path.relative(root, sourceFile)} -> ${specifier}`);
    }
  }
}
check(
  missingLocalImports.length === 0,
  `Missing local import(s): ${missingLocalImports.join(", ")}`
);

function documentedEnvKeys(relativePath) {
  return new Set(
    [...read(relativePath).matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1])
  );
}

const backendEnvSource = read("apps/backend/src/config/env.ts");
const backendSchemaBlock = backendEnvSource.match(
  /const envSchema = z\.object\(\{([\s\S]*?)\n\}\);/
)?.[1] ?? "";
const backendSchemaKeys = [
  ...backendSchemaBlock.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm),
].map((match) => match[1]);
const backendDocumentedKeys = documentedEnvKeys("apps/backend/.env.example");
const missingBackendEnvDocs = backendSchemaKeys.filter((key) => !backendDocumentedKeys.has(key));
check(
  backendSchemaKeys.length > 0 && missingBackendEnvDocs.length === 0,
  `Backend environment template is incomplete: ${missingBackendEnvDocs.join(", ")}`
);

for (const app of ["admin-web", "technician-app"]) {
  const sourceRoot = path.join(root, "apps", app, "src");
  const documentedKeys = documentedEnvKeys(`apps/${app}/.env.example`);
  const referencedKeys = new Set();
  for (const absolute of walk(sourceRoot, [])) {
    if (!/\.(?:ts|tsx)$/.test(absolute)) continue;
    const source = fs.readFileSync(absolute, "utf8");
    for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      if (match[1] !== "NODE_ENV") referencedKeys.add(match[1]);
    }
  }
  const undocumentedKeys = [...referencedKeys].filter((key) => !documentedKeys.has(key));
  check(
    undocumentedKeys.length === 0,
    `${app} environment template is incomplete: ${undocumentedKeys.join(", ")}`
  );
}

if (!exists("node_modules")) {
  warnings.push("Dependencies are not installed; run npm ci before typecheck/build/test.");
}

if (warnings.length) {
  console.log("Deployment verification warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error(`Deployment verification failed (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Deployment verification passed: ${checks} checks, ${sourceFiles.length} TS/TSX files checked for local imports, ${warnings.length} warning(s).`
);
