import { Document, Schema, Types, model } from "mongoose";

export enum NotificationAlertKind {
  SERVICE_DUE = "service_due",
  INVOICE_OVERDUE = "invoice_overdue",
  AMC_RENEWAL = "amc_renewal",
  LEAD_FOLLOW_UP = "lead_follow_up",
  COMPLAINT_SLA = "complaint_sla",
  SYSTEM = "system",
}

export enum NotificationSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export interface INotificationAlert extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  kind: NotificationAlertKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: Types.ObjectId;
  href?: string;
  customerPhone?: string;
  dedupeKey: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<INotificationAlert>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    kind: { type: String, enum: Object.values(NotificationAlertKind), required: true, index: true },
    severity: { type: String, enum: Object.values(NotificationSeverity), default: NotificationSeverity.INFO, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    relatedType: { type: String, trim: true, maxlength: 100, index: true },
    relatedId: { type: Schema.Types.ObjectId, index: true },
    href: { type: String, trim: true, maxlength: 500 },
    customerPhone: { type: String, trim: true, maxlength: 20 },
    dedupeKey: { type: String, required: true, unique: true, index: true, maxlength: 300 },
    readAt: { type: Date, index: true },
  },
  { timestamps: true },
);

schema.index({ companyId: 1, branchId: 1, readAt: 1, createdAt: -1 });
schema.index({ companyId: 1, branchId: 1, severity: 1, createdAt: -1 });

export const NotificationAlert = model<INotificationAlert>("NotificationAlert", schema);
