import Link from "next/link";

const MODULES = [
  ["Command & Dispatch", "Dashboard, Operations Control Center, job assignment, scheduling and field visibility."],
  ["Customer 360 + Master", "One customer view plus permanent customer records, tags and multiple service sites for enterprise accounts."],
  ["Sales CRM", "Lead capture, follow-ups, quotation preparation and conversion into operational work."],
  ["Finance", "Invoices, manual payments, outstanding balances, expenses and profitability reporting."],
  ["Recurring Service", "AMC contracts, planned visits, service reminders and retention workflows."],
  ["Quality & Support", "Service reports, feedback, complaints, SLA tracking and resolution history."],
  ["Inventory", "Chemical stock, issuance, usage and low-stock visibility."],
  ["Governance", "Role-aware access, audit trail, approvals, automation rules, notification center and company/branch management."],
  ["Commercial Readiness", "International company settings, exports, integration health, SaaS plan controls and provider-ready communication."],
];

const FLOW = [
  "Lead / customer enquiry",
  "Quotation",
  "Job scheduling",
  "Technician assignment",
  "Field service execution",
  "Service report",
  "Invoice & collection",
  "Feedback / complaint",
  "AMC / next service",
];

export default function ProjectOverviewPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24">
      <section className="overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 via-surface to-surface p-6 shadow-xl shadow-black/10 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Pest Mantra FSM</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">Pest-control business operations in one connected platform.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink-muted">Pest Mantra connects office operations, field technicians and customer service from the first enquiry through recurring service and retention.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white">Open Executive Dashboard</Link>
              <Link href="/dashboard/control-center" className="rounded-xl border border-border-strong px-5 py-3 text-sm font-semibold text-ink">Open Operations Center</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["Admin Web", "Technician App", "Customer Portal", "Node + MongoDB"].map((item) => (
              <div key={item} className="rounded-2xl border border-border-default bg-surface/80 p-4">
                <p className="text-sm font-semibold text-ink">{item}</p>
                <p className="mt-1 text-xs text-ink-muted">Connected platform layer</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">End-to-end workflow</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">From enquiry to recurring service</h2>
        </div>
        <div className="grid gap-2 lg:grid-cols-9">
          {FLOW.map((item, index) => (
            <div key={item} className="relative rounded-xl border border-border-default bg-surface p-3 lg:min-h-28">
              <span className="text-[10px] font-semibold text-accent">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-2 text-sm font-semibold leading-5 text-ink">{item}</p>
              {index < FLOW.length - 1 ? <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-accent lg:block">→</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Core capabilities</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">What the system manages</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MODULES.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-border-default bg-surface p-5 transition hover:border-border-strong hover:bg-surface-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">✓</div>
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>


      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Decision intelligence</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Power without menu clutter</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink-muted">Advanced decisions are embedded into the screens teams already use instead of adding separate complicated modules.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["✦ Intelligence Command", "Ask operational questions such as today’s summary, overdue services, collections or field capacity and jump directly to the right action queue."],
            ["⚡ Smart Dispatch", "Technicians are ranked using duty state, service skill, branch fit and selected-day workload before assignment."],
            ["◍ Customer Health", "Customer 360 calculates health, lifetime value, payment exposure, recurring-service risk and AMC strength from existing records."],
            ["✓ GPS Proof of Service", "Digital service reports can preserve the technician’s latest field location, accuracy, timestamp, photos, chemicals, signature and QR verification."],
            ["◷ Smart Service Views", "Pending, upcoming, today, overdue, unassigned and repeat-service filters turn large service volumes into focused action queues."],
            ["₹ Profit Intelligence", "Existing invoice and expense data already powers collection, margin, service profitability and branch profitability decisions."],
            ["⌁ Smart Route", "Technician jobs with coordinates can be sequenced into a practical nearest-next route with transparent approximate distance and ETA logic."],
            ["◎ Approval Controls", "Expense, discount, refund, stock and purchase decisions can be routed through an approval queue instead of informal messages."],
            ["↗ Automation Engine", "Invoice, service, AMC and complaint events can trigger in-app alerts and provider-ready communication with deduplication and retries."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-surface p-5">
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border-default bg-surface p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Enterprise foundation</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Built to grow beyond a single office</h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">The current architecture is built around persistent production controls and includes foundations for multi-company operation, multiple branches, international settings and external providers.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Multi-site Customer Master", "Permanent customer accounts with multiple service locations."],
              ["International Operating Profile", "Currency, timezone, country, locale, tax label, units and date format."],
              ["Automation & Outbox", "Provider-ready communication queue with retry and deduplication."],
              ["Approval Center", "Controlled finance, purchase and stock decision workflows."],
              ["Export Center", "CSV portability for handover, accounting and migration workflows."],
              ["System Health", "Readiness visibility for DB, communications, storage, payments and PWA."],
            ].map(([title, description]) => (
              <article key={title} className="rounded-2xl border border-border-default bg-surface-2 p-4">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border-default bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Office team</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Admin Web</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Manage customers, sales, scheduling, technicians, finance, inventory, complaints and business reporting.</p>
        </article>
        <article className="rounded-2xl border border-border-default bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Field team</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Technician App</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">See assigned jobs, call or navigate to customers, update service status and complete field-service workflows.</p>
          <p className="mt-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent">Technician App runs separately and requires an authenticated technician account.</p>
        </article>
        <article className="rounded-2xl border border-border-default bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Customer experience</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Customer Portal</h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Customers can review service information, invoices, quotations, recurring plans and support tickets through a dedicated portal.</p>
        </article>
      </section>

      <section className="rounded-2xl border border-success/25 bg-success/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Real operating mode</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">This build uses persistent MongoDB data and authenticated user sessions. Admin access requires a registered mobile number and password; production workflows, audit history and background automation operate against the real database.</p>
      </section>
    </div>
  );
}
