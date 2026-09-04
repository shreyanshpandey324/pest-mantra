import { Schema, model, Document, Types } from "mongoose";

export enum SubscriptionPlan {
  STARTER = "starter",
  GROWTH = "growth",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  TRIAL = "trial",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  SUSPENDED = "suspended",
}

export enum CompanyStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  MORE_INFORMATION_REQUIRED = "more_information_required",
  SUSPENDED = "suspended",
}

export interface ICompany extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  status: CompanyStatus;
  isActive: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  billingCurrency: string;
  timezone: string;
  countryCode: string;
  locale: string;
  taxLabel: string;
  defaultTaxRate: number;
  distanceUnit: "km" | "mi";
  dateFormat: string;
  limits: { technicians: number; branches: number };
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    status: {
      type: String,
      enum: Object.values(CompanyStatus),
      default: CompanyStatus.PENDING,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    subscriptionPlan: { type: String, enum: Object.values(SubscriptionPlan), default: SubscriptionPlan.STARTER, index: true },
    subscriptionStatus: { type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.TRIAL, index: true },
    trialEndsAt: { type: Date, index: true },
    subscriptionEndsAt: { type: Date, index: true },
    billingCurrency: { type: String, default: "INR", trim: true, uppercase: true, maxlength: 3 },
    timezone: { type: String, default: "Asia/Kolkata", trim: true, maxlength: 100 },
    countryCode: { type: String, default: "IN", trim: true, uppercase: true, minlength: 2, maxlength: 2 },
    locale: { type: String, default: "en-IN", trim: true, maxlength: 20 },
    taxLabel: { type: String, default: "GST", trim: true, maxlength: 30 },
    defaultTaxRate: { type: Number, default: 18, min: 0, max: 100 },
    distanceUnit: { type: String, enum: ["km", "mi"], default: "km" },
    dateFormat: { type: String, default: "DD/MM/YYYY", trim: true, maxlength: 30 },
    limits: {
      technicians: { type: Number, default: 5, min: 1 },
      branches: { type: Number, default: 1, min: 1 },
    },

    approvedAt: {
      type: Date,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ name: 1 });
companySchema.index({ status: 1, isActive: 1 });
companySchema.index({ subscriptionStatus: 1, trialEndsAt: 1 });

export const Company = model<ICompany>("Company", companySchema);