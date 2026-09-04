import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const appRoots = ["apps/backend/src", "apps/admin-web/src", "apps/technician-app/src"].map((item) => path.join(root, item));
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
for (const dir of appRoots) walk(dir);

let syntaxErrors = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (!errors.length) continue;
  syntaxErrors += errors.length;
  console.error(`\n${path.relative(root, file)}`);
  for (const error of errors) console.error(ts.flattenDiagnosticMessageText(error.messageText, " "));
}

const missingImports = [];
const importPattern = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;
for (const file of files) {
  const base = appRoots.find((candidate) => file.startsWith(candidate));
  if (!base) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!(specifier.startsWith(".") || specifier.startsWith("@/"))) continue;
    const target = specifier.startsWith("@/") ? path.join(base, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
    const candidates = [target, `${target}.ts`, `${target}.tsx`, path.join(target, "index.ts"), path.join(target, "index.tsx")];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) missingImports.push(`${path.relative(root, file)} -> ${specifier}`);
  }
}

if (missingImports.length) {
  console.error("\nMissing local imports:");
  for (const item of missingImports) console.error(`- ${item}`);
}

console.log(`Checked ${files.length} TS/TSX files: ${syntaxErrors} syntax error(s), ${missingImports.length} missing local import(s).`);
if (syntaxErrors || missingImports.length) process.exit(1);
