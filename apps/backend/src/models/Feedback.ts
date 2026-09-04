import { Document, Schema, Types, model } from "mongoose";
import { ServiceType } from "./Project";

export enum FeedbackTag {
  ON_TIME = "on_time",
  PROFESSIONAL = "professional",
  EFFECTIVE = "effective",
  CLEAN_WORK = "clean_work",
  HELPFUL = "helpful",
  GOOD_COMMUNICATION = "good_communication",
}

export interface IFeedback extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  serviceReportId: Types.ObjectId;
  projectId: Types.ObjectId;
  technicianId?: Types.ObjectId;
  reportNumber: string;
  projectCode: string;
  serviceType: ServiceType;
  technicianName: string;
  companyName?: string;
  branchName?: string;
  rating: number;
  wouldRecommend: boolean;
  tags: FeedbackTag[];
  comment?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    serviceReportId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceReport",
      required: true,
      unique: true,
      index: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    reportNumber: { type: String, required: true, trim: true, maxlength: 80, index: true },
    projectCode: { type: String, required: true, trim: true, maxlength: 80, index: true },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true },
    technicianName: { type: String, required: true, trim: true, maxlength: 100 },
    companyName: { type: String, trim: true, maxlength: 150 },
    branchName: { type: String, trim: true, maxlength: 150 },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    wouldRecommend: { type: Boolean, required: true },
    tags: {
      type: [{ type: String, enum: Object.values(FeedbackTag) }],
      default: [],
      validate: {
        validator: (values: FeedbackTag[]) => values.length <= 6,
        message: "Choose up to 6 feedback tags",
      },
    },
    comment: { type: String, trim: true, maxlength: 1500 },
    submittedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

feedbackSchema.index({ companyId: 1, branchId: 1, submittedAt: -1 });
feedbackSchema.index({ companyId: 1, technicianId: 1, submittedAt: -1 });
feedbackSchema.index({ companyId: 1, rating: 1, submittedAt: -1 });

export const Feedback = model<IFeedback>("Feedback", feedbackSchema);
