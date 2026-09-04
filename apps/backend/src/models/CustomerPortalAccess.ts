import { Document, Schema, Types, model } from "mongoose";

export interface ICustomerPortalAccess extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  accessCodeHash: string;
  codeHint: string;
  isActive: boolean;
  sessionVersion: number;
  expiresAt: Date;
  lastUsedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICustomerPortalAccess>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    customerPhone: { type: String, required: true, trim: true, index: true },
    accessCodeHash: { type: String, required: true, select: false },
    codeHint: { type: String, required: true, trim: true, maxlength: 4 },
    isActive: { type: Boolean, default: true, index: true },
    sessionVersion: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, index: true },
    lastUsedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

schema.index({ companyId: 1, branchId: 1, customerPhone: 1 }, { unique: true });
schema.index({ customerPhone: 1, isActive: 1, expiresAt: 1 });

export const CustomerPortalAccess = model<ICustomerPortalAccess>("CustomerPortalAccess", schema);
