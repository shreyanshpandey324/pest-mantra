export type NotificationAlertKind = "service_due" | "invoice_overdue" | "amc_renewal" | "lead_follow_up" | "complaint_sla" | "system";
export type NotificationSeverity = "info" | "warning" | "critical";
export interface NotificationAlert { _id: string; kind: NotificationAlertKind; severity: NotificationSeverity; title: string; message: string; relatedType?: string; relatedId?: string; href?: string; customerPhone?: string; readAt?: string; createdAt: string; }
export interface NotificationAlertListResponse { alerts: NotificationAlert[]; unread: number; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export const NOTIFICATION_KIND_LABELS: Record<NotificationAlertKind,string> = { service_due:"Service due", invoice_overdue:"Invoice overdue", amc_renewal:"AMC renewal", lead_follow_up:"Lead follow-up", complaint_sla:"Complaint SLA", system:"System" };
