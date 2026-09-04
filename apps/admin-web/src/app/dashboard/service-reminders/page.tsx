import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ServiceRemindersClient } from "@/components/ServiceRemindersClient";
import { ServiceReminderListResponse, ServiceReminderTiming } from "@/types/serviceReminder";

const emptyData: ServiceReminderListResponse = {
  reminders: [],
  metrics: { total: 0, unread: 0, overdue: 0, dueToday: 0, next7Days: 0 },
  pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
};

const TIMINGS = new Set<ServiceReminderTiming>(["overdue", "due_today", "due_soon", "upcoming", "scheduled"]);

export default async function ServiceRemindersPage({ searchParams }: { searchParams: Promise<{ timing?: string }> }) {
  const params = await searchParams;
  const initialTiming = TIMINGS.has(params.timing as ServiceReminderTiming) ? params.timing as ServiceReminderTiming : "all";
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  let data = emptyData;
  let error = "";
  try {
    const timingQuery = initialTiming === "all" ? "" : `&timing=${encodeURIComponent(initialTiming)}`;
    data = await backendFetch<ServiceReminderListResponse>(`/service-reminders?page=1&pageSize=25&sort=due_asc${timingQuery}`, { accessToken: token });
  } catch (e) {
    error = e instanceof BackendApiError ? e.message : "Could not load service reminders";
  }

  return <div className="space-y-6">
    <div>
      <p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Retention & follow-up</p>
      <h1 className="mt-1 text-3xl font-semibold">Service Reminders</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-muted">Filter overdue, today, upcoming and scheduled repeat services instantly, then narrow by customer, service type or date.</p>
    </div>
    {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</div> : null}
    <ServiceRemindersClient initialData={data} initialTiming={initialTiming} />
  </div>;
}
