import { Document, Schema, Types, model } from "mongoose";

export enum OutboundChannel {
  WHATSAPP = "whatsapp",
  SMS = "sms",
  EMAIL = "email",
}

export enum OutboundStatus {
  QUEUED = "queued",
  WAITING_CONFIGURATION = "waiting_configuration",
  PROCESSING = "processing",
  SENT = "sent",
  FAILED = "failed",
}

export interface IOutboundMessage extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  channel: OutboundChannel;
  recipient: string;
  subject?: string;
  message: string;
  relatedType?: string;
  relatedId?: Types.ObjectId;
  dedupeKey: string;
  status: OutboundStatus;
  provider: string;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOutboundMessage>({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
  channel: { type: String, enum: Object.values(OutboundChannel), required: true, index: true },
  recipient: { type: String, required: true, trim: true, maxlength: 200 },
  subject: { type: String, trim: true, maxlength: 300 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  relatedType: { type: String, trim: true, maxlength: 100, index: true },
  relatedId: { type: Schema.Types.ObjectId, index: true },
  dedupeKey: { type: String, required: true, unique: true, index: true, maxlength: 400 },
  status: { type: String, enum: Object.values(OutboundStatus), default: OutboundStatus.QUEUED, index: true },
  provider: { type: String, default: "disabled", maxlength: 100 },
  attempts: { type: Number, default: 0, min: 0 },
  lastError: { type: String, maxlength: 1000 },
  lastAttemptAt: { type: Date, index: true },
  sentAt: { type: Date, index: true },
}, { timestamps: true });

schema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
export const OutboundMessage = model<IOutboundMessage>("OutboundMessage", schema);
