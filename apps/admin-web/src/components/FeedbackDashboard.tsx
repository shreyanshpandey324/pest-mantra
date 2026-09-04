"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CustomerFeedback,
  FEEDBACK_TAG_LABELS,
  FeedbackDashboardData,
} from "@/types/feedback";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";

const CHART_GREEN = "#3ddc84";
const CHART_GREEN_SOFT = "#78e7aa";
const CHART_AMBER = "#fbbf24";
const CHART_RED = "#fb7185";
const CHART_GRID = "#2a2f3a";
const CHART_TEXT = "#9aa1ac";
const RATING_COLORS: Record<number, string> = {
  1: CHART_RED,
  2: "#fb923c",
  3: CHART_AMBER,
  4: CHART_GREEN_SOFT,
  5: CHART_GREEN,
};

const tooltipStyle = {
  background: "#171a21",
  border: "1px solid #2a2f3a",
  borderRadius: 12,
  color: "#f2f1ed",
  boxShadow: "0 12px 30px rgba(0,0,0,.35)",
};

function serviceLabel(value: string) {
  return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " ");
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function ratingTone(rating: number) {
  if (rating <= 2) return "border-danger/30 bg-danger/10 text-danger";
  if (rating === 3) return "border-warning/30 bg-warning/10 text-warning";
  return "border-success/30 bg-success/10 text-success";
}

export function FeedbackDashboard({ data }: { data: FeedbackDashboardData }) {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");
  const [technician, setTechnician] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.feedback.filter((item) => {
      if (rating !== "all" && item.rating !== Number(rating)) return false;
      if (technician !== "all" && (item.technicianId ?? item.technicianName) !== technician) return false;
      if (!query) return true;
      return [
        item.reportNumber,
        item.projectCode,
        item.technicianName,
        item.companyName,
        item.branchName,
        item.comment,
        serviceLabel(item.serviceType),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data.feedback, rating, search, technician]);

  const ratingDistribution = data.metrics.distribution.map((item) => ({
    name: `${item.rating} star`,
    rating: item.rating,
    count: item.count,
  }));

  const recommendData = [
    { name: "Recommend", value: data.metrics.recommendRate },
    { name: "Not yet", value: Math.max(0, 100 - data.metrics.recommendRate) },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_14px_rgba(61,220,132,.75)]" />
            <p className="font-mono text-xs uppercase tracking-[.2em] text-success">Customer experience</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Feedback & Ratings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Verified post-service ratings tied to finalized service reports. Monitor quality, loyalty and technician performance from real customer responses.
          </p>
        </div>
        <div className="rounded-2xl border border-border-default bg-surface px-4 py-3 text-xs text-ink-muted">
          <span className="font-mono text-success">VERIFIED JOBS ONLY</span> · One response per service report
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Average rating", data.metrics.total ? `${data.metrics.averageRating.toFixed(1)} / 5` : "—", `${data.metrics.total} responses`, "★"],
          ["Recommend rate", `${data.metrics.recommendRate}%`, "Would recommend Pest Mantra", "↗"],
          ["5-star reviews", data.metrics.fiveStarCount, "Top customer experiences", "✓"],
          ["Low ratings", data.metrics.lowRatingCount, "1–2 star attention items", "!"],
          ["Responses", data.metrics.total, "Finalized service feedback", "◉"],
        ].map(([label, value, hint, icon]) => (
          <div key={String(label)} className="group relative overflow-hidden rounded-2xl border border-border-default bg-surface p-5 transition hover:-translate-y-0.5 hover:border-success/40">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-success/5 blur-2xl transition group-hover:bg-success/10" />
            <div className="flex items-start justify-between gap-3"><p className="text-sm text-ink-muted">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-success/15 bg-success/10 text-success">{icon}</span></div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
            <p className="mt-1 text-xs text-ink-faint">{hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[24px] border border-border-default bg-surface p-5">
          <div className="mb-5"><p className="text-sm font-semibold text-ink">Rating distribution</p><p className="mt-1 text-xs text-ink-muted">All customer responses in your visible company/branch scope.</p></div>
          {data.metrics.total > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ratingDistribution} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Responses" radius={[9, 9, 0, 0]} maxBarSize={60}>
                  {ratingDistribution.map((item) => <Cell key={item.rating} fill={RATING_COLORS[item.rating]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart text="No customer ratings have been submitted yet." />}
        </div>

        <div className="rounded-[24px] border border-border-default bg-surface p-5">
          <div className="mb-3"><p className="text-sm font-semibold text-ink">Recommendation signal</p><p className="mt-1 text-xs text-ink-muted">Customers who would recommend Pest Mantra after service.</p></div>
          {data.metrics.total > 0 ? (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_160px] xl:grid-cols-1 2xl:grid-cols-[1fr_160px]">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie data={recommendData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4} stroke="none">
                    <Cell fill={CHART_GREEN} /><Cell fill="#3b4250" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <p className="text-4xl font-semibold text-success">{data.metrics.recommendRate}%</p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">Recommendation rate across submitted responses.</p>
              </div>
            </div>
          ) : <EmptyChart text="Recommendation data appears after the first response." />}
        </div>
      </section>

      <section className="rounded-[26px] border border-border-default bg-surface p-5">
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-sm font-semibold text-ink">Technician experience score</p><p className="mt-1 text-xs text-ink-muted">Customer-rated technician performance from completed jobs.</p></div>
          <p className="text-[11px] text-ink-faint">Low-volume ratings should be read with context.</p>
        </div>
        {data.technicians.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default p-8 text-center text-sm text-ink-muted">No technician feedback data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead><tr className="border-b border-border-default text-[10px] uppercase tracking-[0.18em] text-ink-faint"><th className="pb-3 font-semibold">Technician</th><th className="pb-3 font-semibold">Avg rating</th><th className="pb-3 font-semibold">Responses</th><th className="pb-3 font-semibold">Recommend</th><th className="pb-3 font-semibold">Low ratings</th><th className="pb-3 font-semibold">Signal</th></tr></thead>
              <tbody className="divide-y divide-border-default">
                {data.technicians.map((item) => (
                  <tr key={item.technicianId ?? item.technicianName}>
                    <td className="py-4 font-medium text-ink">{item.technicianName}</td>
                    <td className="py-4"><span className="font-mono text-sm text-amber-400">★ {item.averageRating.toFixed(1)}</span></td>
                    <td className="py-4 text-ink-muted">{item.responses}</td>
                    <td className="py-4 text-success">{item.recommendRate}%</td>
                    <td className="py-4"><span className={item.lowRatings > 0 ? "text-danger" : "text-ink-muted"}>{item.lowRatings}</span></td>
                    <td className="py-4"><div className="h-2 w-28 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-success" style={{ width: `${Math.max(0, Math.min(100, (item.averageRating / 5) * 100))}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="rounded-[24px] border border-border-default bg-surface p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_170px_230px]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report, job, technician, service or comment…" className="h-11 rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-success" />
            <select value={rating} onChange={(event) => setRating(event.target.value)} className="h-11 rounded-xl border border-border-default bg-surface-2 px-3 text-sm text-ink outline-none focus:border-success">
              <option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}
            </select>
            <select value={technician} onChange={(event) => setTechnician(event.target.value)} className="h-11 rounded-xl border border-border-default bg-surface-2 px-3 text-sm text-ink outline-none focus:border-success">
              <option value="all">All technicians</option>{data.technicians.map((item) => <option key={item.technicianId ?? item.technicianName} value={item.technicianId ?? item.technicianName}>{item.technicianName}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border-default bg-surface px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-success/10 text-xl text-success">★</div><h2 className="mt-4 text-lg font-semibold text-ink">No feedback found</h2><p className="mt-2 text-sm text-ink-muted">Customer ratings will appear after finalized jobs receive a response.</p></div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((item) => <FeedbackCard key={item._id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function FeedbackCard({ item }: { item: CustomerFeedback }) {
  return (
    <article className={`rounded-[24px] border bg-surface p-5 ${item.rating <= 2 ? "border-danger/30" : "border-border-default"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ratingTone(item.rating)}`}>{item.rating} / 5</span><span className="font-mono text-[11px] text-ink-faint">{item.reportNumber}</span></div>
          <p className="mt-3 text-xl tracking-[0.12em] text-amber-400">{stars(item.rating)}</p>
        </div>
        <div className="text-left sm:text-right"><p className="text-sm font-semibold text-ink">{item.technicianName}</p><p className="mt-1 text-xs text-ink-faint">{dateLabel(item.submittedAt)}</p></div>
      </div>

      {item.comment ? <blockquote className="mt-4 rounded-2xl border border-border-default bg-surface-2/70 p-4 text-sm leading-6 text-ink-muted">“{item.comment}”</blockquote> : <p className="mt-4 text-sm italic text-ink-faint">No written comment provided.</p>}

      {item.tags.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full border border-success/20 bg-success/5 px-2.5 py-1 text-[10px] font-semibold text-success">{FEEDBACK_TAG_LABELS[tag]}</span>)}</div> : null}

      <div className="mt-5 grid gap-3 border-t border-border-default pt-4 text-xs sm:grid-cols-3">
        <div><p className="uppercase tracking-wider text-ink-faint">Job</p><p className="mt-1 font-mono text-ink-muted">{item.projectCode}</p></div>
        <div><p className="uppercase tracking-wider text-ink-faint">Service</p><p className="mt-1 capitalize text-ink-muted">{serviceLabel(item.serviceType)}</p></div>
        <div><p className="uppercase tracking-wider text-ink-faint">Recommend</p><p className={`mt-1 font-semibold ${item.wouldRecommend ? "text-success" : "text-warning"}`}>{item.wouldRecommend ? "Yes" : "Not yet"}</p></div>
      </div>
    </article>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-[240px] place-items-center rounded-2xl border border-dashed border-border-default text-center text-sm text-ink-muted">{text}</div>;
}
