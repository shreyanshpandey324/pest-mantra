export type ServiceReportStatus = "draft" | "finalized";

export interface ServiceReportPhoto {
  _id: string;
  photoType: "before" | "after";
  fileUrl: string;
  uploadedAt: string;
}

export interface ServiceReportChemicalUsage {
  chemicalId?: string;
  chemicalName: string;
  unit: "litre" | "kg" | "piece" | "ml" | "gram";
  quantityUsed: number;
  loggedAt: string;
}

export interface ServiceReport {
  _id: string;
  projectId: string;
  projectCode: string;
  reportNumber: string;
  verificationCode: string;
  status: ServiceReportStatus;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: string;
  technicianName: string;
  technicianPhone?: string;
  companyName?: string;
  branchName?: string;
  treatmentSummary: string;
  observations?: string;
  recommendations?: string;
  nextServiceDate?: string;
  customerSignedBy: string;
  customerSignatureDataUrl: string;
  customerSignedAt: string;
  chemicalUsage: ServiceReportChemicalUsage[];
  proofLatitude?: number;
  proofLongitude?: number;
  proofAccuracy?: number;
  proofRecordedAt?: string;
  proofDistanceFromSiteMeters?: number;
  paymentMethod?: string;
  completedAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReportPayload {
  report: ServiceReport;
  photos: ServiceReportPhoto[];
}

export interface ServiceReportVerification {
  verified: true;
  reportNumber: string;
  verificationCode: string;
  projectCode: string;
  serviceType: string;
  technicianName: string;
  companyName?: string;
  branchName?: string;
  completedAt?: string;
  finalizedAt?: string;
  gpsVerified?: boolean;
  proofAccuracy?: number;
  proofRecordedAt?: string;
  proofDistanceFromSiteMeters?: number;
  siteProximityVerified?: boolean;
}

export interface ServiceReportSummary {
  _id: string;
  projectId: string;
  projectCode: string;
  reportNumber: string;
  verificationCode: string;
  status: ServiceReportStatus;
  customerName: string;
  serviceType: string;
  technicianName: string;
  companyName?: string;
  branchName?: string;
  paymentMethod?: string;
  completedAt?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}
