"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";
import {
  CustomerPortalContract,
  CustomerPortalDashboardData,
  CustomerPortalInvoice,
  CustomerPortalProject,
  CustomerPortalQuotation,
  CustomerPortalReport,
  CustomerPortalReminder,
} from "@/types/customerPortal";

type Tab = "overview" | "reminders" | "jobs" | "quotations" | "invoices" | "amc" | "reports" | "support";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "reminders", label: "Service reminders" },
  { id: "jobs", label: "Jobs" },
  { id: "quotations", label: "Quotations" },
  { id: "invoices", label: "Invoices" },
  { id: "amc", label: "AMC" },
  { id: "reports", label: "Reports" },
  { id: "support", label: "Support" },
];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function date(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function service(value: string) {
  return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " ");
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(value: string) {
  if (["completed", "paid", "accepted", "active", "finalized"].includes(value)) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (["cancelled", "rejected", "void", "expired", "overdue"].includes(value)) return "border-red-400/20 bg-red-400/10 text-red-200";
  if (["partially_paid", "in_progress", "en_route", "sent", "issued"].includes(value)) return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  return "border-white/10 bg-white/[0.06] text-slate-300";
}

function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClass(value)}`}>{label(value)}</span>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-slate-400">◇</div>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function JobCard({ project }: { project: CustomerPortalProject }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-[11px] text-emerald-300">{project.projectCode}</p><h3 className="mt-1 text-base font-semibold capitalize text-white">{service(project.serviceType)}</h3></div>
        <Status value={project.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{project.address}</p>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-2xl bg-black/20 p-3"><p className="uppercase tracking-wider text-slate-600">Scheduled</p><p className="mt-1 font-semibold text-slate-300">{date(project.scheduledDate)}</p>{project.scheduledTimeSlot ? <p className="mt-0.5 text-slate-500">{project.scheduledTimeSlot}</p> : null}</div>
        <div className="rounded-2xl bg-black/20 p-3"><p className="uppercase tracking-wider text-slate-600">Technician</p><p className="mt-1 font-semibold text-slate-300">{project.technicianName ?? "To be assigned"}</p></div>
        <div className="rounded-2xl bg-black/20 p-3"><p className="uppercase tracking-wider text-slate-600">Completed</p><p className="mt-1 font-semibold text-slate-300">{date(project.completedAt)}</p></div>
      </div>
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: CustomerPortalInvoice }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-emerald-300">{invoice.invoiceNumber}</p><h3 className="mt-1 font-semibold capitalize text-white">{service(invoice.serviceType)}</h3></div><Status value={invoice.status} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Invoice total</p><p className="mt-1 text-lg font-bold text-white">{money(invoice.grandTotal)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Paid</p><p className="mt-1 text-lg font-bold text-emerald-300">{money(invoice.amountPaid)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Balance due</p><p className="mt-1 text-lg font-bold text-amber-200">{money(invoice.balanceDue)}</p></div></div>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500"><span>Due {date(invoice.dueDate)}</span><span>{invoice.payments.length} payment{invoice.payments.length === 1 ? "" : "s"}</span></div>
    </div>
  );
}

function ContractCard({ contract }: { contract: CustomerPortalContract }) {
  const completed = contract.visits.filter((visit) => visit.status === "completed").length;
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-emerald-300">{contract.contractNumber}</p><h3 className="mt-1 font-semibold capitalize text-white">{service(contract.serviceType)}</h3></div><Status value={contract.status} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Contract value</p><p className="mt-1 font-bold text-white">{money(contract.contractValue)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Frequency</p><p className="mt-1 font-semibold text-slate-300">{label(contract.frequency)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Visits</p><p className="mt-1 font-semibold text-slate-300">{completed}/{contract.includedVisits} completed</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Next visit</p><p className="mt-1 font-semibold text-slate-300">{date(contract.nextVisitDate)}</p></div></div>
      <div className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">{date(contract.startDate)} → {date(contract.endDate)}</div>
    </div>
  );
}

function ReminderCard({ reminder, busy, onRead }: { reminder: CustomerPortalReminder; busy: boolean; onRead: (id: string) => void }) {
  const tone = reminder.timing === "overdue" ? "border-red-400/20 bg-red-400/[0.06]" : reminder.timing === "due_today" || reminder.timing === "due_soon" ? "border-amber-300/20 bg-amber-300/[0.05]" : "border-emerald-400/15 bg-emerald-400/[0.045]";
  const timing = reminder.timing === "overdue" ? `${Math.abs(reminder.daysUntil)} day${Math.abs(reminder.daysUntil) === 1 ? "" : "s"} overdue` : reminder.timing === "due_today" ? "Due today" : reminder.daysUntil === 1 ? "Due tomorrow" : `${reminder.daysUntil} days to go`;
  return <div className={`rounded-[24px] border p-5 ${tone}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Next recommended service</p><h3 className="mt-2 text-lg font-semibold capitalize text-white">{service(reminder.serviceType)}</h3></div><div className="text-right"><p className="text-lg font-bold text-white">{date(reminder.dueDate)}</p><p className={`mt-1 text-xs font-bold ${reminder.timing === "overdue" ? "text-red-200" : reminder.timing === "due_today" || reminder.timing === "due_soon" ? "text-amber-200" : "text-emerald-300"}`}>{timing}</p></div></div>
    {reminder.notes ? <p className="mt-4 rounded-2xl bg-black/15 px-4 py-3 text-xs leading-5 text-slate-400">{reminder.notes}</p> : null}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs text-slate-500">Pest Mantra will keep this follow-up visible to you and the service team.</p>{!reminder.customerReadAt ? <button disabled={busy} onClick={() => onRead(reminder.id)} className="h-9 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-xs font-bold text-slate-200 transition hover:bg-white/[0.1] disabled:opacity-50">{busy ? "Saving…" : "Mark as seen"}</button> : <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Seen</span>}</div>
  </div>;
}

function ReportCard({ report }: { report: CustomerPortalReport }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-emerald-300">{report.reportNumber}</p><h3 className="mt-1 font-semibold capitalize text-white">{service(report.serviceType)}</h3></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Verified service</span></div>
      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div><p className="uppercase tracking-wider text-slate-600">Technician</p><p className="mt-1 font-semibold text-slate-300">{report.technicianName}</p></div><div><p className="uppercase tracking-wider text-slate-600">Completed</p><p className="mt-1 font-semibold text-slate-300">{date(report.completedAt)}</p></div><div><p className="uppercase tracking-wider text-slate-600">Feedback</p><p className="mt-1 font-semibold text-slate-300">{report.feedbackSubmitted ? `${report.feedbackRating ?? "—"}/5 submitted` : "Not submitted"}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2"><Link href={`/verify/service/${encodeURIComponent(report.verificationCode)}`} className="inline-flex h-10 items-center rounded-xl bg-emerald-400 px-4 text-xs font-black text-slate-950 transition hover:bg-emerald-300">View verified report</Link>{!report.feedbackSubmitted ? <Link href={`/feedback/${encodeURIComponent(report.verificationCode)}`} className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]">Rate this service</Link> : null}</div>
    </div>
  );
}

export function CustomerPortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<CustomerPortalDashboardData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [reminderBusyId, setReminderBusyId] = useState<string | null>(null);
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ projectId: "", subject: "", description: "", category: "service_quality", priority: "medium" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customer-portal/me", { cache: "no-store" });
      const json = (await response.json()) as { success?: boolean; data?: CustomerPortalDashboardData; message?: string };
      if (response.status === 401) {
        router.replace("/customer/login");
        return;
      }
      if (!response.ok || !json.success || !json.data) throw new Error(json.message ?? "Could not load your portal.");
      setData(json.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await fetch("/api/customer-portal/logout", { method: "POST" });
    router.replace("/customer/login");
    router.refresh();
  }

  async function markReminderRead(id: string) {
    setReminderBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/customer-portal/reminders/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not update service reminder.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update service reminder.");
    } finally {
      setReminderBusyId(null);
    }
  }

  async function createComplaint() {
    if (!complaintForm.subject.trim() || !complaintForm.description.trim()) {
      setError("Please add a complaint subject and details.");
      return;
    }
    setComplaintBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/customer-portal/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...complaintForm, projectId: complaintForm.projectId || undefined }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not register complaint.");
      setComplaintForm({ projectId: "", subject: "", description: "", category: "service_quality", priority: "medium" });
      await load();
      setTab("support");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not register complaint.");
    } finally {
      setComplaintBusy(false);
    }
  }

  async function decide(quotation: CustomerPortalQuotation, decision: "accepted" | "rejected") {
    const action = decision === "accepted" ? "accept" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} quotation ${quotation.quotationNumber}?`)) return;
    setDecisionId(quotation.id);
    setError(null);
    try {
      const response = await fetch(`/api/customer-portal/quotations/${encodeURIComponent(quotation.id)}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not update quotation.");
      await load();
      setTab("quotations");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update quotation.");
    } finally {
      setDecisionId(null);
    }
  }

  const recentJobs = useMemo(() => data?.projects.slice(0, 3) ?? [], [data]);
  const recentReports = useMemo(() => data?.reports.slice(0, 2) ?? [], [data]);

  if (loading && !data) {
    return <main className="min-h-screen bg-[#06100c] px-4 py-10 text-white"><div className="mx-auto max-w-6xl animate-pulse space-y-5"><div className="h-20 rounded-[28px] bg-white/[0.05]"/><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map((item)=><div key={item} className="h-32 rounded-[24px] bg-white/[0.05]"/>)}</div><div className="h-80 rounded-[28px] bg-white/[0.05]"/></div></main>;
  }

  if (!data) {
    return <main className="min-h-screen bg-[#06100c] px-4 py-12 text-white"><div className="mx-auto max-w-xl rounded-[30px] border border-red-400/20 bg-white/[0.04] p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-400/10 text-red-200">!</div><h1 className="mt-4 text-xl font-semibold">Customer portal unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-400">{error ?? "Please sign in again."}</p><button onClick={() => router.replace("/customer/login")} className="mt-6 h-11 rounded-xl bg-emerald-400 px-5 text-sm font-black text-slate-950">Back to sign in</button></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#06100c] text-white">
      <div className="border-b border-white/10 bg-[#08150f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 font-black text-slate-950">PM</div><div><p className="text-sm font-bold">{data.customer.companyName}</p><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Customer Portal</p></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{data.customer.name}</p><p className="text-xs text-slate-500">{data.customer.phone}</p></div><button type="button" onClick={logout} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white">Sign out</button></div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[30px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.10] via-white/[0.035] to-white/[0.025] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Welcome back</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hi, {data.customer.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Your Pest Mantra services, quotations, payments, contracts and verified reports — in one secure place.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{data.metrics.nextServiceReminder ? <button type="button" onClick={() => setTab("reminders")} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-left transition hover:bg-emerald-400/[0.12]"><p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Next service due</p><p className="mt-1 text-sm font-semibold text-white">{date(data.metrics.nextServiceReminder.dueDate)} · {service(data.metrics.nextServiceReminder.serviceType)}</p>{data.metrics.unreadServiceReminders > 0 ? <p className="mt-1 text-[10px] font-bold text-amber-200">{data.metrics.unreadServiceReminders} new reminder{data.metrics.unreadServiceReminders === 1 ? "" : "s"}</p> : null}</button> : null}{data.metrics.nextVisit ? <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Next AMC visit</p><p className="mt-1 text-sm font-semibold text-white">{date(data.metrics.nextVisit.dueDate)} · {service(data.metrics.nextVisit.serviceType)}</p></div> : null}</div></div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[{label:"Active jobs",value:String(data.metrics.activeJobs),hint:`${data.metrics.totalJobs} total services`},{label:"Outstanding",value:money(data.metrics.outstandingAmount),hint:"Across issued invoices"},{label:"Active AMC",value:String(data.metrics.activeContracts),hint:"Current service contracts"},{label:"Service reports",value:String(data.metrics.serviceReports),hint:"Verified completion records"}].map((item)=><div key={item.label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{item.label}</p><p className="mt-3 text-2xl font-semibold text-white">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.hint}</p></div>)}
        </div>

        <div className="mt-7 overflow-x-auto pb-1"><div className="inline-flex min-w-max gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5">{tabs.map((item)=><button key={item.id} type="button" onClick={()=>setTab(item.id)} className={`h-10 rounded-xl px-4 text-xs font-bold transition ${tab===item.id?"bg-emerald-400 text-slate-950":"text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>{item.label}</button>)}</div></div>

        {error ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

        <section className="mt-6 space-y-4">
          {tab === "overview" ? <>
            {data.reminders.length ? <div><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Next service reminders</h2><p className="mt-1 text-xs text-slate-500">Your upcoming follow-up dates from completed services.</p></div><button onClick={() => setTab("reminders")} className="text-xs font-bold text-emerald-300">View all</button></div><div className="space-y-3">{data.reminders.slice(0, 2).map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} busy={reminderBusyId === reminder.id} onRead={markReminderRead} />)}</div></div> : null}
            <div className="grid gap-6 lg:grid-cols-2"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent jobs</h2><button onClick={()=>setTab("jobs")} className="text-xs font-bold text-emerald-300">View all</button></div><div className="space-y-3">{recentJobs.length ? recentJobs.map((project)=><JobCard key={project.id} project={project}/>) : <Empty title="No jobs yet" text="Your service jobs will appear here once booked."/>}</div></div><div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent service reports</h2><button onClick={()=>setTab("reports")} className="text-xs font-bold text-emerald-300">View all</button></div><div className="space-y-3">{recentReports.length ? recentReports.map((report)=><ReportCard key={report.id} report={report}/>) : <Empty title="No service reports yet" text="Completed, verified service reports will appear here."/>}</div></div></div>
            {data.customer.addresses.length ? <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Service locations</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.customer.addresses.map((address)=><div key={address} className="rounded-2xl bg-black/20 px-4 py-3 text-sm text-slate-300">{address}</div>)}</div></div> : null}
          </> : null}

          {tab === "reminders" ? (data.reminders.length ? data.reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} busy={reminderBusyId === reminder.id} onRead={markReminderRead} />) : <Empty title="No service reminders" text="When a completed service has a recommended next-service date, it will appear here automatically."/>) : null}

          {tab === "jobs" ? (data.projects.length ? data.projects.map((project)=><JobCard key={project.id} project={project}/>) : <Empty title="No jobs found" text="There are no service jobs linked to this customer access yet."/>) : null}

          {tab === "quotations" ? (data.quotations.length ? data.quotations.map((quotation)=><div key={quotation.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-emerald-300">{quotation.quotationNumber}</p><h3 className="mt-1 font-semibold capitalize">{service(quotation.serviceType)}</h3></div><Status value={quotation.isExpired ? "expired" : quotation.status}/></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Grand total</p><p className="mt-1 text-xl font-bold">{money(quotation.grandTotal)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Valid until</p><p className="mt-1 font-semibold text-slate-300">{date(quotation.validUntil)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Line items</p><p className="mt-1 font-semibold text-slate-300">{quotation.items.length}</p></div></div><div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-black/15">{quotation.items.map((item,index)=><div key={`${item.description}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-xs"><div><p className="font-semibold text-slate-300">{item.description}</p><p className="mt-0.5 text-slate-600">{item.quantity} × {money(item.rate)}</p></div><p className="font-bold text-white">{money(item.amount)}</p></div>)}</div>{quotation.status === "sent" && !quotation.isExpired ? <div className="mt-5 flex flex-wrap gap-2"><button disabled={decisionId===quotation.id} onClick={()=>decide(quotation,"accepted")} className="h-11 rounded-xl bg-emerald-400 px-5 text-xs font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50">Accept quotation</button><button disabled={decisionId===quotation.id} onClick={()=>decide(quotation,"rejected")} className="h-11 rounded-xl border border-red-400/20 bg-red-400/10 px-5 text-xs font-bold text-red-200 hover:bg-red-400/15 disabled:opacity-50">Reject</button></div> : null}</div>) : <Empty title="No quotations" text="Quotations shared with this mobile number will appear here."/>) : null}

          {tab === "invoices" ? (data.invoices.length ? data.invoices.map((invoice)=><InvoiceCard key={invoice.id} invoice={invoice}/>) : <Empty title="No invoices" text="Invoices and payment balances will appear here after billing."/>) : null}
          {tab === "amc" ? (data.contracts.length ? data.contracts.map((contract)=><ContractCard key={contract.id} contract={contract}/>) : <Empty title="No AMC contracts" text="Active service contracts and upcoming visits will appear here."/>) : null}
          {tab === "reports" ? (data.reports.length ? data.reports.map((report)=><ReportCard key={report.id} report={report}/>) : <Empty title="No service reports" text="Verified reports will appear after a service is completed."/>) : null}
          {tab === "support" ? <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Raise a complaint</p>
              <h2 className="mt-2 text-lg font-semibold">Need help with a service?</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-xs text-slate-400">Related job<select value={complaintForm.projectId} onChange={(e)=>setComplaintForm({...complaintForm,projectId:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1712] px-3 py-2.5 text-sm text-white"><option value="">General complaint</option>{data.projects.map((project)=><option key={project.id} value={project.id}>{project.projectCode} · {service(project.serviceType)}</option>)}</select></label>
                <label className="block text-xs text-slate-400">Category<select value={complaintForm.category} onChange={(e)=>setComplaintForm({...complaintForm,category:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1712] px-3 py-2.5 text-sm text-white"><option value="service_quality">Service quality</option><option value="technician_behavior">Technician behaviour</option><option value="delay">Delay / no-show</option><option value="billing">Billing / payment</option><option value="chemical">Chemical / treatment</option><option value="revisit">Revisit required</option><option value="other">Other</option></select></label>
                <label className="block text-xs text-slate-400">Priority<select value={complaintForm.priority} onChange={(e)=>setComplaintForm({...complaintForm,priority:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1712] px-3 py-2.5 text-sm text-white"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label className="block text-xs text-slate-400">Subject<input value={complaintForm.subject} onChange={(e)=>setComplaintForm({...complaintForm,subject:e.target.value})} maxLength={200} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1712] px-3 py-2.5 text-sm text-white" placeholder="Briefly describe the issue"/></label>
                <label className="block text-xs text-slate-400">Details<textarea value={complaintForm.description} onChange={(e)=>setComplaintForm({...complaintForm,description:e.target.value})} maxLength={3000} rows={4} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1712] px-3 py-2.5 text-sm text-white" placeholder="What happened and what help do you need?"/></label>
                <button disabled={complaintBusy} onClick={()=>void createComplaint()} className="h-11 w-full rounded-xl bg-emerald-400 px-4 text-xs font-black text-slate-950 disabled:opacity-50">{complaintBusy?"Submitting…":"Submit complaint"}</button>
              </div>
            </div>
            <div><div className="mb-3"><h2 className="text-sm font-semibold">Your support tickets</h2><p className="mt-1 text-xs text-slate-500">Status, SLA target and resolution from the Pest Mantra team.</p></div>{data.complaints.length ? <div className="space-y-3">{data.complaints.map((item)=><div key={item.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[11px] text-emerald-300">{item.complaintNumber}</p><h3 className="mt-1 font-semibold text-white">{item.subject}</h3></div><Status value={item.status}/></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div><p className="uppercase tracking-wider text-slate-600">Priority</p><p className="mt-1 font-semibold text-slate-300">{label(item.priority)}</p></div><div><p className="uppercase tracking-wider text-slate-600">Category</p><p className="mt-1 font-semibold text-slate-300">{label(item.category)}</p></div><div><p className="uppercase tracking-wider text-slate-600">SLA target</p><p className="mt-1 font-semibold text-slate-300">{new Date(item.slaDueAt).toLocaleString("en-IN")}</p></div></div>{item.resolution ? <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Resolution</p><p className="mt-2 text-xs leading-5 text-slate-300">{item.resolution}</p></div> : null}</div>)}</div> : <Empty title="No support tickets" text="You can raise a service complaint here and track the resolution."/>}</div>
          </div> : null}
        </section>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-[11px] leading-5 text-slate-600">Secure customer access · Your portal only shows records linked to your verified company, branch and mobile number.</footer>
      </div>
    </main>
  );
}
