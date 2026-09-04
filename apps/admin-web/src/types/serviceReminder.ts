export type ServiceReminderTiming = "scheduled" | "upcoming" | "due_soon" | "due_today" | "overdue";
export type ServiceReminderStatus = "active" | "completed" | "cancelled";

export interface ServiceReminder {
  id: string;
  companyId?: string;
  branchId?: string;
  sourceReportId: string;
  sourceProjectId: string;
  nextProjectId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  serviceType: string;
  dueDate: string;
  status: ServiceReminderStatus;
  adminReadAt?: string;
  customerReadAt?: string;
  notes?: string;
  timing: ServiceReminderTiming;
  daysUntil: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReminderMetrics {
  total: number;
  unread: number;
  overdue: number;
  dueToday: number;
  next7Days: number;
}

export interface ServiceReminderPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ServiceReminderListResponse {
  reminders: ServiceReminder[];
  metrics: ServiceReminderMetrics;
  pagination: ServiceReminderPagination;
}
