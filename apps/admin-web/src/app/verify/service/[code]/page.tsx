import Link from "next/link";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ServiceReportVerification } from "@/types/serviceReport";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function VerifyServiceReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let verification: ServiceReportVerification | null = null;
  let error: string | null = null;

  try {
    verification = await backendFetch<ServiceReportVerification>(`/service-reports/verify/${encodeURIComponent(code)}`);
  } catch (caught) {
    error = caught instanceof BackendApiError ? caught.message : "Verification service is temporarily unavailable.";
  }

  return (
    <main className="min-h-screen bg-[#07110d] px-4 py-10 text-white sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950">PM</div>
          <div><p className="font-semibold">Pest Mantra</p><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Service verification</p></div>
        </div>

        {verification ? (
          <section className="overflow-hidden rounded-[28px] border border-emerald-400/20 bg-white text-slate-900 shadow-2xl shadow-emerald-950/30">
            <div className="bg-emerald-50 px-6 py-7 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl font-bold text-white">✓</div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Authentic record</p>
              <h1 className="mt-2 text-2xl font-semibold">Service report verified</h1>
              <p className="mt-2 text-sm text-slate-500">This code matches a finalized Pest Mantra service record.</p>
            </div>
            <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Report</dt><dd className="font-mono text-xs font-semibold">{verification.reportNumber}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Job</dt><dd className="font-mono text-xs font-semibold">{verification.projectCode}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Verification code</dt><dd className="font-mono text-xs font-semibold text-emerald-700">{verification.verificationCode}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Service</dt><dd className="font-semibold">{SERVICE_TYPE_LABELS[verification.serviceType as ServiceType] ?? verification.serviceType}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Technician</dt><dd className="font-semibold">{verification.technicianName}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Provider</dt><dd className="text-right font-semibold">{verification.companyName ?? "Pest Mantra"}{verification.branchName ? ` · ${verification.branchName}` : ""}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Completed</dt><dd className="font-semibold">{formatDate(verification.completedAt ?? verification.finalizedAt)}</dd></div>
              <div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-500">Field GPS proof</dt><dd className={`text-right font-semibold ${verification.gpsVerified ? "text-emerald-700" : "text-slate-500"}`}>{verification.gpsVerified ? `Verified${typeof verification.proofAccuracy === "number" ? ` · ±${Math.round(verification.proofAccuracy)}m` : ""}${typeof verification.proofDistanceFromSiteMeters === "number" ? ` · ${verification.proofDistanceFromSiteMeters}m from site` : ""}` : "Not captured"}</dd></div>
            </dl>
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 text-center">
              <p className="text-xs leading-5 text-slate-500">Verification confirms record authenticity only. Customer contact details, signature and treatment evidence remain private.</p>
              <Link href={`/feedback/${encodeURIComponent(code)}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400">Rate this service</Link>
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-red-400/20 bg-white p-7 text-center text-slate-900 shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl text-red-600">!</div>
            <h1 className="mt-4 text-xl font-semibold">Report could not be verified</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{error ?? "No finalized service report matches this code."}</p>
          </section>
        )}

        <div className="mt-6 text-center"><Link href="/" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Pest Mantra</Link></div>
      </div>
    </main>
  );
}
