export enum FeedbackTag {
  ON_TIME = "on_time",
  PROFESSIONAL = "professional",
  EFFECTIVE = "effective",
  CLEAN_WORK = "clean_work",
  HELPFUL = "helpful",
  GOOD_COMMUNICATION = "good_communication",
}

export const FEEDBACK_TAG_LABELS: Record<FeedbackTag, string> = {
  [FeedbackTag.ON_TIME]: "On time",
  [FeedbackTag.PROFESSIONAL]: "Professional",
  [FeedbackTag.EFFECTIVE]: "Effective treatment",
  [FeedbackTag.CLEAN_WORK]: "Clean work",
  [FeedbackTag.HELPFUL]: "Helpful",
  [FeedbackTag.GOOD_COMMUNICATION]: "Good communication",
};

export interface FeedbackPublicInfo {
  reportNumber: string;
  projectCode: string;
  verificationCode: string;
  serviceType: string;
  technicianName: string;
  companyName?: string;
  branchName?: string;
  completedAt?: string;
  submitted: boolean;
  submittedRating?: number;
  submittedAt?: string;
}

export interface CustomerFeedback {
  _id: string;
  companyId?: string;
  branchId?: string;
  serviceReportId: string;
  projectId: string;
  technicianId?: string;
  reportNumber: string;
  projectCode: string;
  serviceType: string;
  technicianName: string;
  companyName?: string;
  branchName?: string;
  rating: number;
  wouldRecommend: boolean;
  tags: FeedbackTag[];
  comment?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackDistributionPoint {
  rating: number;
  count: number;
}

export interface FeedbackMetrics {
  total: number;
  averageRating: number;
  recommendRate: number;
  fiveStarCount: number;
  lowRatingCount: number;
  distribution: FeedbackDistributionPoint[];
}

export interface TechnicianFeedbackMetric {
  technicianId?: string;
  technicianName: string;
  responses: number;
  averageRating: number;
  recommendRate: number;
  lowRatings: number;
}

export interface FeedbackDashboardData {
  feedback: CustomerFeedback[];
  metrics: FeedbackMetrics;
  technicians: TechnicianFeedbackMetric[];
}
