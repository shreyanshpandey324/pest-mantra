import Link from "next/link";
import { cookies } from "next/headers";

import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import { ui } from "@/lib/ui-classes";
import { AuthUser, UserRole } from "@/types/auth";
import { Chemical } from "@/types/inventory";
import { FeedbackDashboardData } from "@/types/feedback";
import { FinanceSummary } from "@/types/expense";
import { Invoice } from "@/types/invoice";
import { LeadListResponse } from "@/types/lead";
import { Project, ProjectStatus, STATUS_LABELS, TechnicianListItem } from "@/types/project";
import { ServiceContract } from "@/types/serviceContract";
import { ServiceReminderListResponse } from "@/types/serviceReminder";
import { ComplaintListResponse } from "@/types/complaint";
import { NotificationAlertListResponse } from "@/types/notification-alert";
import { IntelligenceCommandBar } from "@/components/IntelligenceCommandBar";
import { AuditListResponse } from "@/types/audit";
import type { ApprovalItem } from "@/components/ApprovalCenterClient";

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: string;
}

const EMPTY_FINANCE: FinanceSummary = {
  billedRevenue: 0,
  collectedRevenue: 0,
  outstanding: 0,
  recognizedCost: 0,
  paidExpenses: 0,
  pendingApproval: 0,
  estimatedProfit: 0,
  cashProfit: 0,
  estimatedMargin: 0,
  categoryBreakdown: [],
  serviceProfitability: [],
  branchProfitability: [],
  invoiceCount: 0,
  expenseCount: 0,
};

const EMPTY_FEEDBACK: FeedbackDashboardData = {
  feedback: [],
  metrics: {
    total: 0,
    averageRating: 0,
    recommendRate: 0,
    fiveStarCount: 0,
    lowRatingCount: 0,
    distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 })),
  },
  technicians: [],
};

const EMPTY_LEADS: LeadListResponse = {
  leads: [],
  metrics: {
    total: 0,
    open: 0,
    qualified: 0,
    won: 0,
    lost: 0,
    overdueFollowUps: 0,
    dueToday: 0,
    hot: 0,
    conversionRate: 0,
    sourceBreakdown: [],
  },
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
};

const EMPTY_REMINDERS: ServiceReminderListResponse = {
  reminders: [],
  metrics: { total: 0, unread: 0, overdue: 0, dueToday: 0, next7Days: 0 },
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
};

function indiaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function monthRange(): { from: string; to: string } {
  const today = indiaDateKey();
  return { from: `${today.slice(0, 7)}-01`, to: today };
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
    timeZone: "Asia/Kolkata",
  });
}

function getQuickActions(user: AuthUser): QuickAction[] {
  const actions: QuickAction[] = [
    { href: "/dashboard/customer-master", label: "New Customer", description: "Create or update customer master", icon: "+" },
    { href: "/dashboard/projects", label: "New Job", description: "Create, assign and schedule service", icon: "◆" },
    { href: "/dashboard/leads", label: "Follow-ups", description: "Sales calls and next actions", icon: "☎" },
    { href: "/dashboard/service-reminders", label: "Coming Services", description: "Due and upcoming repeat visits", icon: "◷" },
    { href: "/dashboard/complaints", label: "New Complaint", description: "Register and manage service issues", icon: "!" },
    { href: "/dashboard/control-center", label: "Month Scheduler", description: "Dispatch board and calendar view", icon: "▦" },
  ];

  if (user.role === UserRole.SUPER_ADMIN) {
    actions.push({ href: "/dashboard/companies", label: "Companies", description: "Company and branch controls", icon: "▣" });
  }

  return actions;
}

function PulseCard({ label, value, detail, href, tone = "default" }: { label: string; value: string | number; detail: string; href: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-danger" : "text-ink";
  return (
    <Link href={href} className={`${ui.card} block p-4 transition hover:border-border-strong hover:bg-surface-2`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{detail}</p>
    </Link>
  );
}

function AlertRow({ icon, title, detail, href, tone = "warn" }: { icon: string; title: string; detail: string; href: string; tone?: "warn" | "bad" | "info" }) {
  const toneClass = tone === "bad" ? "text-danger" : tone === "info" ? "text-accent" : "text-warning";
  return (
    <Link href={href} className="flex items-center gap-3 border-b border-border-default px-4 py-3 last:border-b-0 hover:bg-surface-2/60">
      <span className={`text-lg ${toneClass}`} aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{detail}</span>
      </span>
      <span className="text-ink-faint" aria-hidden="true">→</span>
    </Link>
  );
}

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  const isDeveloper = user.role === UserRole.SUPER_ADMIN;
  const quickActions = getQuickActions(user);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{isDeveloper ? "Global operations" : "Office operations"}</p>
          <h1 className="mt-1 text-[28px] font-semibold sm:text-[32px]">Good to see you, {user.name}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Start with today&apos;s work. Problems that need attention are surfaced automatically.</p>
        </div>
        <Link href="/dashboard/exception-inbox" className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-danger/20 bg-danger/5 px-4 text-sm font-semibold text-danger transition hover:bg-danger/10 lg:self-auto">
          <span aria-hidden="true">!</span> Open Exception Inbox
        </Link>
      </header>

      <section aria-label="Quick actions">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
            <p className="mt-0.5 text-xs text-ink-faint">Common office tasks without hunting through menus.</p>
          </div>
          <Link href="/dashboard/settings" className="text-xs font-medium text-accent hover:underline">Settings →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {quickActions.slice(0, 6).map((action, index) => (
            <Link key={action.href} href={action.href} className={`${ui.card} group min-h-32 p-4 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold ${index % 3 === 0 ? "bg-accent/10 text-accent" : index % 3 === 1 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`} aria-hidden="true">{action.icon}</span>
              <span className="mt-3 block text-sm font-semibold text-ink group-hover:text-accent-strong">{action.label}</span>
              <span className="mt-1 block text-[11px] leading-4 text-ink-faint">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <DashboardData />
    </div>
  );
}

async function DashboardData() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  const today = indiaDateKey();
  const { from, to } = monthRange();

  const requests = await Promise.allSettled([
    backendFetch<{ projects: Project[] }>(`/projects?date=${today}`, { accessToken }),
    backendFetch<{ projects: Project[] }>("/projects", { accessToken }),
    backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", { accessToken }),
    backendFetch<LeadListResponse>("/leads?page=1&pageSize=10", { accessToken }),
    backendFetch<ServiceReminderListResponse>("/service-reminders?page=1&pageSize=10&sort=due_asc", { accessToken }),
    backendFetch<{ summary: FinanceSummary }>(`/expenses/summary?from=${from}&to=${to}`, { accessToken }),
    backendFetch<FeedbackDashboardData>("/feedback", { accessToken }),
    backendFetch<{ chemicals: Chemical[] }>("/chemicals", { accessToken }),
    backendFetch<{ contracts: ServiceContract[] }>("/service-contracts?status=active", { accessToken }),
    backendFetch<{ invoices: Invoice[] }>("/invoices", { accessToken }),
    backendFetch<ComplaintListResponse>("/complaints?page=1&pageSize=10", { accessToken }),
    backendFetch<NotificationAlertListResponse>("/notification-center?unread=true&page=1&pageSize=10", { accessToken }),
    backendFetch<{ approvals: ApprovalItem[]; metrics: { total: number; pending: number; approved: number; rejected: number; pendingValue: number } }>("/approvals", { accessToken }),
    backendFetch<AuditListResponse>("/audit-logs?pageSize=6", { accessToken }),
  ]);

  const [todayProjectsResult, projectsResult, techniciansResult, leadsResult, remindersResult, financeResult, feedbackResult, chemicalsResult, contractsResult, invoicesResult, complaintsResult, notificationsResult, approvalsResult, auditResult] = requests;
  const failedModules = requests.filter((result) => result.status === "rejected").length;

  const todayProjects = todayProjectsResult.status === "fulfilled" ? todayProjectsResult.value.projects ?? [] : [];
  const projects = projectsResult.status === "fulfilled" ? projectsResult.value.projects ?? [] : [];
  const technicians = techniciansResult.status === "fulfilled" ? techniciansResult.value.technicians ?? [] : [];
  const leads = leadsResult.status === "fulfilled" ? leadsResult.value : EMPTY_LEADS;
  const reminders = remindersResult.status === "fulfilled" ? remindersResult.value : EMPTY_REMINDERS;
  const finance = financeResult.status === "fulfilled" ? financeResult.value.summary : EMPTY_FINANCE;
  const feedback = feedbackResult.status === "fulfilled" ? feedbackResult.value : EMPTY_FEEDBACK;
  const chemicals = chemicalsResult.status === "fulfilled" ? chemicalsResult.value.chemicals ?? [] : [];
  const contracts = contractsResult.status === "fulfilled" ? contractsResult.value.contracts ?? [] : [];
  const invoices = invoicesResult.status === "fulfilled" ? invoicesResult.value.invoices ?? [] : [];
  const complaintMetrics = complaintsResult.status === "fulfilled" ? complaintsResult.value.metrics : { total: 0, open: 0, overdue: 0, critical: 0, resolved: 0 };
  const notificationUnread = notificationsResult.status === "fulfilled" ? notificationsResult.value.unread : 0;
  const approvalMetrics = approvalsResult.status === "fulfilled" ? approvalsResult.value.metrics : { total: 0, pending: 0, approved: 0, rejected: 0, pendingValue: 0 };
  const recentAudit = auditResult.status === "fulfilled" ? auditResult.value.logs ?? [] : [];

  const unassignedToday = todayProjects.filter((project) => !project.assignedTechnicianId && project.status !== ProjectStatus.CANCELLED).length;
  const activeToday = todayProjects.filter((project) => project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED).length;
  const techniciansOnDuty = technicians.filter((technician) => technician.dutyStatus !== "off_duty").length;
  const activeProjects = projects.filter((project) => project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED).length;
  const lowStock = chemicals.filter((chemical) => chemical.isActive && chemical.currentStock <= chemical.lowStockThreshold);
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "overdue" || (invoice.balanceDue > 0 && new Date(invoice.dueDate).getTime() < Date.now()));

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const renewalsSoon = contracts.filter((contract) => {
    const end = new Date(contract.endDate).getTime();
    return end >= now && end <= now + thirtyDays;
  });

  const alerts = [
    unassignedToday > 0 ? { icon: "⚡", title: `${unassignedToday} unassigned job${unassignedToday === 1 ? "" : "s"} today`, detail: "Dispatch these before the field team starts moving.", href: "/dashboard/projects?view=unassigned", tone: "bad" as const } : null,
    leads.metrics.overdueFollowUps > 0 ? { icon: "◎", title: `${leads.metrics.overdueFollowUps} overdue lead follow-up${leads.metrics.overdueFollowUps === 1 ? "" : "s"}`, detail: `${leads.metrics.hot} hot lead(s) are currently in the pipeline.`, href: "/dashboard/leads", tone: "warn" as const } : null,
    reminders.metrics.overdue > 0 ? { icon: "◷", title: `${reminders.metrics.overdue} overdue service reminder${reminders.metrics.overdue === 1 ? "" : "s"}`, detail: "Follow up before repeat-service opportunities are lost.", href: "/dashboard/service-reminders?timing=overdue", tone: "warn" as const } : null,
    overdueInvoices.length > 0 ? { icon: "₹", title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, detail: `${money(overdueInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0))} is still outstanding.`, href: "/dashboard/invoices?status=overdue", tone: "bad" as const } : null,
    renewalsSoon.length > 0 ? { icon: "↻", title: `${renewalsSoon.length} AMC renewal${renewalsSoon.length === 1 ? "" : "s"} due within 30 days`, detail: "Renew early to protect recurring revenue.", href: "/dashboard/service-contracts", tone: "warn" as const } : null,
    lowStock.length > 0 ? { icon: "▤", title: `${lowStock.length} chemical stock alert${lowStock.length === 1 ? "" : "s"}`, detail: "Stock is at or below the configured low-stock level.", href: "/dashboard/inventory", tone: "warn" as const } : null,
    feedback.metrics.lowRatingCount > 0 ? { icon: "★", title: `${feedback.metrics.lowRatingCount} low customer rating${feedback.metrics.lowRatingCount === 1 ? "" : "s"}`, detail: `Current average rating: ${feedback.metrics.averageRating.toFixed(1)}/5.`, href: "/dashboard/feedback", tone: "bad" as const } : null,
    complaintMetrics.overdue > 0 ? { icon: "!", title: `${complaintMetrics.overdue} complaint SLA breach${complaintMetrics.overdue === 1 ? "" : "es"}`, detail: `${complaintMetrics.critical} critical complaint(s) currently open.`, href: "/dashboard/complaints", tone: "bad" as const } : null,
    notificationUnread > 0 ? { icon: "◈", title: `${notificationUnread} unread operational alert${notificationUnread === 1 ? "" : "s"}`, detail: "Automation engine has items waiting for review.", href: "/dashboard/notification-center", tone: "info" as const } : null,
    approvalMetrics.pending > 0 ? { icon: "✓", title: `${approvalMetrics.pending} approval${approvalMetrics.pending === 1 ? "" : "s"} waiting`, detail: `${money(approvalMetrics.pendingValue)} is currently pending governance review.`, href: "/dashboard/approvals", tone: "warn" as const } : null,
  ].filter((alert): alert is NonNullable<typeof alert> => alert !== null);

  const dispatchPreview = [...todayProjects]
    .filter((project) => project.status !== ProjectStatus.CANCELLED)
    .sort((a, b) => (a.scheduledTimeSlot ?? "99:99").localeCompare(b.scheduledTimeSlot ?? "99:99"))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {failedModules > 0 ? (
        <div className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning">
          {failedModules} dashboard data source{failedModules === 1 ? " is" : "s are"} temporarily unavailable. The rest of the console is still usable.
        </div>
      ) : null}

      <section aria-label="Today at a glance">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Today at a glance</h2>
            <p className="mt-0.5 text-xs text-ink-faint">The numbers the office team usually checks first.</p>
          </div>
          <Link href="/dashboard/reports" className="text-xs font-medium text-accent hover:underline">Reports →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PulseCard label="Today jobs" value={todayProjects.length} detail={`${activeToday} active · ${unassignedToday} unassigned`} href="/dashboard/projects?view=today" tone={unassignedToday ? "warn" : "good"} />
          <PulseCard label="Technicians on duty" value={`${techniciansOnDuty}/${technicians.length}`} detail={`${activeProjects} active jobs in current scope`} href="/dashboard/technicians" tone={techniciansOnDuty ? "good" : "warn"} />
          <PulseCard label="Collections MTD" value={money(finance.collectedRevenue)} detail={`${money(finance.outstanding)} outstanding`} href="/dashboard/invoices" tone={finance.outstanding > finance.collectedRevenue ? "warn" : "good"} />
          <PulseCard label="Service attention" value={reminders.metrics.overdue + complaintMetrics.overdue} detail={`${reminders.metrics.overdue} service overdue · ${complaintMetrics.overdue} SLA`} href="/dashboard/exception-inbox" tone={reminders.metrics.overdue + complaintMetrics.overdue ? "bad" : "good"} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.9fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Today&apos;s field schedule</h2>
              <p className="mt-0.5 text-xs text-ink-faint">Upcoming jobs and current assignments.</p>
            </div>
            <Link href="/dashboard/control-center" className="text-xs font-medium text-accent hover:underline">Open scheduler →</Link>
          </div>

          <div className={`${ui.card} overflow-hidden`}>
            <div className="hidden grid-cols-[90px_1fr_150px_110px] border-b border-border-default bg-surface-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint sm:grid">
              <span>Time</span><span>Customer / Site</span><span>Technician</span><span>Status</span>
            </div>
            {dispatchPreview.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-ink">No jobs scheduled for today</p>
                <p className="mt-1 text-xs text-ink-faint">Create or schedule a job from Projects.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {dispatchPreview.map((project) => (
                  <Link key={project._id} href={`/dashboard/projects/${project._id}`} className="grid gap-2 px-4 py-3.5 transition hover:bg-surface-2/70 sm:grid-cols-[90px_1fr_150px_110px] sm:items-center">
                    <span className="text-xs font-semibold text-accent-strong">{project.scheduledTimeSlot || "No slot"}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{project.customerName}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{project.address}</span>
                    </span>
                    <span className="truncate text-xs text-ink-muted">{project.assignedTechnicianId?.name ?? "Unassigned"}</span>
                    <span className="text-xs font-medium text-ink-faint">{STATUS_LABELS[project.status]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Fix now</h2>
              <p className="mt-0.5 text-xs text-ink-faint">Only items that need office attention.</p>
            </div>
            <Link href="/dashboard/exception-inbox" className="rounded-full bg-danger/8 px-2.5 py-1 text-[11px] font-semibold text-danger">{alerts.length} open</Link>
          </div>
          <div className={`${ui.card} overflow-hidden`}>
            {alerts.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">✓</div>
                <p className="mt-3 text-sm font-semibold text-success">No critical exceptions</p>
                <p className="mt-1 text-xs text-ink-muted">Today&apos;s operational checks look clear.</p>
              </div>
            ) : alerts.slice(0, 6).map((alert) => <AlertRow key={`${alert.href}-${alert.title}`} {...alert} />)}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Follow-ups & business health</h2>
            <p className="mt-0.5 text-xs text-ink-faint">Sales, service, customer and governance checks in one row.</p>
          </div>
          <span className="text-xs text-ink-faint">{notificationUnread} unread alert{notificationUnread === 1 ? "" : "s"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PulseCard label="Lead follow-ups" value={leads.metrics.dueToday} detail={`${leads.metrics.overdueFollowUps} overdue · ${leads.metrics.hot} hot`} href="/dashboard/leads" tone={leads.metrics.overdueFollowUps ? "warn" : "good"} />
          <PulseCard label="Customer rating" value={feedback.metrics.total ? `${feedback.metrics.averageRating.toFixed(1)}/5` : "—"} detail={`${feedback.metrics.lowRatingCount} low rating(s)`} href="/dashboard/feedback" tone={feedback.metrics.lowRatingCount ? "warn" : "good"} />
          <PulseCard label="AMC renewals" value={renewalsSoon.length} detail="Contracts ending within 30 days" href="/dashboard/service-contracts" tone={renewalsSoon.length ? "warn" : "good"} />
          <PulseCard label="Approvals waiting" value={approvalMetrics.pending} detail={`${money(approvalMetrics.pendingValue)} pending review`} href="/dashboard/approvals" tone={approvalMetrics.pending ? "warn" : "good"} />
        </div>
      </section>

      <IntelligenceCommandBar snapshot={{
        todayJobs: todayProjects.length,
        activeToday,
        unassignedToday,
        onDutyTechnicians: techniciansOnDuty,
        technicianCount: technicians.length,
        overdueServices: reminders.metrics.overdue,
        overdueInvoices: overdueInvoices.length,
        outstandingAmount: money(finance.outstanding),
        openComplaints: complaintMetrics.open,
        complaintSlaBreaches: complaintMetrics.overdue,
        collectedMonth: money(finance.collectedRevenue),
        estimatedProfit: money(finance.estimatedProfit),
        averageRating: feedback.metrics.total ? `${feedback.metrics.averageRating.toFixed(1)}/5` : "No ratings yet",
      }} />

      <div className="grid gap-5 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Operational checks</h2>
            <Link href="/dashboard/inventory" className="text-xs font-medium text-accent hover:underline">Inventory →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PulseCard label="Overdue invoices" value={overdueInvoices.length} detail={`${money(overdueInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0))} pending`} href="/dashboard/invoices?status=overdue" tone={overdueInvoices.length ? "bad" : "good"} />
            <PulseCard label="Low stock items" value={lowStock.length} detail={lowStock[0] ? `${lowStock[0].name} needs attention` : "Stock levels look healthy"} href="/dashboard/inventory" tone={lowStock.length ? "warn" : "good"} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Recent system activity</h2>
            <Link href="/dashboard/audit-logs" className="text-xs font-medium text-accent hover:underline">Audit log →</Link>
          </div>
          <div className={`${ui.card} divide-y divide-border-default overflow-hidden`}>
            {recentAudit.length === 0 ? <div className="p-8 text-center text-sm text-ink-faint">No recent audit events.</div> : recentAudit.slice(0, 5).map((log) => (
              <div key={log._id} className="grid gap-1 px-4 py-3 sm:grid-cols-[130px_1fr_105px] sm:items-center">
                <span className="truncate text-xs font-semibold">{log.actor?.name ?? log.actorRole}</span>
                <span className="truncate text-xs text-ink-muted">{log.action.replaceAll("_", " ")} · {log.entityType ?? log.path}</span>
                <span className="text-[10px] text-ink-faint sm:text-right">{new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {reminders.reminders.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Coming services</h2>
              <p className="mt-0.5 text-xs text-ink-faint">Next repeat-service opportunities.</p>
            </div>
            <Link href="/dashboard/service-reminders" className="text-xs font-medium text-accent hover:underline">View all →</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reminders.reminders.slice(0, 6).map((reminder) => (
              <Link key={reminder.id} href={`/dashboard/customers?q=${encodeURIComponent(reminder.customerPhone)}`} className={`${ui.card} p-4 transition hover:border-border-strong hover:bg-surface-2`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{reminder.customerName}</p>
                    <p className="mt-1 truncate text-xs text-ink-muted">{reminder.address}</p>
                  </div>
                  <span className={reminder.daysUntil < 0 ? "text-xs font-semibold text-danger" : reminder.daysUntil <= 2 ? "text-xs font-semibold text-warning" : "text-xs font-semibold text-accent-strong"}>{shortDate(reminder.dueDate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
