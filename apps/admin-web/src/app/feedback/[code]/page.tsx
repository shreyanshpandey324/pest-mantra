import Link from "next/link";
import { FeedbackForm } from "@/components/FeedbackForm";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { FeedbackPublicInfo } from "@/types/feedback";

export default async function CustomerFeedbackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let info: FeedbackPublicInfo | null = null;
  let error: string | null = null;

  try {
    info = await backendFetch<FeedbackPublicInfo>(`/feedback/public/${encodeURIComponent(code)}`);
  } catch (caught) {
    error = caught instanceof BackendApiError ? caught.message : "Feedback service is temporarily unavailable.";
  }

  return (
    <main className="min-h-screen bg-[#07110d] px-4 py-10 text-white sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950">PM</div>
          <div><p className="font-semibold">Pest Mantra</p><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer feedback</p></div>
        </div>

        {info ? (
          <FeedbackForm code={code} initialInfo={info} />
        ) : (
          <section className="rounded-[30px] border border-red-400/20 bg-white p-8 text-center text-slate-900 shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl text-red-600">!</div>
            <h1 className="mt-4 text-xl font-semibold">Feedback link unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{error ?? "No finalized service report matches this feedback link."}</p>
          </section>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-xs">
          <Link href={`/verify/service/${encodeURIComponent(code)}`} className="font-semibold text-emerald-300 hover:text-emerald-200">Verify service report</Link>
          <span className="text-slate-600">•</span>
          <Link href="/" className="font-semibold text-slate-400 hover:text-white">Pest Mantra</Link>
        </div>
      </div>
    </main>
  );
}
