import { Document, Schema, Types, model } from "mongoose";

export enum CustomerType {
  RESIDENTIAL = "residential",
  COMMERCIAL = "commercial",
  ENTERPRISE = "enterprise",
}

export enum CustomerStatus {
  ACTIVE = "active",
  WATCH = "watch",
  INACTIVE = "inactive",
}

export interface ICustomerSite {
  _id?: Types.ObjectId;
  siteCode: string;
  label: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
  contactName?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
}

export interface ICustomerAccount extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  customerType: CustomerType;
  status: CustomerStatus;
  tags: string[];
  taxId?: string;
  preferredLanguage: string;
  notes?: string;
  sites: ICustomerSite[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ICustomerSite>({
  siteCode: { type: String, required: true, trim: true, maxlength: 40 },
  label: { type: String, required: true, trim: true, maxlength: 100 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  city: { type: String, trim: true, maxlength: 100 },
  state: { type: String, trim: true, maxlength: 100 },
  postalCode: { type: String, trim: true, maxlength: 30 },
  countryCode: { type: String, default: "IN", trim: true, uppercase: true, minlength: 2, maxlength: 2 },
  contactName: { type: String, trim: true, maxlength: 100 },
  contactPhone: { type: String, trim: true, maxlength: 25 },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  isPrimary: { type: Boolean, default: false },
}, { _id: true });

const schema = new Schema<ICustomerAccount>({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
  customerCode: { type: String, required: true, trim: true, maxlength: 60 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
  phone: { type: String, required: true, trim: true, minlength: 8, maxlength: 25 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200 },
  customerType: { type: String, enum: Object.values(CustomerType), default: CustomerType.RESIDENTIAL, index: true },
  status: { type: String, enum: Object.values(CustomerStatus), default: CustomerStatus.ACTIVE, index: true },
  tags: { type: [String], default: [] },
  taxId: { type: String, trim: true, maxlength: 100 },
  preferredLanguage: { type: String, default: "en", trim: true, maxlength: 12 },
  notes: { type: String, trim: true, maxlength: 2500 },
  sites: { type: [siteSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true });

schema.index({ companyId: 1, branchId: 1, customerCode: 1 }, { unique: true });
schema.index({ companyId: 1, branchId: 1, phone: 1 });
schema.index({ companyId: 1, branchId: 1, name: 1 });
schema.index({ companyId: 1, branchId: 1, tags: 1 });

export const CustomerAccount = model<ICustomerAccount>("CustomerAccount", schema);
