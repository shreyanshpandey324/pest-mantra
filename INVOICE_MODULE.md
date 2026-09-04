# Pest Mantra — Invoice & Payment System

## Implemented
- Project-linked invoice creation with customer/site snapshot from the real Project.
- Accepted quotation pricing can be reused when the quotation was converted into that project.
- Unique invoice numbering (`PM-I-YYYY-00001`).
- Line items, discount, GST/tax, additional charges and server-recalculated totals.
- Invoice states: Draft, Issued, Partially Paid, Paid, Overdue, Void.
- Payment ledger supporting Cash, UPI, Card, Bank Transfer, Cheque and Other.
- Partial payments and automatic balance/status calculation.
- Overpayment protection and paid-invoice protection.
- Company/branch tenant isolation and existing Super Admin/Office Admin authorization.
- Premium Admin invoices dashboard with billed/collected/outstanding/overdue KPIs.
- Search, status filter, invoice detail, payment history and collection progress.
- Printable A4-friendly invoice via browser Print / Save PDF.
- Sidebar integration.

## Business rules
- One invoice per project to prevent accidental duplicate billing.
- Draft invoices can be edited/deleted; only issued invoices can receive payments.
- Paid/partially-paid invoices cannot be voided.
- Due invoices automatically surface as Overdue on backend reads.
- Monetary totals are recalculated on the backend; browser totals are preview only.

## Recommended next commercial modules
AMC/recurring contracts, customer portal, digital signatures, QR service reports and automated payment reminders.
