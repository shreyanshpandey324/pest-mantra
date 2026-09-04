import { Document, Schema, Types, model } from "mongoose";
import { UserRole } from "./User";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: UserRole;
  method: string;
  path: string;
  action: string;
  entityType?: string;
  entityId?: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: { type: String, enum: Object.values(UserRole), required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true, maxlength: 500 },
    action: { type: String, required: true, maxlength: 200 },
    entityType: { type: String, trim: true, maxlength: 100, index: true },
    entityId: { type: String, trim: true, maxlength: 100, index: true },
    statusCode: { type: Number, required: true },
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ companyId: 1, branchId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
