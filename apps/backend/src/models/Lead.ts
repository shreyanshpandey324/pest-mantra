import { Document, Schema, Types, model } from "mongoose";
import { ServiceType } from "./Project";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  FOLLOW_UP = "follow_up",
  QUALIFIED = "qualified",
  QUOTATION_SENT = "quotation_sent",
  WON = "won",
  LOST = "lost",
}

export enum LeadPriority {
  HOT = "hot",
  WARM = "warm",
  COLD = "cold",
}

export enum LeadSource {
  CALL = "call",
  WEBSITE = "website",
  REFERRAL = "referral",
  WHATSAPP = "whatsapp",
  WALK_IN = "walk_in",
  GOOGLE = "google",
  SOCIAL = "social",
  OTHER = "other",
}

export enum LeadActivityType {
  NOTE = "note",
  CALL = "call",
  FOLLOW_UP = "follow_up",
  SITE_VISIT = "site_visit",
  STATUS_CHANGE = "status_change",
  QUOTATION = "quotation",
}

export interface ILeadActivity {
  _id?: Types.ObjectId;
  type: LeadActivityType;
  note: string;
  actorId: Types.ObjectId;
  fromStatus?: LeadStatus;
  toStatus?: LeadStatus;
  scheduledFor?: Date;
  createdAt: Date;
}

export interface ILead extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  leadNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  serviceType: ServiceType;
  source: LeadSource;
  sourceDetail?: string;
  priority: LeadPriority;
  status: LeadStatus;
  assignedTo: Types.ObjectId;
  followUpAt?: Date;
  siteVisitAt?: Date;
  notes?: string;
  lostReason?: string;
  quotationId?: Types.ObjectId;
  wonAt?: Date;
  lostAt?: Date;
  activities: ILeadActivity[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<ILeadActivity>(
  {
    type: { type: String, enum: Object.values(LeadActivityType), required: true },
    note: { type: String, required: true, trim: true, maxlength: 1000 },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromStatus: { type: String, enum: Object.values(LeadStatus) },
    toStatus: { type: String, enum: Object.values(LeadStatus) },
    scheduledFor: Date,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const leadSchema = new Schema<ILead>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    leadNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      validate: { validator: (value: string) => CUSTOMER_PHONE_REGEX.test(value), message: "Invalid phone" },
    },
    customerEmail: { type: String, trim: true, lowercase: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100 },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true, index: true },
    source: { type: String, enum: Object.values(LeadSource), required: true, index: true },
    sourceDetail: { type: String, trim: true, maxlength: 200 },
    priority: { type: String, enum: Object.values(LeadPriority), default: LeadPriority.WARM, index: true },
    status: { type: String, enum: Object.values(LeadStatus), default: LeadStatus.NEW, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    followUpAt: { type: Date, index: true },
    siteVisitAt: Date,
    notes: { type: String, trim: true, maxlength: 2000 },
    lostReason: { type: String, trim: true, maxlength: 1000 },
    quotationId: { type: Schema.Types.ObjectId, ref: "Quotation", index: true },
    wonAt: Date,
    lostAt: Date,
    activities: { type: [activitySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

leadSchema.index({ companyId: 1, branchId: 1, status: 1, updatedAt: -1 });
leadSchema.index({ companyId: 1, branchId: 1, assignedTo: 1, status: 1 });
leadSchema.index({ companyId: 1, branchId: 1, followUpAt: 1, status: 1 });
leadSchema.index({ companyId: 1, branchId: 1, customerPhone: 1, createdAt: -1 });

export const Lead = model<ILead>("Lead", leadSchema);
