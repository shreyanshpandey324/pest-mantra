"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { ui } from "@/lib/ui-classes";

export interface IntelligenceSnapshot {
  todayJobs: number;
  activeToday: number;
  unassignedToday: number;
  onDutyTechnicians: number;
  technicianCount: number;
  overdueServices: number;
  overdueInvoices: number;
  outstandingAmount: string;
  openComplaints: number;
  complaintSlaBreaches: number;
  collectedMonth: string;
  estimatedProfit: string;
  averageRating: string;
}

interface CommandResult {
  title: string;
  answer: string;
  href: string;
  action: string;
}

const EXAMPLES = [
  "Give me today's business summary",
  "Show unassigned jobs",
  "Which services are overdue?",
  "Show overdue payments",
  "How is profit this month?",
];

function resolveCommand(raw: string, snapshot: IntelligenceSnapshot): CommandResult {
  const query = raw.trim().toLowerCase();

  if (!query || query.includes("summary") || query.includes("business today")) {
    return {
      title: "Today at a glance",
      answer: `${snapshot.todayJobs} jobs today, ${snapshot.activeToday} still active, ${snapshot.unassignedToday} waiting for dispatch and ${snapshot.onDutyTechnicians}/${snapshot.technicianCount} technicians on duty. Collections are ${snapshot.collectedMonth} this month with estimated profit ${snapshot.estimatedProfit}.`,
      href: "/dashboard/control-center",
      action: "Open Control Room",
    };
  }

  if (query.includes("unassigned") || query.includes("dispatch") || query.includes("pending job")) {
    return {
      title: "Dispatch attention",
      answer: `${snapshot.unassignedToday} job${snapshot.unassignedToday === 1 ? "" : "s"} need technician assignment today. Smart Dispatch ranks available technicians by duty state, skill match and current workload.`,
      href: "/dashboard/projects?view=unassigned",
      action: "Review unassigned jobs",
    };
  }

  if ((query.includes("service") || query.includes("reminder")) && (query.includes("overdue") || query.includes("due"))) {
    return {
      title: "Service retention risk",
      answer: `${snapshot.overdueServices} service reminder${snapshot.overdueServices === 1 ? " is" : "s are"} overdue. Prioritise these customers before repeat-service opportunities are lost.`,
      href: "/dashboard/service-reminders?timing=overdue",
      action: "Open overdue services",
    };
  }

  if (query.includes("invoice") || query.includes("payment") || query.includes("outstanding")) {
    return {
      title: "Collection position",
      answer: `${snapshot.overdueInvoices} overdue invoice${snapshot.overdueInvoices === 1 ? "" : "s"} are contributing to ${snapshot.outstandingAmount} outstanding.`,
      href: "/dashboard/invoices?status=overdue",
      action: "Open collections",
    };
  }

  if (query.includes("profit") || query.includes("revenue") || query.includes("collection")) {
    return {
      title: "Financial intelligence",
      answer: `Month-to-date collections are ${snapshot.collectedMonth}; estimated operating profit is ${snapshot.estimatedProfit}. Open the profitability workspace for service and branch contribution.`,
      href: "/dashboard/expenses",
      action: "Open profit intelligence",
    };
  }

  if (query.includes("complaint") || query.includes("sla")) {
    return {
      title: "Customer risk queue",
      answer: `${snapshot.openComplaints} complaints are open and ${snapshot.complaintSlaBreaches} have crossed SLA.`,
      href: "/dashboard/complaints",
      action: "Open complaints",
    };
  }

  if (query.includes("technician") || query.includes("team") || query.includes("available")) {
    return {
      title: "Field capacity",
      answer: `${snapshot.onDutyTechnicians} of ${snapshot.technicianCount} technicians are currently on duty. Use Smart Dispatch to balance workload and match service skills.`,
      href: "/dashboard/control-center",
      action: "Open Smart Dispatch",
    };
  }

  if (query.includes("rating") || query.includes("feedback") || query.includes("customer satisfaction")) {
    return {
      title: "Customer experience",
      answer: `Current customer rating is ${snapshot.averageRating}. Review low ratings and technician feedback trends before they become retention risks.`,
      href: "/dashboard/feedback",
      action: "Open feedback intelligence",
    };
  }

  return {
    title: "Command understood",
    answer: "I can route operational questions about jobs, dispatch, service due, collections, profit, complaints, technicians and customer feedback using the live Pest Mantra dashboard data.",
    href: "/dashboard/project-overview",
    action: "See system overview",
  };
}

export function IntelligenceCommandBar({ snapshot }: { snapshot: IntelligenceSnapshot }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("Give me today's business summary");
  const result = useMemo(() => resolveCommand(submitted, snapshot), [submitted, snapshot]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(query.trim() || "Give me today's business summary");
  }

  return (
    <section className={`${ui.card} overflow-hidden border-accent/25`} aria-label="Intelligence command bar">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.8fr)] lg:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent">✦</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Pest Mantra Intelligence</p>
              <p className="mt-0.5 text-xs text-ink-faint">Natural-language command routing over your current business data</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              className={`${ui.input} min-h-12 flex-1`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask: show pending jobs, overdue payments, today's summary…"
              aria-label="Ask Pest Mantra Intelligence"
            />
            <button type="submit" className={`${ui.btnPrimary} min-h-12 shrink-0 px-5`}>Ask Intelligence</button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => { setQuery(example); setSubmitted(example); }}
                className="rounded-full border border-border-default bg-surface-2 px-3 py-1.5 text-[11px] text-ink-muted transition hover:border-accent/40 hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border-default bg-surface-2/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">{result.title}</p>
          <p className="mt-3 text-sm leading-6 text-ink">{result.answer}</p>
          <Link href={result.href} className="mt-4 inline-flex text-xs font-semibold text-accent hover:underline">
            {result.action} →
          </Link>
          <p className="mt-3 text-[10px] leading-4 text-ink-faint">No external AI key required. This command layer uses deterministic business rules so operational results remain reliable and private.</p>
        </div>
      </div>
    </section>
  );
}
