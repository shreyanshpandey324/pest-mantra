import { Schema, model, Document, Types } from "mongoose";
import { ServiceType } from "./Project";
import { CUSTOMER_PHONE_REGEX } from "../utils/constants";

export enum ContractFrequency {
  MONTHLY = "monthly",
  BIMONTHLY = "bimonthly",
  QUARTERLY = "quarterly",
  HALF_YEARLY = "half_yearly",
  ANNUAL = "annual",
  CUSTOM = "custom",
}

export enum ContractStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum ContractVisitStatus {
  UPCOMING = "upcoming",
  PROJECT_CREATED = "project_created",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

export interface IContractVisit {
  _id?: Types.ObjectId;
  dueDate: Date;
  status: ContractVisitStatus;
  projectId?: Types.ObjectId;
  completedAt?: Date;
}

export interface IServiceContract extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address: string;
  serviceType: ServiceType;
  frequency: ContractFrequency;
  customIntervalDays?: number;
  startDate: Date;
  endDate: Date;
  contractValue: number;
  includedVisits: number;
  status: ContractStatus;
  notes?: string;
  terms?: string;
  visits: IContractVisit[];
  renewedFrom?: Types.ObjectId;
  renewedTo?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visitSchema = new Schema<IContractVisit>(
  {
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(ContractVisitStatus),
      default: ContractVisitStatus.UPCOMING,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    completedAt: Date,
  },
  { _id: true },
);

const schema = new Schema<IServiceContract>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    contractNumber: { type: String, required: true, unique: true, index: true },
    customerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: (v: string) => CUSTOMER_PHONE_REGEX.test(v), message: "Invalid phone" },
    },
    customerEmail: { type: String, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true },
    frequency: {
      type: String,
      enum: Object.values(ContractFrequency),
      required: true,
    },
    customIntervalDays: { type: Number, min: 1, max: 365 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    contractValue: { type: Number, required: true, min: 0 },
    includedVisits: { type: Number, required: true, min: 1, max: 100 },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.ACTIVE,
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    terms: { type: String, trim: true, maxlength: 5000 },
    visits: { type: [visitSchema], default: [] },
    renewedFrom: { type: Schema.Types.ObjectId, ref: "ServiceContract", index: true },
    renewedTo: { type: Schema.Types.ObjectId, ref: "ServiceContract" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

schema.index({ companyId: 1, branchId: 1, status: 1, endDate: 1 });
// A contract can be the source of at most one renewal. Sparse allows normal
// contracts without renewedFrom to coexist freely.
schema.index({ renewedFrom: 1 }, { unique: true, sparse: true });

export const ServiceContract = model<IServiceContract>("ServiceContract", schema);
