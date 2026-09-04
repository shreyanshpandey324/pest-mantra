"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ServiceReportSummary } from "@/types/serviceReport";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";

interface ServiceReportsClientProps {
  initialReports: ServiceReportSummary[];
}

function serviceLabel(value: string) {
  return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " ");
}

function dateLabel(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServiceReportsClient({ initialReports }: ServiceReportsClientProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "finalized">("all");
  const [serviceType, setServiceType] = useState("all");

  const serviceTypes = useMemo(
    () => [...new Set(initialReports.map((report) => report.serviceType))].sort(),
    [initialReports]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialReports.filter((report) => {
      if (status !== "all" && report.status !== status) return false;
      if (serviceType !== "all" && report.serviceType !== serviceType) return false;
      if (!q) return true;
      return [
        report.reportNumber,
        report.projectCode,
        report.verificationCode,
        report.customerName,
        report.technicianName,
        report.companyName,
        report.branchName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [initialReports, search, serviceType, status]);

  const finalized = initialReports.filter((report) => report.status === "finalized").length;
  const drafts = initialReports.length - finalized;
  const today = new Date();
  const todayCount = initialReports.filter((report) => {
    const raw = report.finalizedAt ?? report.createdAt;
    const date = new Date(raw);
    return date.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Field evidence</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">Service Reports</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Signed treatment records with before/after evidence, chemical usage and public verification.
          </p>
        </div>
        <div className="rounded-2xl border border-border-default bg-surface px-4 py-3 text-xs text-ink-muted">
          <span className="font-mono text-accent">QR VERIFIED</span> · Customer signatures stay private
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total reports", initialReports.length, "All service records"],
          ["Finalized", finalized, "Signed & locked"],
          ["Draft", drafts, "Awaiting completion"],
          ["Today", todayCount, "Created/finalized today"],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="rounded-[24px] border border-border-default/70 bg-gradient-to-br from-surface via-surface-2 to-surface p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
            <p className="mt-2 text-xs text-ink-muted">{hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-border-default bg-surface p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search report, job, customer, technician or verification code…"
            className="h-11 rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-11 rounded-xl border border-border-default bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent">
            <option value="all">All statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
          </select>
          <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="h-11 rounded-xl border border-border-default bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent">
            <option value="all">All service types</option>
            {serviceTypes.map((type) => <option key={type} value={type}>{serviceLabel(type)}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border-default bg-surface px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-xl text-accent">✓</div>
          <h2 className="mt-4 text-lg font-semibold text-ink">No service reports found</h2>
          <p className="mt-2 text-sm text-ink-muted">Signed reports appear here when technicians complete jobs.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-border-default bg-surface">
          <div className="hidden grid-cols-[1.05fr_0.9fr_0.9fr_0.8fr_0.7fr_100px] gap-4 border-b border-border-default bg-surface-2/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint lg:grid">
            <span>Report / job</span><span>Customer</span><span>Technician</span><span>Service</span><span>Completed</span><span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-border-default">
            {filtered.map((report) => (
              <div key={report._id} className="grid gap-4 px-5 py-5 transition hover:bg-surface-2/40 lg:grid-cols-[1.05fr_0.9fr_0.9fr_0.8fr_0.7fr_100px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs font-semibold text-ink">{report.reportNumber}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${report.status === "finalized" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>{report.status}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">{report.projectCode} · {report.verificationCode}</p>
                </div>
                <div><p className="text-sm font-medium text-ink">{report.customerName}</p><p className="mt-1 text-xs text-ink-faint">{report.companyName ?? "Pest Mantra"}</p></div>
                <div><p className="text-sm text-ink">{report.technicianName}</p><p className="mt-1 text-xs text-ink-faint">{report.branchName ?? "—"}</p></div>
                <div><p className="text-sm capitalize text-ink-muted">{serviceLabel(report.serviceType)}</p></div>
                <div><p className="text-xs text-ink-muted">{dateLabel(report.completedAt ?? report.finalizedAt ?? report.createdAt)}</p></div>
                <div className="lg:text-right"><Link href={`/dashboard/projects/${report.projectId}/service-report`} className="inline-flex h-9 items-center justify-center rounded-lg border border-border-default px-3 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent">View</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
