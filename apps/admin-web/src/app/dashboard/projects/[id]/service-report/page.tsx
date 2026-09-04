import Link from "next/link";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ServiceReportPayload } from "@/types/serviceReport";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";
import { QrCode } from "@/components/QrCode";
import { PrintServiceReportButton } from "@/components/PrintServiceReportButton";

const UNIT_LABELS: Record<string, string> = {
  litre: "L",
  kg: "kg",
  piece: "pcs",
  ml: "ml",
  gram: "g",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  advance: "Advance / prepaid",
};

function formatDate(value?: string, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default async function ServiceReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let payload: ServiceReportPayload | null = null;
  let error: string | null = null;

  try {
    payload = await backendFetch<ServiceReportPayload>(`/service-reports/project/${id}`, { accessToken });
  } catch (caught) {
    error = caught instanceof BackendApiError ? caught.message : "Could not load the service report.";
  }

  if (!payload) {
    return (
      <div className="space-y-5">
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-ink-muted hover:text-ink">← Back to project</Link>
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">{error ?? "Service report not found."}</div>
      </div>
    );
  }

  const { report, photos } = payload;
  const beforePhotos = photos.filter((photo) => photo.photoType === "before");
  const afterPhotos = photos.filter((photo) => photo.photoType === "after");
  const serviceLabel = SERVICE_TYPE_LABELS[report.serviceType as ServiceType] ?? report.serviceType;

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
          aside, header, nav, [data-dashboard-shell] { box-shadow: none !important; }
          .service-report-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
          .service-report-photo { break-inside: avoid; }
          .service-report-section { break-inside: avoid; }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <Link href={`/dashboard/projects/${id}`} className="text-sm text-ink-muted hover:text-ink">← Back to project</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Service Report</h1>
          <p className="mt-1 text-sm text-ink-muted">Signed field-service record with treatment evidence and verification.</p>
        </div>
        <PrintServiceReportButton />
      </div>

      <article className="service-report-sheet mx-auto max-w-[980px] overflow-hidden rounded-[28px] border border-border-default bg-white text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
        <div className="relative overflow-hidden bg-slate-950 px-7 py-7 text-white sm:px-10">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950">PM</div>
                <div>
                  <p className="text-lg font-bold tracking-tight">Pest Mantra</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Professional Pest Management</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Digital Service Report</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">{report.reportNumber}</h2>
                <p className="mt-2 text-sm text-slate-300">{report.companyName ?? "Pest Mantra"}{report.branchName ? ` · ${report.branchName}` : ""} · Job {report.projectCode}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${report.status === "finalized" ? "bg-emerald-400" : "bg-amber-300"}`} /><span className="font-semibold capitalize">{report.status}</span></div>
              <p className="mt-2 text-xs text-slate-400">Completed {formatDate(report.completedAt, true)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-7 px-7 py-8 sm:px-10">
          <section className="service-report-section grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Customer</p>
              <p className="mt-2 font-semibold">{report.customerName}</p>
              <p className="mt-1 text-sm text-slate-500">{report.customerPhone}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Service</p>
              <p className="mt-2 font-semibold">{serviceLabel}</p>
              <p className="mt-1 text-sm text-slate-500">Technician: {report.technicianName}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Payment</p>
              <p className="mt-2 font-semibold">{report.paymentMethod ? PAYMENT_LABELS[report.paymentMethod] ?? report.paymentMethod : "Not recorded"}</p>
              <p className="mt-1 text-sm text-slate-500">Signed {formatDate(report.customerSignedAt, true)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Service Address</p>
              <p className="mt-2 text-sm font-medium leading-6">{report.address}</p>
            </div>
            <div className={`rounded-2xl border p-4 md:col-span-3 ${typeof report.proofLatitude === "number" && typeof report.proofLongitude === "number" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Verified field evidence</p>
                  {typeof report.proofLatitude === "number" && typeof report.proofLongitude === "number" ? (
                    <>
                      <p className="mt-2 font-semibold text-emerald-900">✓ GPS location captured with service record</p>
                      <p className="mt-1 text-xs text-emerald-800/75">Captured {formatDate(report.proofRecordedAt, true)}{typeof report.proofAccuracy === "number" ? ` · accuracy ±${Math.round(report.proofAccuracy)} m` : ""}{typeof report.proofDistanceFromSiteMeters === "number" ? ` · ${report.proofDistanceFromSiteMeters} m from registered site` : ""}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">GPS proof was not available when this report was prepared.</p>
                  )}
                </div>
                {typeof report.proofLatitude === "number" && typeof report.proofLongitude === "number" ? (
                  <a href={`https://www.google.com/maps?q=${report.proofLatitude},${report.proofLongitude}`} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">Open proof location ↗</a>
                ) : null}
              </div>
            </div>
          </section>

          <section className="service-report-section rounded-3xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Treatment record</p><h3 className="mt-1 text-lg font-semibold">Work performed on site</h3></div>
              {report.nextServiceDate && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right"><p className="text-[10px] uppercase tracking-wider text-emerald-700">Next service</p><p className="mt-0.5 text-sm font-semibold text-emerald-900">{formatDate(report.nextServiceDate)}</p></div>}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2"><p className="text-xs font-semibold text-slate-500">Treatment summary</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.treatmentSummary}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Site observations</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.observations || "No additional site observations recorded."}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Recommendations</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{report.recommendations || "No additional recommendations recorded."}</p></div>
            </div>
          </section>

          <section className="service-report-section rounded-3xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Chemical usage</p><h3 className="mt-1 text-lg font-semibold">Materials applied</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{report.chemicalUsage.length} entries</span></div>
            {report.chemicalUsage.length === 0 ? <p className="mt-4 text-sm text-slate-500">No chemical usage was logged for this service.</p> : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-400"><tr><th className="px-4 py-3">Chemical</th><th className="px-4 py-3 text-right">Quantity</th></tr></thead><tbody className="divide-y divide-slate-100">{report.chemicalUsage.map((usage, index) => <tr key={`${usage.chemicalName}-${index}`}><td className="px-4 py-3 font-medium">{usage.chemicalName}</td><td className="px-4 py-3 text-right font-mono">{usage.quantityUsed} {UNIT_LABELS[usage.unit] ?? usage.unit}</td></tr>)}</tbody></table>
              </div>
            )}
          </section>

          <section className="service-report-section">
            <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Visual evidence</p><h3 className="mt-1 text-lg font-semibold">Before & after treatment</h3></div>
            <div className="grid gap-5 md:grid-cols-2">
              {[{ label: "Before", items: beforePhotos }, { label: "After", items: afterPhotos }].map((group) => (
                <div key={group.label} className="rounded-3xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="font-semibold">{group.label}</p><span className="text-xs text-slate-400">{group.items.length} photo{group.items.length === 1 ? "" : "s"}</span></div>
                  {group.items.length === 0 ? <div className="grid h-40 place-items-center rounded-2xl bg-slate-50 text-sm text-slate-400">No {group.label.toLowerCase()} photo</div> : <div className="grid grid-cols-2 gap-2">{group.items.slice(0, 4).map((photo) => <div key={photo._id} className="service-report-photo overflow-hidden rounded-xl bg-slate-100"><img src={`/api/projects/${id}/photos/${photo._id}`} alt={`${group.label} treatment evidence`} className="aspect-[4/3] h-full w-full object-cover" /></div>)}</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="service-report-section grid gap-5 rounded-3xl border border-slate-200 p-5 sm:grid-cols-[1fr_180px] sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Customer authorization</p>
              <h3 className="mt-1 text-lg font-semibold">Digitally signed completion</h3>
              <div className="mt-5 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <img src={report.customerSignatureDataUrl} alt={`Signature of ${report.customerSignedBy}`} className="h-24 max-w-full object-contain object-left" />
                <div className="mt-3 border-t border-slate-200 pt-3"><p className="font-semibold">{report.customerSignedBy}</p><p className="mt-1 text-xs text-slate-500">Signed {formatDate(report.customerSignedAt, true)}</p></div>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-5 text-slate-500">The signatory confirmed that the service details above were reviewed and the recorded work was completed at the service location.</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <QrCode verificationCode={report.verificationCode} className="h-36 w-36" />
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Scan to verify</p>
              <p className="mt-1 font-mono text-[10px] font-semibold text-slate-700">{report.verificationCode}</p>
            </div>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-7 py-5 text-center text-[11px] text-slate-500 sm:px-10">
          <p className="font-semibold text-slate-700">Pest Mantra · Verified Digital Service Record</p>
          <p className="mt-1">Report {report.reportNumber} · Verification {report.verificationCode}</p>
        </footer>
      </article>
    </div>
  );
}
