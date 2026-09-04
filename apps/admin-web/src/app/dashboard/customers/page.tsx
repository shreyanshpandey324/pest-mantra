import Link from "next/link";
import { cookies } from "next/headers";

import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { ui } from "@/lib/ui-classes";
import { Invoice } from "@/types/invoice";
import { Lead, LeadListResponse } from "@/types/lead";
import { Project } from "@/types/project";
import { Quotation } from "@/types/quotation";
import { ServiceContract } from "@/types/serviceContract";
import { ServiceReminder, ServiceReminderListResponse } from "@/types/serviceReminder";

interface Customer360PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface CustomerSnapshot {
  key: string;
  name: string;
  phone: string;
  addresses: Set<string>;
  projects: Project[];
  invoices: Invoice[];
  quotations: Quotation[];
  contracts: ServiceContract[];
  leads: Lead[];
  reminders: ServiceReminder[];
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function customerKey(phone: string | undefined, name: string): string {
  const normalizedPhone = (phone ?? "").replace(/\D/g, "");
  return normalizedPhone || `name:${name.trim().toLowerCase()}`;
}

function ensureCustomer(
  map: Map<string, CustomerSnapshot>,
  name: string,
  phone: string | undefined,
  address?: string
): CustomerSnapshot {
  const key = customerKey(phone, name);
  let customer = map.get(key);

  if (!customer) {
    customer = {
      key,
      name,
      phone: phone ?? "",
      addresses: new Set<string>(),
      projects: [],
      invoices: [],
      quotations: [],
      contracts: [],
      leads: [],
      reminders: [],
    };
    map.set(key, customer);
  }

  if (name.length > customer.name.length) customer.name = name;
  if (!customer.phone && phone) customer.phone = phone;
  if (address?.trim()) customer.addresses.add(address.trim());
  return customer;
}

function customerHealth(input: {
  jobs: number;
  billed: number;
  collected: number;
  outstanding: number;
  activeContracts: number;
  overdueReminders: number;
  openLeads: number;
}) {
  let score = 68;
  const reasons: string[] = [];

  if (input.jobs >= 4) { score += 10; reasons.push("repeat customer"); }
  else if (input.jobs >= 2) score += 5;

  if (input.activeContracts > 0) { score += 12; reasons.push("active AMC"); }
  if (input.collected >= 50000) { score += 8; reasons.push("high lifetime value"); }

  const dueRatio = input.billed > 0 ? input.outstanding / input.billed : 0;
  if (dueRatio > 0.5) { score -= 24; reasons.push("high payment exposure"); }
  else if (dueRatio > 0.15) { score -= 10; reasons.push("payment due"); }
  else if (input.billed > 0) score += 5;

  if (input.overdueReminders > 0) { score -= Math.min(18, input.overdueReminders * 7); reasons.push("service overdue"); }
  if (input.openLeads > 0) score += 3;

  score = Math.max(0, Math.min(100, score));
  const label = score >= 88 ? "VIP / Loyal" : score >= 72 ? "Healthy" : score >= 55 ? "Watch" : "At Risk";
  const tone = score >= 72 ? "text-success border-success/30 bg-success/5" : score >= 55 ? "text-warning border-warning/30 bg-warning/5" : "text-danger border-danger/30 bg-danger/5";
  return { score, label, tone, reasons };
}

function Metric({ label, value, emphasis = false }: { label: string; value: string | number; emphasis?: boolean }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${emphasis ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export default async function Customer360Page({ searchParams }: Customer360PageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 120);
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;

  const customers = new Map<string, CustomerSnapshot>();
  const warnings: string[] = [];

  if (query.length >= 2) {
    const encoded = encodeURIComponent(query);
    const results = await Promise.allSettled([
      backendFetch<{ projects: Project[] }>(`/projects?search=${encoded}`, { accessToken: token }),
      backendFetch<{ invoices: Invoice[] }>(`/invoices?search=${encoded}`, { accessToken: token }),
      backendFetch<{ quotations: Quotation[] }>(`/quotations?search=${encoded}`, { accessToken: token }),
      backendFetch<{ contracts: ServiceContract[] }>(`/service-contracts?search=${encoded}`, { accessToken: token }),
      backendFetch<LeadListResponse>(`/leads?page=1&pageSize=100&search=${encoded}`, { accessToken: token }),
      backendFetch<ServiceReminderListResponse>(`/service-reminders?page=1&pageSize=100&search=${encoded}`, { accessToken: token }),
    ]);

    const [projectsResult, invoicesResult, quotationsResult, contractsResult, leadsResult, remindersResult] = results;

    if (projectsResult.status === "fulfilled") {
      for (const item of projectsResult.value.projects ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).projects.push(item);
      }
    } else warnings.push("Projects could not be searched.");

    if (invoicesResult.status === "fulfilled") {
      for (const item of invoicesResult.value.invoices ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).invoices.push(item);
      }
    } else warnings.push("Invoices could not be searched.");

    if (quotationsResult.status === "fulfilled") {
      for (const item of quotationsResult.value.quotations ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).quotations.push(item);
      }
    } else warnings.push("Quotations could not be searched.");

    if (contractsResult.status === "fulfilled") {
      for (const item of contractsResult.value.contracts ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).contracts.push(item);
      }
    } else warnings.push("AMC contracts could not be searched.");

    if (leadsResult.status === "fulfilled") {
      for (const item of leadsResult.value.leads ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).leads.push(item);
      }
    } else warnings.push("Leads could not be searched.");

    if (remindersResult.status === "fulfilled") {
      for (const item of remindersResult.value.reminders ?? []) {
        ensureCustomer(customers, item.customerName, item.customerPhone, item.address).reminders.push(item);
      }
    } else warnings.push("Service reminders could not be searched.");
  }

  const snapshots = [...customers.values()].sort((a, b) => {
    const aActivity = a.projects.length + a.invoices.length + a.quotations.length + a.contracts.length + a.leads.length;
    const bActivity = b.projects.length + b.invoices.length + b.quotations.length + b.contracts.length + b.leads.length;
    return bActivity - aActivity || a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Customer intelligence</p>
          <h1 className="mt-1 text-3xl font-semibold">Customer 360</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink-muted">
            Search a customer by mobile number or name and see service, sales, AMC and payment history in one place.
          </p>
        </div>
        <Link href="/dashboard/leads/new" className={ui.btnGhost}>+ New lead</Link>
      </header>

      <form method="get" className={`${ui.card} p-4 sm:p-5`}>
        <label className="block">
          <span className={ui.label}>Customer name / mobile / address / reference</span>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              minLength={2}
              maxLength={120}
              className={ui.input}
              placeholder="e.g. 9876543210, Rahul, PM-2026…"
              autoFocus
            />
            <button className={`${ui.btnPrimary} shrink-0`} type="submit">Search customer</button>
          </div>
        </label>
      </form>

      {warnings.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Partial results: {warnings.join(" ")}
        </div>
      ) : null}

      {query.length > 0 && query.length < 2 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">Enter at least 2 characters.</div>
      ) : null}

      {query.length >= 2 && snapshots.length === 0 ? (
        <div className={`${ui.card} p-10 text-center`}>
          <p className="text-lg font-semibold">No customer records found</p>
          <p className="mt-2 text-sm text-ink-muted">Try the full 10-digit phone number or a shorter customer name.</p>
        </div>
      ) : null}

      <div className="space-y-5">
        {snapshots.map((customer) => {
          const billed = customer.invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0);
          const collected = customer.invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
          const outstanding = customer.invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);
          const activeContracts = customer.contracts.filter((contract) => contract.status === "active").length;
          const nextReminder = [...customer.reminders].sort(
            (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          )[0];
          const latestProject = [...customer.projects].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          const overdueReminders = customer.reminders.filter((reminder) => reminder.daysUntil < 0 && reminder.status === "active").length;
          const health = customerHealth({
            jobs: customer.projects.length,
            billed,
            collected,
            outstanding,
            activeContracts,
            overdueReminders,
            openLeads: customer.leads.filter((lead) => !["won", "lost"].includes(lead.status)).length,
          });

          return (
            <section key={customer.key} className={`${ui.card} overflow-hidden`}>
              <div className="border-b border-border-default bg-surface-2/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xl font-semibold">{customer.name}</p>
                    <p className="mt-1 font-mono text-sm text-accent">{customer.phone || "Phone not stored"}</p>
                    {customer.addresses.size > 0 ? (
                      <p className="mt-2 max-w-3xl text-sm text-ink-muted">{[...customer.addresses].slice(0, 2).join(" · ")}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${health.tone}`} title={health.reasons.join(" · ") || "Customer activity score"}>
                      Health {health.score}/100 · {health.label}
                    </span>
                    {customer.phone ? (
                      <a href={`tel:+91${customer.phone.replace(/\D/g, "")}`} className={ui.btnGhostSm}>Call</a>
                    ) : null}
                    <Link href={`/dashboard/projects?search=${encodeURIComponent(customer.phone || customer.name)}`} className={ui.btnGhostSm}>All jobs</Link>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                  <Metric label="Health score" value={`${health.score}/100`} emphasis={health.score >= 72} />
                  <Metric label="Lifetime value" value={money(collected)} emphasis />
                  <Metric label="Jobs" value={customer.projects.length} />
                  <Metric label="Billed" value={money(billed)} />
                  <Metric label="Outstanding" value={money(outstanding)} />
                  <Metric label="Active AMC" value={activeContracts} />
                  <Metric label="Overdue service" value={overdueReminders} />
                  <Metric label="Next service" value={nextReminder ? shortDate(nextReminder.dueDate) : "—"} />
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-3">
                <div className="border-b border-border-default p-5 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Service history</p>
                  {latestProject ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-semibold">Latest: {latestProject.projectCode}</p>
                      <p className="text-ink-muted">{latestProject.serviceType.replace(/_/g, " ")} · {latestProject.status.replace(/_/g, " ")}</p>
                      <p className="text-ink-faint">Updated {shortDate(latestProject.updatedAt)}</p>
                      <Link href={`/dashboard/projects/${latestProject._id}`} className="inline-block text-accent hover:underline">Open latest job →</Link>
                    </div>
                  ) : <p className="mt-3 text-sm text-ink-faint">No service jobs found.</p>}
                </div>

                <div className="border-b border-border-default p-5 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Sales & finance</p>
                  <div className="mt-3 space-y-2 text-sm text-ink-muted">
                    <p>{customer.leads.length} lead(s) · {customer.quotations.length} quotation(s)</p>
                    <p>{customer.invoices.length} invoice(s) · {money(outstanding)} due</p>
                    {customer.invoices[0] ? (
                      <Link href={`/dashboard/invoices/${customer.invoices[0]._id}`} className="inline-block text-accent hover:underline">Open invoice history →</Link>
                    ) : customer.quotations[0] ? (
                      <Link href={`/dashboard/quotations/${customer.quotations[0]._id}`} className="inline-block text-accent hover:underline">Open quotation →</Link>
                    ) : null}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Retention</p>
                  <div className="mt-3 space-y-2 text-sm text-ink-muted">
                    <p>{activeContracts} active AMC contract(s)</p>
                    <p>{customer.reminders.length} active service reminder(s)</p>
                    {nextReminder ? <p>Next due: <span className="font-semibold text-ink">{shortDate(nextReminder.dueDate)}</span></p> : null}
                    {customer.contracts[0] ? (
                      <Link href={`/dashboard/service-contracts/${customer.contracts[0]._id}`} className="inline-block text-accent hover:underline">Open AMC →</Link>
                    ) : customer.reminders.length ? (
                      <Link href="/dashboard/service-reminders" className="inline-block text-accent hover:underline">Open reminders →</Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {query.length === 0 ? (
        <div className={`${ui.card} p-8 text-center`}>
          <p className="text-lg font-semibold">One search, full customer context</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-muted">
            Customer 360 combines projects, invoices, quotations, AMC contracts, CRM leads and next-service reminders without creating a second customer database.
          </p>
        </div>
      ) : null}
    </div>
  );
}
