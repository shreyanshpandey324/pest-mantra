"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface TourStep {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
}

const STEPS: TourStep[] = [
  {
    href: "/dashboard",
    eyebrow: "01 · Business pulse",
    title: "Executive Dashboard",
    description: "A single view of today’s field operations, collections, sales follow-ups and service risks.",
    highlights: ["Today’s jobs & dispatch", "Pest Mantra Intelligence command bar", "Collections, profitability and risk alerts"],
  },
  {
    href: "/dashboard/control-center",
    eyebrow: "02 · Field operations",
    title: "Operations Control Center",
    description: "Dispatch and technician workload are managed from one operational workspace.",
    highlights: ["Smart technician recommendations", "Skill + availability + workload scoring", "Schedule conflict protection"],
  },
  {
    href: "/dashboard/customers",
    eyebrow: "03 · Customer intelligence",
    title: "Customer 360",
    description: "Search a customer once and see the connected service, sales and payment history.",
    highlights: ["Customer health score & lifetime value", "Projects, invoices and quotations", "AMC, payment exposure and service risk"],
  },
  {
    href: "/dashboard/leads",
    eyebrow: "04 · Sales workflow",
    title: "CRM → Quote → Invoice",
    description: "The sales journey starts with a lead and continues through quotation, service and collection.",
    highlights: ["Lead follow-ups", "Quotation pipeline", "Invoice and payment tracking"],
  },
  {
    href: "/dashboard/service-contracts",
    eyebrow: "05 · Recurring revenue",
    title: "AMC & Service Retention",
    description: "Recurring contracts and service reminders help retain customers beyond one-time jobs.",
    highlights: ["AMC contracts", "Upcoming visits", "Service due and renewal visibility"],
  },
  {
    href: "/dashboard/complaints",
    eyebrow: "06 · Customer support",
    title: "Complaints & SLA",
    description: "Customer issues are tracked as accountable tickets instead of being lost in calls or messages.",
    highlights: ["Priority and SLA", "Assignment and resolution", "Escalation visibility"],
  },
  {
    href: "/dashboard/customer-master",
    eyebrow: "07 · Enterprise customers",
    title: "Customer Master & Multi-site",
    description: "Permanent customer records support multiple service locations, company details, tags and international operating profiles.",
    highlights: ["Residential, commercial & enterprise accounts", "Multiple service sites per customer", "Customer 360 connection"],
  },
  {
    href: "/dashboard/automations",
    eyebrow: "08 · Automation",
    title: "Automation & Communication",
    description: "Operational events can create in-app alerts and provider-ready WhatsApp or SMS messages without pretending an external provider is already connected.",
    highlights: ["Invoice, service, AMC & SLA rules", "Enable or pause automations", "Retryable outbound communication queue"],
  },
  {
    href: "/dashboard/approvals",
    eyebrow: "09 · Controls",
    title: "Approval Center",
    description: "High-impact finance and stock decisions can be routed through an accountable approval queue.",
    highlights: ["Expense, refund & stock approvals", "Approve / reject with resolution notes", "Audit-friendly governance"],
  },
  {
    href: "/dashboard/audit-logs",
    eyebrow: "10 · Governance",
    title: "Audit & Accountability",
    description: "Important administrative actions remain traceable for operational accountability.",
    highlights: ["Actor and action history", "Sensitive fields protected", "System-wide traceability"],
  },
  {
    href: "/dashboard/system-health",
    eyebrow: "11 · Commercial readiness",
    title: "System Health & Integrations",
    description: "The platform clearly separates what is live, provider-ready or awaiting production credentials.",
    highlights: ["Database & scheduler readiness", "Communication/provider capability", "PWA, storage and payment readiness"],
  },
  {
    href: "/dashboard/project-overview",
    eyebrow: "12 · Complete platform",
    title: "Project Overview",
    description: "Finish with the complete architecture, roles, modules and end-to-end service workflow.",
    highlights: ["Admin Web + Intelligence", "Technician App + GPS proof", "Customer Portal + verified service records"],
  },
];

function StepPanel({
  step,
  index,
  onPrevious,
  onNext,
  onClose,
}: {
  step: TourStep;
  index: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const isLast = index === STEPS.length - 1;
  return (
    <div className="fixed bottom-5 right-5 z-[80] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-accent/30 bg-surface shadow-2xl shadow-black/40">
      <div className="border-b border-border-default bg-surface-2 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{step.eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{step.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-ink-muted hover:bg-surface hover:text-ink" aria-label="Close guided tour">×</button>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm leading-6 text-ink-muted">{step.description}</p>
        <div className="mt-4 rounded-xl border border-border-default bg-surface-2 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">What this screen demonstrates</p>
          <ul className="mt-2 space-y-2 text-sm text-ink">
            {step.highlights.map((item) => (
              <li key={item} className="flex gap-2"><span className="text-success">✓</span><span>{item}</span></li>
            ))}
          </ul>
        </div>
        {isLast ? (
          <div className="mt-3 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-warning">
            Technician field workflow is available separately in the <strong>Technician App</strong> provided by your administrator.
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
        <span className="text-xs text-ink-faint">{index + 1} / {STEPS.length}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onPrevious} disabled={index === 0} className="rounded-lg border border-border-default px-3 py-2 text-xs font-semibold text-ink-muted disabled:opacity-40">Back</button>
          <button type="button" onClick={onNext} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90">{isLast ? "Finish" : "Next →"}</button>
        </div>
      </div>
    </div>
  );
}

export function ProductTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState<number | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem("pm_product_tour_welcome_seen") !== "1") {
      const id = window.setTimeout(() => setWelcomeOpen(true), 650);
      return () => window.clearTimeout(id);
    }
  }, []);

  const activeStep = useMemo(() => (tourIndex === null ? null : STEPS[tourIndex]), [tourIndex]);

  function navigateTo(index: number) {
    const step = STEPS[index];
    setTourIndex(index);
    if (pathname !== step.href) router.push(step.href);
  }

  function startTour() {
    window.localStorage.setItem("pm_product_tour_welcome_seen", "1");
    setWelcomeOpen(false);
    navigateTo(0);
  }

  function closeWelcome() {
    window.localStorage.setItem("pm_product_tour_welcome_seen", "1");
    setWelcomeOpen(false);
  }


  return (
    <>
      <div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border-strong bg-surface/95 p-1.5 shadow-xl shadow-black/30 backdrop-blur md:left-auto md:right-5 md:translate-x-0">
        <button type="button" onClick={startTour} className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white">▶ Product Tour</button>
        <Link href="/dashboard/project-overview" className="rounded-xl px-3 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink">Overview</Link>
      </div>


      {welcomeOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pm-modal-backdrop p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-accent/30 bg-surface shadow-2xl">
            <div className="bg-gradient-to-br from-accent/20 via-surface to-surface px-7 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pest Mantra · Product Tour</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">The platform explains itself.</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">Use the guided tour to walk through the complete pest-control business workflow without needing a separate presentation.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Admin operations", "Customer lifecycle", "Field technician workflow"].map((item) => (
                  <div key={item} className="rounded-xl border border-border-default bg-surface/80 p-3 text-sm font-semibold text-ink">✓ {item}</div>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" onClick={startTour} className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">Start guided tour →</button>
                <Link href="/dashboard/project-overview" onClick={closeWelcome} className="rounded-xl border border-border-strong px-5 py-3 text-sm font-semibold text-ink">Open project overview</Link>
                <button type="button" onClick={closeWelcome} className="px-3 py-3 text-sm text-ink-muted">Explore myself</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeStep ? (
        <StepPanel
          step={activeStep}
          index={tourIndex ?? 0}
          onPrevious={() => navigateTo(Math.max(0, (tourIndex ?? 0) - 1))}
          onNext={() => {
            if ((tourIndex ?? 0) >= STEPS.length - 1) {
              setTourIndex(null);
              return;
            }
            navigateTo((tourIndex ?? 0) + 1);
          }}
          onClose={() => setTourIndex(null)}
        />
      ) : null}
    </>
  );
}
