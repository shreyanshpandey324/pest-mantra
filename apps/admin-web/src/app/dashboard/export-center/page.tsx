import { cookies } from "next/headers";
import { ExportCenterClient } from "@/components/ExportCenterClient";
import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";

type Row = Record<string, unknown>;

function rowsFromSettled<T extends Record<string, unknown>>(
  result: PromiseSettledResult<T>,
  key: keyof T,
): Row[] {
  if (result.status !== "fulfilled") return [];
  const value = result.value[key];
  return Array.isArray(value) ? (value as Row[]) : [];
}

export default async function ExportCenterPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  const results = await Promise.allSettled([
    backendFetch<{ projects: Row[] }>("/projects", { accessToken: token }),
    backendFetch<{ invoices: Row[] }>("/invoices", { accessToken: token }),
    backendFetch<{ leads: Row[] }>("/leads?page=1&pageSize=500", { accessToken: token }),
    backendFetch<{ contracts: Row[] }>("/service-contracts", { accessToken: token }),
    backendFetch<{ expenses: Row[] }>("/expenses", { accessToken: token }),
    backendFetch<{ complaints: Row[] }>("/complaints?page=1&pageSize=500", { accessToken: token }),
  ]);

  const datasets = [
    { name: "Projects & Jobs", filename: "pest-mantra-projects.csv", rows: rowsFromSettled(results[0], "projects") },
    { name: "Invoices & Payments", filename: "pest-mantra-invoices.csv", rows: rowsFromSettled(results[1], "invoices") },
    { name: "CRM Leads", filename: "pest-mantra-leads.csv", rows: rowsFromSettled(results[2], "leads") },
    { name: "AMC Contracts", filename: "pest-mantra-amc.csv", rows: rowsFromSettled(results[3], "contracts") },
    { name: "Expenses", filename: "pest-mantra-expenses.csv", rows: rowsFromSettled(results[4], "expenses") },
    { name: "Complaints", filename: "pest-mantra-complaints.csv", rows: rowsFromSettled(results[5], "complaints") },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Data portability</p>
        <h1 className="mt-1 text-3xl font-semibold">Export Center</h1>
        <p className="mt-2 text-sm text-ink-muted">One-click CSV exports for handover, offline analysis, finance teams and migration workflows.</p>
      </header>
      <ExportCenterClient datasets={datasets} />
    </div>
  );
}
