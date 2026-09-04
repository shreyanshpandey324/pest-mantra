import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ServiceReportsClient } from "@/components/ServiceReportsClient";
import { ServiceReportSummary } from "@/types/serviceReport";

export default async function ServiceReportsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  let reports: ServiceReportSummary[] = [];
  let error: string | null = null;

  try {
    const data = await backendFetch<{ reports: ServiceReportSummary[] }>("/service-reports", { accessToken });
    reports = data.reports ?? [];
  } catch (caught) {
    error = caught instanceof BackendApiError ? caught.message : "Could not load service reports.";
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Field evidence</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Service Reports</h1></div>
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">{error}</div>
      </div>
    );
  }

  return <ServiceReportsClient initialReports={reports} />;
}
