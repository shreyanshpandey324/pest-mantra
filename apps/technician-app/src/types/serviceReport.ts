export type ServiceReportStatus = "draft" | "finalized";

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
  paymentMethod?: string;
  completedAt?: string;
  finalizedAt?: string;
}
