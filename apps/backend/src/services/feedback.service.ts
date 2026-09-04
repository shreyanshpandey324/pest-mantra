import mongoose, { FilterQuery } from "mongoose";
import { Feedback, IFeedback } from "../models/Feedback";
import { ServiceReport, ServiceReportStatus } from "../models/ServiceReport";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { ListFeedbackInput, SubmitFeedbackInput } from "../validators/feedback.validators";

function oid(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function tenant(scope: CallerScope): FilterQuery<IFeedback> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) {
    throw ApiError.forbidden("Your account is not linked to a company and branch");
  }
  return {
    companyId: oid(scope.companyId),
    branchId: oid(scope.branchId),
  };
}

function normalizedCode(code: string) {
  return code.trim().toUpperCase();
}

async function finalizedReport(code: string) {
  const report = await ServiceReport.findOne({
    verificationCode: normalizedCode(code),
    status: ServiceReportStatus.FINALIZED,
  }).select(
    "_id companyId branchId projectId technicianId reportNumber projectCode serviceType technicianName companyName branchName completedAt finalizedAt verificationCode"
  );

  if (!report) {
    throw ApiError.notFound("No finalized Pest Mantra service report matches this feedback code");
  }
  return report;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const feedbackService = {
  async publicInfo(code: string) {
    const report = await finalizedReport(code);
    const existing = await Feedback.findOne({ serviceReportId: report._id }).select("rating submittedAt");

    return {
      reportNumber: report.reportNumber,
      projectCode: report.projectCode,
      verificationCode: report.verificationCode,
      serviceType: report.serviceType,
      technicianName: report.technicianName,
      companyName: report.companyName,
      branchName: report.branchName,
      completedAt: report.completedAt ?? report.finalizedAt,
      submitted: Boolean(existing),
      submittedRating: existing?.rating,
      submittedAt: existing?.submittedAt,
    };
  },

  async submit(code: string, input: SubmitFeedbackInput) {
    const report = await finalizedReport(code);
    const alreadySubmitted = await Feedback.exists({ serviceReportId: report._id });
    if (alreadySubmitted) {
      throw ApiError.conflict("Feedback has already been submitted for this service report");
    }

    try {
      const feedback = await Feedback.create({
        companyId: report.companyId,
        branchId: report.branchId,
        serviceReportId: report._id,
        projectId: report.projectId,
        technicianId: report.technicianId,
        reportNumber: report.reportNumber,
        projectCode: report.projectCode,
        serviceType: report.serviceType,
        technicianName: report.technicianName,
        companyName: report.companyName,
        branchName: report.branchName,
        rating: input.rating,
        wouldRecommend: input.wouldRecommend,
        tags: input.tags,
        comment: input.comment?.trim() || undefined,
        submittedAt: new Date(),
      });

      return {
        submitted: true,
        rating: feedback.rating,
        submittedAt: feedback.submittedAt,
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw ApiError.conflict("Feedback has already been submitted for this service report");
      }
      throw error;
    }
  },

  async dashboard(scope: CallerScope, query: ListFeedbackInput) {
    const filter: FilterQuery<IFeedback> = { ...tenant(scope) };
    if (query.rating) filter.rating = query.rating;
    if (query.technicianId) filter.technicianId = oid(query.technicianId, "Invalid technician id");
    if (query.search) {
      filter.$or = [
        { reportNumber: { $regex: query.search, $options: "i" } },
        { projectCode: { $regex: query.search, $options: "i" } },
        { technicianName: { $regex: query.search, $options: "i" } },
        { comment: { $regex: query.search, $options: "i" } },
      ];
    }

    const feedback = await Feedback.find(filter).sort({ submittedAt: -1 }).limit(500);
    const allVisible = await Feedback.find(tenant(scope)).sort({ submittedAt: -1 }).limit(5000);

    const total = allVisible.length;
    const ratingTotal = allVisible.reduce((sum, item) => sum + item.rating, 0);
    const recommendCount = allVisible.filter((item) => item.wouldRecommend).length;
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: allVisible.filter((item) => item.rating === rating).length,
    }));

    const technicianMap = new Map<
      string,
      { technicianId?: string; technicianName: string; responses: number; ratingTotal: number; recommendCount: number; lowRatings: number }
    >();

    for (const item of allVisible) {
      const key = item.technicianId?.toString() ?? `name:${item.technicianName}`;
      const current = technicianMap.get(key) ?? {
        technicianId: item.technicianId?.toString(),
        technicianName: item.technicianName,
        responses: 0,
        ratingTotal: 0,
        recommendCount: 0,
        lowRatings: 0,
      };
      current.responses += 1;
      current.ratingTotal += item.rating;
      if (item.wouldRecommend) current.recommendCount += 1;
      if (item.rating <= 2) current.lowRatings += 1;
      technicianMap.set(key, current);
    }

    const technicians = [...technicianMap.values()]
      .map((item) => ({
        technicianId: item.technicianId,
        technicianName: item.technicianName,
        responses: item.responses,
        averageRating: round(item.ratingTotal / item.responses),
        recommendRate: Math.round((item.recommendCount / item.responses) * 100),
        lowRatings: item.lowRatings,
      }))
      .sort((a, b) => b.averageRating - a.averageRating || b.responses - a.responses);

    return {
      feedback,
      metrics: {
        total,
        averageRating: total ? round(ratingTotal / total) : 0,
        recommendRate: total ? Math.round((recommendCount / total) * 100) : 0,
        fiveStarCount: allVisible.filter((item) => item.rating === 5).length,
        lowRatingCount: allVisible.filter((item) => item.rating <= 2).length,
        distribution,
      },
      technicians,
    };
  },
};
