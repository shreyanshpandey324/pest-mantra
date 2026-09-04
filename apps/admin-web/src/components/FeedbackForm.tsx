"use client";

import { useMemo, useState } from "react";
import {
  FEEDBACK_TAG_LABELS,
  FeedbackPublicInfo,
  FeedbackTag,
} from "@/types/feedback";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";

interface FeedbackFormProps {
  code: string;
  initialInfo: FeedbackPublicInfo;
}

function serviceLabel(value: string) {
  return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " ");
}

function dateLabel(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeedbackForm({ code, initialInfo }: FeedbackFormProps) {
  const [rating, setRating] = useState(initialInfo.submittedRating ?? 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(initialInfo.submitted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratingText = useMemo(() => {
    const value = hoveredRating || rating;
    return ["Select a rating", "Needs improvement", "Fair", "Good", "Very good", "Excellent"][value];
  }, [hoveredRating, rating]);

  function toggleTag(tag: FeedbackTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 6)
    );
  }

  async function submit() {
    if (rating < 1) {
      setError("Please choose a star rating before submitting.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/feedback/public/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          wouldRecommend,
          tags,
          comment: comment.trim() || undefined,
        }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Could not submit feedback.");
      }
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <section className="overflow-hidden rounded-[30px] border border-emerald-400/20 bg-white text-slate-900 shadow-2xl shadow-emerald-950/30">
        <div className="bg-emerald-50 px-6 py-10 text-center sm:px-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-3xl font-black text-white">✓</div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Feedback received</p>
          <h1 className="mt-2 text-2xl font-semibold">Thank you for rating your service</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Your response helps Pest Mantra improve service quality and technician performance.
          </p>
          {rating > 0 ? <p className="mt-5 text-2xl tracking-[0.18em] text-amber-400">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</p> : null}
        </div>
        <div className="grid gap-3 px-6 py-6 text-sm sm:grid-cols-2 sm:px-10">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Service report</p><p className="mt-1 font-mono text-xs font-semibold">{initialInfo.reportNumber}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Technician</p><p className="mt-1 font-semibold">{initialInfo.technicianName}</p></div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-emerald-400/20 bg-white text-slate-900 shadow-2xl shadow-emerald-950/30">
      <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 px-6 py-7 sm:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Customer experience</p>
        <h1 className="mt-2 text-2xl font-semibold">How was your Pest Mantra service?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">A quick rating helps us maintain high field-service standards.</p>
        <div className="mt-5 grid gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4 text-sm sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-wider text-slate-400">Service</p><p className="mt-1 font-semibold capitalize">{serviceLabel(initialInfo.serviceType)}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-400">Technician</p><p className="mt-1 font-semibold">{initialInfo.technicianName}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-400">Job</p><p className="mt-1 font-mono text-xs font-semibold">{initialInfo.projectCode}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-400">Completed</p><p className="mt-1 font-semibold">{dateLabel(initialInfo.completedAt)}</p></div>
        </div>
      </div>

      <div className="space-y-7 px-6 py-7 sm:px-9 sm:py-9">
        <div className="text-center">
          <p className="text-sm font-semibold">Overall rating</p>
          <div className="mt-3 flex justify-center gap-1 sm:gap-2" onMouseLeave={() => setHoveredRating(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onMouseEnter={() => setHoveredRating(value)}
                onFocus={() => setHoveredRating(value)}
                onBlur={() => setHoveredRating(0)}
                onClick={() => setRating(value)}
                className={`grid h-12 w-12 place-items-center rounded-2xl text-3xl transition sm:h-14 sm:w-14 ${
                  value <= (hoveredRating || rating)
                    ? "bg-amber-50 text-amber-400 scale-105"
                    : "bg-slate-50 text-slate-300 hover:bg-amber-50"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">{ratingText}</p>
        </div>

        <div>
          <p className="text-sm font-semibold">What stood out?</p>
          <p className="mt-1 text-xs text-slate-500">Optional · choose any that apply</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(FeedbackTag).map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-700"
                  }`}
                >
                  {active ? "✓ " : ""}{FEEDBACK_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="feedback-comment" className="text-sm font-semibold">Anything else you want us to know?</label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={1500}
            placeholder="Tell us what went well or what we can improve…"
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">{comment.length}/1500</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold">Would you recommend Pest Mantra?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setWouldRecommend(true)} className={`h-11 rounded-xl border text-sm font-semibold transition ${wouldRecommend ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>Yes</button>
            <button type="button" onClick={() => setWouldRecommend(false)} className={`h-11 rounded-xl border text-sm font-semibold transition ${!wouldRecommend ? "border-slate-500 bg-slate-100 text-slate-800" : "border-slate-200 bg-white text-slate-500"}`}>Not yet</button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <button
          type="button"
          onClick={submit}
          disabled={saving || rating < 1}
          className="h-12 w-full rounded-2xl bg-emerald-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit feedback"}
        </button>

        <p className="text-center text-[11px] leading-5 text-slate-400">
          One response is accepted per finalized service report. Customer contact details and digital signatures are never shown on this page.
        </p>
      </div>
    </section>
  );
}
