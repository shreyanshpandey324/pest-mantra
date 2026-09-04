const targets = [
  {
    name: "Backend health",
    base: process.env.PEST_MANTRA_API_URL,
    path: "/health",
  },
  {
    name: "Backend readiness",
    base: process.env.PEST_MANTRA_API_URL,
    path: "/ready",
  },
  {
    name: "Admin health",
    base: process.env.PEST_MANTRA_ADMIN_URL,
    path: "/api/health",
  },
  {
    name: "Admin login",
    base: process.env.PEST_MANTRA_ADMIN_URL,
    path: "/login",
  },
  {
    name: "Technician health",
    base: process.env.PEST_MANTRA_TECHNICIAN_URL,
    path: "/api/health",
  },
  {
    name: "Technician login",
    base: process.env.PEST_MANTRA_TECHNICIAN_URL,
    path: "/login",
  },
];

const missing = [
  "PEST_MANTRA_API_URL",
  "PEST_MANTRA_ADMIN_URL",
  "PEST_MANTRA_TECHNICIAN_URL",
].filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing live URL variable(s): ${missing.join(", ")}`);
  console.error("Set the three deployed origins, then run npm run smoke:live.");
  process.exit(1);
}

let failures = 0;

for (const target of targets) {
  const url = new URL(target.path, target.base).toString();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "Pest-Mantra-Smoke-Test/1.0" },
    });

    if (!response.ok) {
      failures += 1;
      console.error(`FAIL ${target.name}: HTTP ${response.status} (${url})`);
      continue;
    }

    console.log(`PASS ${target.name}: HTTP ${response.status}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${target.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) {
  console.error(`Live smoke test failed: ${failures} check(s).`);
  process.exit(1);
}

console.log("Live smoke test passed.");
