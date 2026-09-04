# Lead CRM / Sales Pipeline

The Lead CRM is integrated into the existing Pest Mantra Admin Web and backend. It uses real MongoDB persistence and the existing JWT, role, company and branch security model.

## Sales flow

`New Enquiry → Contacted / Follow-up → Qualified → Quotation Sent → Won / Lost`

A qualified/open lead can launch the existing Quotation workflow with customer, site, service, company and branch details prefilled. The quotation is linked back to the lead. When a linked quotation is sent, accepted or rejected, the CRM status is synchronized automatically.

## Admin features

- Premium horizontal Kanban-style pipeline
- Lead KPIs: open, hot, due/overdue follow-ups, won and conversion rate
- Lead-source breakdown
- Search, source, priority, service and overdue filters
- Customer/site/service capture
- Hot / Warm / Cold priority
- Admin ownership and reassignment
- Follow-up and site-visit scheduling
- Activity timeline: notes, calls, follow-ups, site visits, status and quotation events
- Lost-reason capture
- Lead detail editing
- Lead → Quotation prefill and linking
- Protected delete rules for won or quotation-linked leads

## Backend

Routes are under `/api/v1/leads` and are restricted to Super Admin and Office Admin roles. Office Admin data remains company + branch scoped. Super Admin lead creation requires an explicit company and branch so each lead has a real tenant owner.

## Quotation integration

`Quotation.leadId` is optional. Existing quotations continue to work unchanged. Lead-linked quotations synchronize CRM outcomes:

- quotation `sent` → lead `quotation_sent`
- quotation `accepted` → lead `won`
- quotation `rejected` → lead `lost`

No mock lead records are created.
