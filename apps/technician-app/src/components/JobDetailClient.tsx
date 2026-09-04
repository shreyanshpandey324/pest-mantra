"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Job,
  JobPhoto,
  JobStatus,
  PhotoType,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/job";
import { ui } from "@/lib/ui-classes";
import { PhotoUploadSection } from "./PhotoUploadSection";
import { Chemical, CHEMICAL_UNIT_LABELS, ProjectChemicalUsage } from "@/types/inventory";
import { ServiceReport } from "@/types/serviceReport";
import { SignaturePad } from "./SignaturePad";

interface JobDetailClientProps {
  initialJob: Job;
  initialPhotos: JobPhoto[];
  initialChemicals: Chemical[];
  initialChemicalUsage: ProjectChemicalUsage[];
  initialServiceReport: ServiceReport | null;
  chemicalLoadWarning?: string | null;
}

/**
 * "Arrived" is a field-level checkpoint, not a status the backend
 * tracks — Module 2's state machine only has en_route → in_progress
 * as the technician-triggered transitions after assignment (see
 * ALLOWED_STATUS_TRANSITIONS in project.validators.ts), and this
 * module deliberately did not add a new backend status for it
 * rather than modify that state machine. So it's local component
 * state: it advances the on-screen flow (reveals the before-photo
 * step and the "Start Treatment" button) without calling the API.
 * Known trade-off, stated plainly: a page refresh while still
 * "en_route" resets this checkpoint. See MODULE_5 report.
 */
export function JobDetailClient({ initialJob, initialPhotos, initialChemicals, initialChemicalUsage, initialServiceReport, chemicalLoadWarning }: JobDetailClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(initialJob);
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos);
  const [hasArrived, setHasArrived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [confirmed, setConfirmed] = useState(Boolean(initialServiceReport?.customerSignedAt));
  const [serviceReport, setServiceReport] = useState<ServiceReport | null>(initialServiceReport);
  const [treatmentSummary, setTreatmentSummary] = useState(initialServiceReport?.treatmentSummary ?? "");
  const [observations, setObservations] = useState(initialServiceReport?.observations ?? "");
  const [recommendations, setRecommendations] = useState(initialServiceReport?.recommendations ?? "");
  const [nextServiceDate, setNextServiceDate] = useState(initialServiceReport?.nextServiceDate?.slice(0, 10) ?? "");
  const [customerSignedBy, setCustomerSignedBy] = useState(initialServiceReport?.customerSignedBy ?? initialJob.customerName);
  const [signatureDataUrl, setSignatureDataUrl] = useState(initialServiceReport?.customerSignatureDataUrl ?? "");
  const [chemicalUsage, setChemicalUsage] = useState<ProjectChemicalUsage[]>(initialChemicalUsage);
  const [chemicalId, setChemicalId] = useState(initialChemicals[0]?._id ?? "");
  const [quantityUsed, setQuantityUsed] = useState("");
  const [chemicalError, setChemicalError] = useState<string | null>(chemicalLoadWarning ?? null);
  const [chemicalSaving, setChemicalSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exceptionMode, setExceptionMode] = useState<"reschedule" | "failed" | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");
  const [failedReason, setFailedReason] = useState("customer_unavailable");
  const [suggestedDate, setSuggestedDate] = useState("");
  const [suggestedSlot, setSuggestedSlot] = useState("");
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [offlineDraftReady, setOfflineDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const beforePhotoCount = photos.filter((p) => p.photoType === PhotoType.BEFORE).length;
  const afterPhotoCount = photos.filter((p) => p.photoType === PhotoType.AFTER).length;

  useEffect(() => {
    const key = `pmt_arrived_${job._id}`;

    if (job.status === JobStatus.EN_ROUTE) {
      setHasArrived(window.sessionStorage.getItem(key) === "1");
      return;
    }

    window.sessionStorage.removeItem(key);
    setHasArrived(false);
  }, [job._id, job.status]);

  useEffect(() => {
    const key = `pmt_job_draft_${job._id}`;
    if (serviceReport || job.status === JobStatus.COMPLETED) {
      window.localStorage.removeItem(key);
      setOfflineDraftReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as {
          paymentMethod?: PaymentMethod | "";
          confirmed?: boolean;
          treatmentSummary?: string;
          observations?: string;
          recommendations?: string;
          nextServiceDate?: string;
          customerSignedBy?: string;
          signatureDataUrl?: string;
          savedAt?: string;
        };
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        if (typeof draft.confirmed === "boolean") setConfirmed(draft.confirmed);
        if (draft.treatmentSummary) setTreatmentSummary(draft.treatmentSummary);
        if (draft.observations) setObservations(draft.observations);
        if (draft.recommendations) setRecommendations(draft.recommendations);
        if (draft.nextServiceDate) setNextServiceDate(draft.nextServiceDate);
        if (draft.customerSignedBy) setCustomerSignedBy(draft.customerSignedBy);
        if (draft.signatureDataUrl) setSignatureDataUrl(draft.signatureDataUrl);
        if (draft.savedAt) setDraftSavedAt(draft.savedAt);
      }
    } catch {
      window.localStorage.removeItem(key);
    } finally {
      setOfflineDraftReady(true);
    }
  }, [job._id, job.status, serviceReport]);

  useEffect(() => {
    if (!offlineDraftReady || serviceReport || job.status === JobStatus.COMPLETED) return;
    const key = `pmt_job_draft_${job._id}`;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            paymentMethod,
            confirmed,
            treatmentSummary,
            observations,
            recommendations,
            nextServiceDate,
            customerSignedBy,
            signatureDataUrl,
            savedAt,
          }),
        );
        setDraftSavedAt(savedAt);
      } catch {
        // Browser storage can be unavailable or full; the live form remains usable.
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [offlineDraftReady, serviceReport, job._id, job.status, paymentMethod, confirmed, treatmentSummary, observations, recommendations, nextServiceDate, customerSignedBy, signatureDataUrl]);

  function markArrived() {
    window.sessionStorage.setItem(`pmt_arrived_${job._id}`, "1");
    setHasArrived(true);
  }

  async function updateStatus(
    status: JobStatus,
    extra?: { paymentMethod?: PaymentMethod; customerConfirmed?: boolean }
  ) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${job._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not update this job.");
        return;
      }
      setJob(json.data.job);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }


  async function submitFieldException() {
    setError(null);
    if (!exceptionMode) return;
    if (exceptionReason.trim().length < 3) { setError("Add a short reason so the office knows what to do next."); return; }
    setExceptionSaving(true);
    try {
      const path = exceptionMode === "reschedule" ? "reschedule-request" : "failed-visit";
      const body = exceptionMode === "reschedule"
        ? { reason: exceptionReason.trim(), suggestedDate: suggestedDate || undefined, suggestedTimeSlot: suggestedSlot || undefined }
        : { reason: failedReason, notes: exceptionReason.trim() };
      const response = await fetch(`/api/jobs/${job._id}/${path}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.message || "Could not send field exception");
      const updatedJob = json.data?.project ?? json.data?.data?.project;
      if (updatedJob) setJob(updatedJob);
      setExceptionMode(null); setExceptionReason(""); setSuggestedDate(""); setSuggestedSlot("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send field exception"); }
    finally { setExceptionSaving(false); }
  }

  function handlePhotoUploaded(photo: JobPhoto) {
    setPhotos((prev) => [...prev, photo]);
  }

  async function logChemicalUsage() {
    const quantity = Number(quantityUsed);
    if (!chemicalId || !Number.isFinite(quantity) || quantity <= 0) {
      setChemicalError("Select a chemical and enter a quantity greater than zero.");
      return;
    }

    setChemicalSaving(true);
    setChemicalError(null);
    try {
      const response = await fetch("/api/chemicals/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: job._id, chemicalId, quantityUsed: quantity }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.message || "Could not log chemical usage.");
      const usage = json.data?.usage as ProjectChemicalUsage | undefined;
      if (usage) setChemicalUsage((current) => [...current, usage]);
      setQuantityUsed("");
    } catch (caught) {
      setChemicalError(caught instanceof Error ? caught.message : "Could not log chemical usage.");
    } finally {
      setChemicalSaving(false);
    }
  }

  async function completeWithServiceReport() {
    if (!paymentMethod) {
      setError("Select a payment method before completing the job.");
      return;
    }
    if (treatmentSummary.trim().length < 10) {
      setError("Add a clear treatment summary of at least 10 characters.");
      return;
    }
    if (!customerSignedBy.trim() || !signatureDataUrl) {
      setError("Customer name and digital signature are required.");
      return;
    }
    if (!confirmed) {
      setError("Ask the customer to confirm the completed work.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const reportResponse = await fetch(`/api/jobs/${job._id}/service-report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          treatmentSummary: treatmentSummary.trim(),
          observations: observations.trim() || undefined,
          recommendations: recommendations.trim() || undefined,
          nextServiceDate: nextServiceDate || undefined,
          customerSignedBy: customerSignedBy.trim(),
          customerSignatureDataUrl: signatureDataUrl,
        }),
      });
      const reportJson = await reportResponse.json().catch(() => null);
      if (!reportResponse.ok || !reportJson?.success) {
        throw new Error(reportJson?.message ?? "Could not save the service report.");
      }

      const savedReport = reportJson.data?.report as ServiceReport | undefined;
      if (savedReport) setServiceReport(savedReport);

      const statusResponse = await fetch(`/api/jobs/${job._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: JobStatus.COMPLETED,
          paymentMethod,
          customerConfirmed: true,
          remarks: `Service report ${savedReport?.reportNumber ?? "saved"} signed by ${customerSignedBy.trim()}`,
        }),
      });
      const statusJson = await statusResponse.json().catch(() => null);
      if (!statusResponse.ok || !statusJson?.success) {
        throw new Error(statusJson?.message ?? "Service report was saved, but the job could not be completed. Please retry.");
      }

      setJob(statusJson.data.job);
      window.localStorage.removeItem(`pmt_job_draft_${job._id}`);
      setDraftSavedAt(null);
      if (savedReport) {
        setServiceReport({
          ...savedReport,
          status: "finalized",
          paymentMethod,
          completedAt: statusJson.data.job.completedAt,
          finalizedAt: statusJson.data.job.completedAt,
        });
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete this job.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const qualityGate = [
    { label: "Before photo", ok: beforePhotoCount > 0 },
    { label: "After photo", ok: afterPhotoCount > 0 },
    { label: "Treatment summary", ok: treatmentSummary.trim().length >= 10 },
    { label: "Chemical usage", ok: chemicalUsage.length > 0 },
    { label: "Customer signature", ok: Boolean(signatureDataUrl && customerSignedBy.trim()) },
    { label: "Customer confirmation", ok: confirmed },
    { label: "Payment method", ok: Boolean(paymentMethod) },
  ];
  const qualityScore = Math.round((qualityGate.filter((item) => item.ok).length / qualityGate.length) * 100);

  const chemicalName = (id: string) => initialChemicals.find((chemical) => chemical._id === id)?.name ?? "Chemical";
  const chemicalUnit = (id: string) => {
    const unit = initialChemicals.find((chemical) => chemical._id === id)?.unit;
    return unit ? CHEMICAL_UNIT_LABELS[unit] : "";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={`${ui.card} p-5`}>
        <p className="mb-1 font-mono text-xs text-ink-faint">{job.projectCode}</p>
        <h1 className="mb-1 text-xl font-semibold">{job.customerName}</h1>
        <p className="mb-3 text-sm text-ink-muted">{SERVICE_TYPE_LABELS[job.serviceType]}</p>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-faint">Address</dt>
            <dd className="text-right">{job.address}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-faint">Phone</dt>
            <dd>
              <a href={`tel:${job.customerPhone}`} className="text-accent">
                {job.customerPhone}
              </a>
            </dd>
          </div>
          {job.scheduledDate && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Scheduled</dt>
              <dd>
                {new Date(job.scheduledDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })}
                {job.scheduledTimeSlot ? `, ${job.scheduledTimeSlot}` : ""}
              </dd>
            </div>
          )}
          {job.notes && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Notes</dt>
              <dd className="text-right">{job.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {error && <p className={ui.errorText}>{error}</p>}


      {job.status !== JobStatus.COMPLETED && job.status !== JobStatus.CANCELLED ? (
        <section className={`${ui.card} overflow-hidden`}>
          <div className="border-b border-border-default bg-surface-2/70 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">Need office help?</p>
            <h2 className="mt-1 text-sm font-semibold">One-tap field exception</h2>
            <p className="mt-1 text-xs text-ink-muted">Customer unavailable, timing issue or failed visit? Report it here instead of calling the office repeatedly.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            <button type="button" onClick={()=>setExceptionMode(exceptionMode==="reschedule"?null:"reschedule")} className="rounded-xl border border-border-default px-3 py-3 text-left text-sm font-semibold hover:border-accent">↻ Reschedule</button>
            <button type="button" onClick={()=>setExceptionMode(exceptionMode==="failed"?null:"failed")} className="rounded-xl border border-border-default px-3 py-3 text-left text-sm font-semibold hover:border-warning">! Failed visit</button>
          </div>
          {exceptionMode ? <div className="space-y-3 border-t border-border-default p-4">
            {exceptionMode === "failed" ? <div><label className={ui.label}>What happened?</label><select value={failedReason} onChange={e=>setFailedReason(e.target.value)} className={`${ui.input} mt-2`}><option value="customer_unavailable">Customer unavailable</option><option value="site_locked">Site locked</option><option value="wrong_address">Wrong address</option><option value="material_unavailable">Material unavailable</option><option value="safety_risk">Safety risk</option><option value="other">Other</option></select></div> : <div className="grid gap-3 sm:grid-cols-2"><div><label className={ui.label}>Suggested date</label><input type="date" value={suggestedDate} onChange={e=>setSuggestedDate(e.target.value)} className={`${ui.input} mt-2`} /></div><div><label className={ui.label}>Suggested slot</label><input value={suggestedSlot} onChange={e=>setSuggestedSlot(e.target.value)} placeholder="e.g. 2–4 PM" className={`${ui.input} mt-2`} /></div></div>}
            <div><label className={ui.label}>{exceptionMode === "failed" ? "Field note" : "Reason for reschedule"}</label><textarea value={exceptionReason} onChange={e=>setExceptionReason(e.target.value)} rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-border-default bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Keep it short and clear…" /></div>
            <button type="button" disabled={exceptionSaving} onClick={submitFieldException} className={ui.btnPrimary}>{exceptionSaving?"Sending…":"Send to office"}</button>
          </div> : null}
          {job.rescheduleRequestedAt ? <div className="border-t border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">Office action pending: {job.rescheduleReason || "Reschedule requested"}</div> : null}
        </section>
      ) : null}

      {job.status === JobStatus.ASSIGNED && (
        <button
          type="button"
          className={ui.btnAction}
          onClick={() => updateStatus(JobStatus.EN_ROUTE)}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Updating…" : "Start Journey"}
        </button>
      )}

      {job.status === JobStatus.EN_ROUTE && !hasArrived && (
        <button type="button" className={ui.btnAction} onClick={markArrived}>
          Mark Arrived
        </button>
      )}

      {job.status === JobStatus.EN_ROUTE && hasArrived && (
        <div className="flex flex-col gap-4">
          <PhotoUploadSection
            jobId={job._id}
            photoType={PhotoType.BEFORE}
            photos={photos}
            onUploaded={handlePhotoUploaded}
          />
          <div className={`${ui.card} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 border-b border-success/15 bg-success/5 px-4 py-2 text-[11px]">
              <span className="font-semibold text-success">Offline draft protection</span>
              <span className="text-ink-muted">{draftSavedAt ? `Saved on device ${new Date(draftSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Auto-save ready"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border-default bg-surface-2/70 px-4 py-3">
              <div><p className="text-sm font-semibold">Service Quality Gate</p><p className="mt-1 text-xs text-ink-muted">Proof-of-service completeness before final submission.</p></div>
              <span className={`text-lg font-semibold ${qualityScore === 100 ? "text-success" : qualityScore >= 70 ? "text-warning" : "text-danger"}`}>{qualityScore}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {qualityGate.map((item) => <div key={item.label} className={`rounded-lg border px-3 py-2 text-xs ${item.ok ? "border-success/25 bg-success/5 text-success" : "border-border-default text-ink-faint"}`}><span className="mr-1.5">{item.ok ? "✓" : "○"}</span>{item.label}</div>)}
            </div>
          </div>

          <button
            type="button"
            className={ui.btnAction}
            onClick={() => updateStatus(JobStatus.IN_PROGRESS)}
            disabled={isSubmitting || beforePhotoCount === 0}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Updating…" : "Start Treatment"}
          </button>
          {beforePhotoCount === 0 && (
            <p className="text-center text-xs text-ink-faint">Add at least one before photo to continue.</p>
          )}
        </div>
      )}

      {job.status === JobStatus.IN_PROGRESS && (
        <div className="flex flex-col gap-5">
          <div className={`${ui.card} p-4`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold">Chemical usage</p><p className="mt-1 text-xs text-ink-muted">Log the actual chemical quantity used on this job.</p></div>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Live</span>
            </div>
            {chemicalError && <p className={`${ui.errorText} mb-3`}>{chemicalError}</p>}
            {initialChemicals.length > 0 ? (
              <>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                  <select value={chemicalId} onChange={(event) => setChemicalId(event.target.value)} className="h-11 rounded-lg border border-border-default bg-surface-2 px-3 text-sm outline-none focus:border-accent">
                    {initialChemicals.filter((chemical) => chemical.isActive).map((chemical) => <option key={chemical._id} value={chemical._id}>{chemical.name} ({CHEMICAL_UNIT_LABELS[chemical.unit]})</option>)}
                  </select>
                  <input value={quantityUsed} onChange={(event) => setQuantityUsed(event.target.value)} inputMode="decimal" placeholder="Qty" className="h-11 rounded-lg border border-border-default bg-surface-2 px-3 text-sm outline-none focus:border-accent" />
                  <button type="button" onClick={logChemicalUsage} disabled={chemicalSaving} className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50">{chemicalSaving ? "Saving…" : "Add usage"}</button>
                </div>
                <div className="mt-4 space-y-2">
                  {chemicalUsage.length === 0 ? <p className="rounded-lg border border-dashed border-border-default p-3 text-xs text-ink-faint">No chemical usage logged yet.</p> : chemicalUsage.map((usage) => <div key={usage._id} className="flex items-center justify-between rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-sm"><span>{chemicalName(usage.chemicalId)}</span><span className="font-mono text-xs text-ink-muted">{usage.quantityUsed} {chemicalUnit(usage.chemicalId)}</span></div>)}
                </div>
              </>
            ) : <p className="text-xs text-ink-muted">No active chemicals are available for your company.</p>}
          </div>

          <PhotoUploadSection
            jobId={job._id}
            photoType={PhotoType.AFTER}
            photos={photos}
            onUploaded={handlePhotoUploaded}
          />

          <div className={`${ui.card} overflow-hidden`}>
            <div className="border-b border-border-default bg-surface-2/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Digital service report</p>
                  <p className="mt-1 text-xs text-ink-muted">Capture the treatment outcome and customer sign-off before completion.</p>
                </div>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Required</span>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className={ui.label}>Treatment summary *</label>
                <textarea
                  value={treatmentSummary}
                  onChange={(event) => setTreatmentSummary(event.target.value)}
                  rows={4}
                  maxLength={3000}
                  placeholder="Describe treatment performed, target areas and work completed…"
                  className="mt-2 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={ui.label}>Site observations</label>
                  <textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={3} maxLength={2000} placeholder="Infestation signs, entry points, hygiene observations…" className="mt-2 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-accent" />
                </div>
                <div>
                  <label className={ui.label}>Recommendations</label>
                  <textarea value={recommendations} onChange={(event) => setRecommendations(event.target.value)} rows={3} maxLength={2000} placeholder="Preventive actions or follow-up advice…" className="mt-2 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-accent" />
                </div>
              </div>

              <div>
                <label className={ui.label}>Recommended next service</label>
                <input type="date" value={nextServiceDate} onChange={(event) => setNextServiceDate(event.target.value)} className={`${ui.input} mt-2`} />
              </div>

              <div className="rounded-2xl border border-border-default bg-surface-2/60 p-3">
                <label className={ui.label}>Customer / authorized signatory *</label>
                <input value={customerSignedBy} onChange={(event) => setCustomerSignedBy(event.target.value)} maxLength={100} className={`${ui.input} mt-2`} placeholder="Name of person signing" />
                <div className="mt-3">
                  <SignaturePad value={signatureDataUrl || undefined} onChange={setSignatureDataUrl} disabled={isSubmitting} />
                </div>
              </div>
            </div>
          </div>

          <div className={`${ui.card} p-4`}>
            <p className={`${ui.label} mb-2`}>Payment method *</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PaymentMethod).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border-default text-ink-muted"
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          <label className={`${ui.card} flex items-start gap-3 p-4 text-sm`}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
            />
            <span>Customer has reviewed the service details, confirms the work is complete, and authorizes the digital signature above.</span>
          </label>

          <button
            type="button"
            className={ui.btnAction}
            disabled={isSubmitting || afterPhotoCount === 0 || !paymentMethod || !confirmed || treatmentSummary.trim().length < 10 || !signatureDataUrl || !customerSignedBy.trim()}
            aria-busy={isSubmitting}
            onClick={completeWithServiceReport}
          >
            {isSubmitting ? "Generating report & completing…" : "Complete & Generate Service Report"}
          </button>
          {(afterPhotoCount === 0 || !paymentMethod || !confirmed || treatmentSummary.trim().length < 10 || !signatureDataUrl) && (
            <p className="text-center text-xs leading-5 text-ink-faint">
              After photo, treatment summary, payment method, customer signature and confirmation are required.
            </p>
          )}
        </div>
      )}

      {job.status === JobStatus.COMPLETED && (
        <div className={`${ui.card} overflow-hidden`}>
          <div className="bg-success/10 px-5 py-5 text-center">
            <p className="text-lg font-semibold text-success">✓ Job completed & signed</p>
            <p className="mt-1 text-sm text-ink-muted">The customer service record has been finalized.</p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            {serviceReport && (
              <>
                <div className="flex items-center justify-between gap-3"><span className="text-ink-faint">Service report</span><span className="font-mono text-xs text-ink">{serviceReport.reportNumber}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-ink-faint">Verification</span><span className="font-mono text-xs text-accent">{serviceReport.verificationCode}</span></div>
                <div className="flex items-center justify-between gap-3"><span className="text-ink-faint">Signed by</span><span>{serviceReport.customerSignedBy}</span></div>
              </>
            )}
            {job.paymentMethod && <div className="flex items-center justify-between gap-3"><span className="text-ink-faint">Payment</span><span>{PAYMENT_METHOD_LABELS[job.paymentMethod]}</span></div>}
            {chemicalUsage.length > 0 && <div className="flex items-center justify-between gap-3"><span className="text-ink-faint">Chemical entries</span><span>{chemicalUsage.length}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
