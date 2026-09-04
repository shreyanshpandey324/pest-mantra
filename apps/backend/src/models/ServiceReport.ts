import { Schema, model, Document, Types } from "mongoose";
import { PaymentMethod, ServiceType } from "./Project";
import { ChemicalUnit } from "./Chemical";

export enum ServiceReportStatus {
  DRAFT = "draft",
  FINALIZED = "finalized",
}

export interface IServiceReportChemicalUsage {
  chemicalId?: Types.ObjectId;
  chemicalName: string;
  unit: ChemicalUnit;
  quantityUsed: number;
  loggedAt: Date;
}

export interface IServiceReport extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  projectId: Types.ObjectId;
  projectCode: string;
  reportNumber: string;
  verificationCode: string;
  status: ServiceReportStatus;

  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: ServiceType;

  technicianId?: Types.ObjectId;
  technicianName: string;
  technicianPhone?: string;
  companyName?: string;
  branchName?: string;

  treatmentSummary: string;
  observations?: string;
  recommendations?: string;
  nextServiceDate?: Date;

  customerSignedBy: string;
  customerSignatureDataUrl: string;
  customerSignedAt: Date;

  beforePhotoIds: Types.ObjectId[];
  afterPhotoIds: Types.ObjectId[];
  chemicalUsage: IServiceReportChemicalUsage[];

  proofLatitude?: number;
  proofLongitude?: number;
  proofAccuracy?: number;
  proofRecordedAt?: Date;
  proofDistanceFromSiteMeters?: number;

  paymentMethod?: PaymentMethod;
  completedAt?: Date;
  finalizedAt?: Date;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chemicalUsageSchema = new Schema<IServiceReportChemicalUsage>(
  {
    chemicalId: { type: Schema.Types.ObjectId, ref: "Chemical" },
    chemicalName: { type: String, required: true, trim: true, maxlength: 120 },
    unit: { type: String, enum: Object.values(ChemicalUnit), required: true },
    quantityUsed: { type: Number, required: true, min: 0 },
    loggedAt: { type: Date, required: true },
  },
  { _id: false }
);

const serviceReportSchema = new Schema<IServiceReport>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true, index: true },
    projectCode: { type: String, required: true, trim: true, maxlength: 80, index: true },
    reportNumber: { type: String, required: true, unique: true, trim: true, index: true },
    verificationCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    status: { type: String, enum: Object.values(ServiceReportStatus), default: ServiceReportStatus.DRAFT, index: true },

    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerPhone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true },

    technicianId: { type: Schema.Types.ObjectId, ref: "User" },
    technicianName: { type: String, required: true, trim: true, maxlength: 100 },
    technicianPhone: { type: String, trim: true, maxlength: 20 },
    companyName: { type: String, trim: true, maxlength: 150 },
    branchName: { type: String, trim: true, maxlength: 150 },

    treatmentSummary: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    observations: { type: String, trim: true, maxlength: 2000 },
    recommendations: { type: String, trim: true, maxlength: 2000 },
    nextServiceDate: { type: Date },

    customerSignedBy: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    customerSignatureDataUrl: { type: String, required: true, maxlength: 350000, select: true },
    customerSignedAt: { type: Date, required: true },

    beforePhotoIds: [{ type: Schema.Types.ObjectId, ref: "ProjectPhoto" }],
    afterPhotoIds: [{ type: Schema.Types.ObjectId, ref: "ProjectPhoto" }],
    chemicalUsage: { type: [chemicalUsageSchema], default: [] },

    proofLatitude: { type: Number, min: -90, max: 90 },
    proofLongitude: { type: Number, min: -180, max: 180 },
    proofAccuracy: { type: Number, min: 0 },
    proofRecordedAt: { type: Date },
    proofDistanceFromSiteMeters: { type: Number, min: 0 },

    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    completedAt: { type: Date },
    finalizedAt: { type: Date },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

serviceReportSchema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
serviceReportSchema.index({ companyId: 1, projectId: 1 }, { unique: true });

export const ServiceReport = model<IServiceReport>("ServiceReport", serviceReportSchema);
