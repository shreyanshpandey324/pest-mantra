import { Schema, model, Document, Types } from "mongoose";

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

export const Company = model<ICompany>("Company", companySchema);