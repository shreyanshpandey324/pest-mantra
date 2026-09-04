import { Document, Schema, Types, model } from "mongoose";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

export enum ComplaintCategory {
  SERVICE_QUALITY = "service_quality",
  TECHNICIAN_BEHAVIOR = "technician_behavior",
  DELAY = "delay",
  BILLING = "billing",
  CHEMICAL = "chemical",
  REVISIT = "revisit",
  OTHER = "other",
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ComplaintStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  WAITING_CUSTOMER = "waiting_customer",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REOPENED = "reopened",
}

export enum ComplaintActivityType {
  CREATED = "created",
  COMMENT = "comment",
  STATUS = "status",
  ASSIGNMENT = "assignment",
  PRIORITY = "priority",
  RESOLUTION = "resolution",
}

export interface IComplaintActivity {
  _id?: Types.ObjectId;
  type: ComplaintActivityType;
  note: string;
  actorId?: Types.ObjectId;
  actorName?: string;
  createdAt: Date;
}

export interface IComplaint extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  complaintNumber: string;
  projectId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  subject: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: Types.ObjectId;
  slaDueAt: Date;
  resolution?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  createdBy?: Types.ObjectId;
  source: "admin" | "customer_portal";
  activities: IComplaintActivity[];
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IComplaintActivity>(
  {
    type: { type: String, enum: Object.values(ComplaintActivityType), required: true },
    note: { type: String, required: true, trim: true, maxlength: 1500 },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, trim: true, maxlength: 100 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const complaintSchema = new Schema<IComplaint>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    complaintNumber: { type: String, required: true, unique: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      validate: { validator: (value: string) => CUSTOMER_PHONE_REGEX.test(value), message: "Invalid phone" },
    },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 3, maxlength: 3000 },
    category: { type: String, enum: Object.values(ComplaintCategory), required: true, index: true },
    priority: { type: String, enum: Object.values(ComplaintPriority), default: ComplaintPriority.MEDIUM, index: true },
    status: { type: String, enum: Object.values(ComplaintStatus), default: ComplaintStatus.OPEN, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    slaDueAt: { type: Date, required: true, index: true },
    resolution: { type: String, trim: true, maxlength: 3000 },
    resolvedAt: Date,
    closedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    source: { type: String, enum: ["admin", "customer_portal"], default: "admin", index: true },
    activities: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

complaintSchema.index({ companyId: 1, branchId: 1, status: 1, priority: 1, updatedAt: -1 });
complaintSchema.index({ companyId: 1, branchId: 1, slaDueAt: 1, status: 1 });
complaintSchema.index({ companyId: 1, branchId: 1, customerPhone: 1, createdAt: -1 });

export const Complaint = model<IComplaint>("Complaint", complaintSchema);
