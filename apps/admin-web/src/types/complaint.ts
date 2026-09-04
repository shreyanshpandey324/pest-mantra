export type ComplaintCategory = "service_quality" | "technician_behavior" | "delay" | "billing" | "chemical" | "revisit" | "other";
export type ComplaintPriority = "low" | "medium" | "high" | "critical";
export type ComplaintStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed" | "reopened";
export interface ComplaintActivity { _id?: string; type: string; note: string; actorId?: string; actorName?: string; createdAt: string; }
export interface Complaint {
  _id: string; companyId: string; branchId: string; complaintNumber: string; projectId?: string; customerName: string; customerPhone: string;
  subject: string; description: string; category: ComplaintCategory; priority: ComplaintPriority; status: ComplaintStatus; assignedTo?: string; assignedToName?: string;
  slaDueAt: string; isOverdue: boolean; resolution?: string; resolvedAt?: string; closedAt?: string; createdBy?: string; source?: "admin" | "customer_portal"; activities: ComplaintActivity[]; createdAt: string; updatedAt: string;
}
export interface ComplaintListResponse { complaints: Complaint[]; metrics: { total: number; open: number; overdue: number; critical: number; resolved: number }; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus,string> = { open:"Open", in_progress:"In progress", waiting_customer:"Waiting customer", resolved:"Resolved", closed:"Closed", reopened:"Reopened" };
export const COMPLAINT_PRIORITY_LABELS: Record<ComplaintPriority,string> = { low:"Low", medium:"Medium", high:"High", critical:"Critical" };
export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory,string> = { service_quality:"Service quality", technician_behavior:"Technician behaviour", delay:"Delay / no-show", billing:"Billing / payment", chemical:"Chemical / treatment", revisit:"Revisit required", other:"Other" };
