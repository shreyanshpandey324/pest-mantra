import { cookies } from "next/headers";
import { FeedbackDashboard } from "@/components/FeedbackDashboard";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { FeedbackDashboardData } from "@/types/feedback";

const EMPTY_DATA: FeedbackDashboardData = {
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

export default async function FeedbackPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  let data = EMPTY_DATA;
  let error: string | null = null;

  try {
    data = await backendFetch<FeedbackDashboardData>("/feedback", { accessToken });
  } catch (caught) {
    error = caught instanceof BackendApiError ? caught.message : "Could not load customer feedback.";
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-success">Customer experience</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Feedback & Ratings</h1></div>
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">{error}</div>
      </div>
    );
  }

  return <FeedbackDashboard data={data} />;
}
