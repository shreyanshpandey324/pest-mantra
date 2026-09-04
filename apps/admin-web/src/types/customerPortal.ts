export interface CustomerPortalAccessStatus {
  enabled: boolean;
  customerName: string;
  customerPhone: string;
  accessCode?: string;
  codeHint?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface CustomerPortalProject {
  id: string;
  projectCode: string;
  address: string;
  serviceType: string;
  status: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  completedAt?: string;
  technicianName?: string;
  createdAt: string;
}

export interface CustomerPortalQuotation {
  id: string;
  quotationNumber: string;
  serviceType: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  isExpired: boolean;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  additionalCharges: number;
  grandTotal: number;
  validUntil: string;
  convertedProjectId?: string;
  createdAt: string;
}

export interface CustomerPortalInvoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  quotationId?: string;
  serviceType: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  status: string;
  issuedAt?: string;
  paidAt?: string;
  payments: Array<{ amount: number; method: string; paidAt: string }>;
  createdAt: string;
}

export interface CustomerPortalContract {
  id: string;
  contractNumber: string;
  serviceType: string;
  frequency: string;
  startDate: string;
  endDate: string;
  contractValue: number;
  includedVisits: number;
  status: string;
  visits: Array<{ id?: string; dueDate: string; status: string; projectId?: string; completedAt?: string }>;
  nextVisitDate?: string;
  terms?: string;
  createdAt: string;
}

export interface CustomerPortalReminder {
  id: string;
  sourceProjectId: string;
  nextProjectId?: string;
  serviceType: string;
  dueDate: string;
  customerReadAt?: string;
  notes?: string;
  timing: "scheduled" | "upcoming" | "due_soon" | "due_today" | "overdue";
  daysUntil: number;
  createdAt: string;
}

export interface CustomerPortalReport {
  id: string;
  projectId: string;
  projectCode: string;
  reportNumber: string;
  verificationCode: string;
  serviceType: string;
  technicianName: string;
  completedAt?: string;
  feedbackSubmitted: boolean;
  feedbackRating?: number;
}


export interface CustomerPortalComplaint {
  id: string;
  complaintNumber: string;
  projectId?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  slaDueAt: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPortalDashboardData {
  customer: {
    name: string;
    phone: string;
    companyName: string;
    branchName?: string;
    addresses: string[];
  };
  metrics: {
    activeJobs: number;
    totalJobs: number;
    outstandingAmount: number;
    activeContracts: number;
    serviceReports: number;
    nextVisit?: { contractNumber: string; serviceType: string; dueDate: string };
    nextServiceReminder?: { serviceType: string; dueDate: string; timing: string };
    unreadServiceReminders: number;
  };
  projects: CustomerPortalProject[];
  quotations: CustomerPortalQuotation[];
  invoices: CustomerPortalInvoice[];
  contracts: CustomerPortalContract[];
  reports: CustomerPortalReport[];
  reminders: CustomerPortalReminder[];
  complaints: CustomerPortalComplaint[];
}
