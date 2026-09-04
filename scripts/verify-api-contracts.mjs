import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function normaliseRoute(value) {
  const withoutOrigin = value.replace(/^https?:\/\/[^/]+/i, "");
  const withoutApiPrefix = withoutOrigin.replace(/^\/api\/v1(?=\/|$)/, "");
  const withoutQuery = withoutApiPrefix.split(/[?#]/, 1)[0];
  const dynamic = withoutQuery
    .replace(/\[[^/\]]+\]/g, "*")
    .replace(/:[^/]+/g, "*")
    .replace(/\*+/g, "*")
    // A final interpolation immediately after a path segment is how the
    // BFF handlers append an optional query string (`/projects${query}`).
    // It is not an extra URL segment and should not affect route matching.
    .replace(/([^/])\*$/, "$1");
  const clean = `/${dynamic}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return clean || "/";
}

function routesMatch(left, right) {
  const a = normaliseRoute(left).split("/").filter(Boolean);
  const b = normaliseRoute(right).split("/").filter(Boolean);
  return a.length === b.length && a.every((part, index) => part === "*" || b[index] === "*" || part === b[index]);
}

function matchingDelimiter(character) {
  return character === "(" ? ")" : character === "{" ? "}" : character === "[" ? "]" : character === "<" ? ">" : "";
}

function skipQuoted(source, start) {
  const quote = source[start];
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === quote) return index + 1;
  }
  return source.length;
}

function skipTemplate(source, start) {
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === "`") return index + 1;
    if (source[index] === "$" && source[index + 1] === "{") {
      index = skipBalanced(source, index + 1) - 1;
    }
  }
  return source.length;
}

function skipBalanced(source, start) {
  const close = matchingDelimiter(source[start]);
  if (!close) return start + 1;
  let depth = 1;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\"" || character === "'") {
      index = skipQuoted(source, index) - 1;
      continue;
    }
    if (character === "`") {
      index = skipTemplate(source, index) - 1;
      continue;
    }
    if (character === source[start]) depth += 1;
    if (character === close) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return source.length;
}

function readStringOrTemplate(source, start) {
  const quote = source[start];
  if (quote === "\"" || quote === "'") {
    const end = skipQuoted(source, start);
    return { value: source.slice(start + 1, end - 1), end };
  }
  if (quote !== "`") return null;

  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === "\\") {
      value += source[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (source[index] === "`") return { value, end: index + 1 };
    if (source[index] === "$" && source[index + 1] === "{") {
      value += "*";
      index = skipBalanced(source, index + 1) - 1;
      continue;
    }
    value += source[index];
  }
  return null;
}

function skipWhitespace(source, start) {
  let index = start;
  while (/\s/.test(source[index] ?? "")) index += 1;
  return index;
}

function findCalls(source, callee) {
  const calls = [];
  const pattern = new RegExp(`\\b${callee}\\b`, "g");
  for (const match of source.matchAll(pattern)) {
    let index = skipWhitespace(source, match.index + match[0].length);
    if (source[index] === "<") index = skipWhitespace(source, skipBalanced(source, index));
    if (source[index] !== "(") continue;
    const callEnd = skipBalanced(source, index);
    const argumentStart = skipWhitespace(source, index + 1);
    const firstArgument = readStringOrTemplate(source, argumentStart);
    if (!firstArgument) continue;
    calls.push({
      index: match.index,
      value: firstArgument.value,
      text: source.slice(index, callEnd),
    });
  }
  return calls;
}

function exportedMethodBefore(source, index) {
  let method = null;
  const pattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
  for (const match of source.slice(0, index).matchAll(pattern)) method = match[1];
  return method;
}

function methodForCall(call) {
  return call.text.match(/\bmethod\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/)?.[1] ?? "GET";
}

function backendRoutes() {
  const indexSource = read("apps/backend/src/routes/index.ts");
  const imports = new Map();
  for (const match of indexSource.matchAll(/import\s+(\w+)\s+from\s+["']\.\/([^"']+\.routes)["']/g)) {
    imports.set(match[1], `apps/backend/src/routes/${match[2]}.ts`);
  }

  const mounts = [];
  for (const match of indexSource.matchAll(/router\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)\s*\)/g)) {
    const routeFile = imports.get(match[2]);
    if (!routeFile) failures.push(`Backend mount ${match[2]} does not resolve to an imported route file.`);
    else mounts.push({ base: match[1], routeFile });
  }

  const routes = [];
  for (const { base, routeFile } of mounts) {
    const source = read(routeFile);
    const pattern = /\b(?:router|r)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
    for (const match of source.matchAll(pattern)) {
      routes.push({
        method: match[1].toUpperCase(),
        path: normaliseRoute(`${base}/${match[2]}`),
        file: routeFile,
        line: lineNumber(source, match.index),
      });
    }
  }
  return routes;
}

function nextRoutes(app) {
  const apiRoot = path.join(root, "apps", app, "src", "app", "api");
  const routes = [];
  for (const absolute of walk(apiRoot, []).filter((file) => file.endsWith(`${path.sep}route.ts`))) {
    const source = fs.readFileSync(absolute, "utf8");
    const relativeDirectory = path.relative(apiRoot, path.dirname(absolute)).split(path.sep).join("/");
    const routePath = normaliseRoute(`/api/${relativeDirectory}`);
    for (const match of source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) {
      routes.push({ method: match[1], path: routePath, file: path.relative(root, absolute) });
    }
  }
  return routes;
}

function checkBackendCalls(routes, app) {
  const sourceRoot = path.join(root, "apps", app, "src");
  let count = 0;
  for (const absolute of walk(sourceRoot, []).filter((file) => /\.(?:ts|tsx)$/.test(file))) {
    const source = fs.readFileSync(absolute, "utf8");
    const relative = path.relative(root, absolute);
    for (const call of findCalls(source, "backendFetch")) {
      if (!call.value.startsWith("/")) continue;
      count += 1;
      const method = methodForCall(call);
      const requestPath = normaliseRoute(call.value);
      if (!routes.some((route) => route.method === method && routesMatch(route.path, requestPath))) {
        failures.push(`${relative}:${lineNumber(source, call.index)} calls missing backend route ${method} ${requestPath}.`);
      }
    }

    for (const call of findCalls(source, "fetch")) {
      if (!call.value.startsWith("*/")) continue;
      count += 1;
      const method = methodForCall(call);
      const requestPath = normaliseRoute(call.value.slice(1));
      if (!routes.some((route) => route.method === method && routesMatch(route.path, requestPath))) {
        failures.push(`${relative}:${lineNumber(source, call.index)} calls missing raw backend route ${method} ${requestPath}.`);
      }
    }
  }
  return count;
}

function checkBrowserCalls(routes, app) {
  const sourceRoot = path.join(root, "apps", app, "src");
  let count = 0;
  for (const absolute of walk(sourceRoot, []).filter((file) => /\.(?:ts|tsx)$/.test(file))) {
    if (absolute.includes(`${path.sep}app${path.sep}api${path.sep}`)) continue;
    const source = fs.readFileSync(absolute, "utf8");
    const relative = path.relative(root, absolute);
    for (const call of findCalls(source, "fetch")) {
      if (!call.value.startsWith("/api/")) continue;
      count += 1;
      const method = methodForCall(call);
      const requestPath = normaliseRoute(call.value);
      if (!routes.some((route) => route.method === method && routesMatch(route.path, requestPath))) {
        failures.push(`${relative}:${lineNumber(source, call.index)} calls missing Next route ${method} ${requestPath}.`);
      }
    }
  }
  return count;
}

function checkNextRouteAuthentication(app) {
  const apiRoot = path.join(root, "apps", app, "src", "app", "api");
  const publicRoutes = new Set(
    app === "admin-web"
      ? [
          "/api/health",
          "/api/auth/login",
          "/api/auth/otp/eligibility",
          "/api/auth/otp/verify",
          "/api/feedback/public/*",
          "/api/customer-portal/login",
        ]
      : [
          "/api/health",
          "/api/auth/otp/eligibility",
          "/api/auth/otp/verify",
        ],
  );
  let count = 0;
  for (const absolute of walk(apiRoot, []).filter((file) => file.endsWith(`${path.sep}route.ts`))) {
    const source = fs.readFileSync(absolute, "utf8");
    const relativeDirectory = path.relative(apiRoot, path.dirname(absolute)).split(path.sep).join("/");
    const routePath = normaliseRoute(`/api/${relativeDirectory}`);
    if (publicRoutes.has(routePath)) continue;
    count += 1;
    if (
      !/\brequireAccessToken\b|\bACCESS_COOKIE_NAME\b|\bREFRESH_COOKIE_NAME\b|\bCUSTOMER_PORTAL_COOKIE_NAME\b/.test(
        source,
      )
    ) {
      failures.push(`${path.relative(root, absolute)} has no recognized session/authentication guard.`);
    }
  }
  return count;
}

function checkRouteControllers() {
  const routeRoot = path.join(root, "apps", "backend", "src", "routes");
  let count = 0;
  for (const absolute of walk(routeRoot, []).filter((file) => file.endsWith(".routes.ts") && !file.endsWith(`${path.sep}index.ts`))) {
    const source = fs.readFileSync(absolute, "utf8");
    const aliases = new Map();
    for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/controllers\/([^"']+)["']/g)) {
      for (const item of match[1].split(",")) {
        const parts = item.trim().split(/\s+as\s+/);
        if (parts[0]) aliases.set(parts[1] ?? parts[0], `apps/backend/src/controllers/${match[2]}.ts`);
      }
    }
    for (const match of source.matchAll(/\b(\w+Controller|c)\.(\w+)\b/g)) {
      const controllerFile = aliases.get(match[1]);
      if (!controllerFile) continue;
      count += 1;
      const controllerSource = read(controllerFile);
      if (!new RegExp(`\\b${match[2]}\\s*:`).test(controllerSource)) {
        failures.push(`${path.relative(root, absolute)}:${lineNumber(source, match.index)} references missing ${match[1]}.${match[2]} in ${controllerFile}.`);
      }
    }
  }
  return count;
}

const expressRoutes = backendRoutes();
const duplicateRoutes = new Map();
for (const route of expressRoutes) {
  const key = `${route.method} ${route.path}`;
  duplicateRoutes.set(key, [...(duplicateRoutes.get(key) ?? []), route]);
}
for (const [key, routes] of duplicateRoutes) {
  if (routes.length > 1) failures.push(`Duplicate mounted backend route ${key}: ${routes.map((route) => `${route.file}:${route.line}`).join(", ")}.`);
}

const adminNextRoutes = nextRoutes("admin-web");
const technicianNextRoutes = nextRoutes("technician-app");
if (expressRoutes.length < 150) failures.push(`Expected at least 150 mounted backend routes, found ${expressRoutes.length}.`);
if (adminNextRoutes.length + technicianNextRoutes.length < 149) {
  failures.push(`Expected at least 149 Next route methods, found ${adminNextRoutes.length + technicianNextRoutes.length}.`);
}
const backendCallCount = checkBackendCalls(expressRoutes, "admin-web") + checkBackendCalls(expressRoutes, "technician-app");
const browserCallCount = checkBrowserCalls(adminNextRoutes, "admin-web") + checkBrowserCalls(technicianNextRoutes, "technician-app");
const controllerReferenceCount = checkRouteControllers();
const authenticatedRouteCount = checkNextRouteAuthentication("admin-web") + checkNextRouteAuthentication("technician-app");

if (failures.length) {
  console.error(`API contract verification failed (${failures.length} issue(s)):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `API contract verification passed: ${expressRoutes.length} backend routes, ${adminNextRoutes.length + technicianNextRoutes.length} Next route methods, ${backendCallCount} backend calls, ${browserCallCount} browser API calls, ${controllerReferenceCount} controller references, ${authenticatedRouteCount} protected Next routes checked.`,
);
