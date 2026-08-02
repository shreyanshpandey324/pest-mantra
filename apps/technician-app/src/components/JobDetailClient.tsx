"use client";

import { useState } from "react";
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

interface JobDetailClientProps {
  initialJob: Job;
  initialPhotos: JobPhoto[];
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
export function JobDetailClient({ initialJob, initialPhotos }: JobDetailClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<Job>(initialJob);
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos);
  const [hasArrived, setHasArrived] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beforePhotoCount = photos.filter((p) => p.photoType === PhotoType.BEFORE).length;
  const afterPhotoCount = photos.filter((p) => p.photoType === PhotoType.AFTER).length;

  async function updateStatus(status: JobStatus, extra?: { paymentMethod?: PaymentMethod }) {
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

  function handlePhotoUploaded(photo: JobPhoto) {
    setPhotos((prev) => [...prev, photo]);
  }

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
        <button type="button" className={ui.btnAction} onClick={() => setHasArrived(true)}>
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
          <PhotoUploadSection
            jobId={job._id}
            photoType={PhotoType.AFTER}
            photos={photos}
            onUploaded={handlePhotoUploaded}
          />

          <div>
            <p className={`${ui.label} mb-2`}>Payment method</p>
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

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
            />
            <span>Customer has confirmed the work is complete and signed the job card.</span>
          </label>

          <button
            type="button"
            className={ui.btnAction}
            disabled={isSubmitting || afterPhotoCount === 0 || !paymentMethod || !confirmed}
            aria-busy={isSubmitting}
            onClick={() => {
              if (!paymentMethod) return;
              updateStatus(JobStatus.COMPLETED, { paymentMethod });
            }}
          >
            {isSubmitting ? "Completing…" : "Complete Job"}
          </button>
          {(afterPhotoCount === 0 || !paymentMethod || !confirmed) && (
            <p className="text-center text-xs text-ink-faint">
              Add an after photo, select a payment method, and confirm with the customer to complete.
            </p>
          )}
        </div>
      )}

      {job.status === JobStatus.COMPLETED && (
        <div className={`${ui.card} p-5 text-center`}>
          <p className="mb-1 text-success">✓ Job completed</p>
          {job.paymentMethod && (
            <p className="text-sm text-ink-muted">Paid via {PAYMENT_METHOD_LABELS[job.paymentMethod]}</p>
          )}
        </div>
      )}
    </div>
  );
}
