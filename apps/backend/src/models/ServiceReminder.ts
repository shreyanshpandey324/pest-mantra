import { Schema, model, Document, Types } from "mongoose";
import { ServiceType } from "./Project";

export enum ServiceReminderStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IServiceReminder extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  sourceReportId: Types.ObjectId;
  sourceProjectId: Types.ObjectId;
  nextProjectId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: ServiceType;
  dueDate: Date;
  status: ServiceReminderStatus;
  adminReadAt?: Date;
  customerReadAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IServiceReminder>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    sourceReportId: { type: Schema.Types.ObjectId, ref: "ServiceReport", required: true, unique: true, index: true },
    sourceProjectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    nextProjectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerPhone: { type: String, required: true, trim: true, maxlength: 20, index: true },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: Object.values(ServiceReminderStatus), default: ServiceReminderStatus.ACTIVE, index: true },
    adminReadAt: Date,
    customerReadAt: Date,
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

schema.index({ companyId: 1, branchId: 1, status: 1, dueDate: 1 });
schema.index({ companyId: 1, branchId: 1, status: 1, adminReadAt: 1, dueDate: 1 });
schema.index({ companyId: 1, branchId: 1, status: 1, serviceType: 1, dueDate: 1 });
schema.index({ companyId: 1, branchId: 1, customerPhone: 1, status: 1, dueDate: 1 });

export const ServiceReminder = model<IServiceReminder>("ServiceReminder", schema);
