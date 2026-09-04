# Service Reminder Scaling Pass

This pass changes the admin reminder center so large service volumes are not loaded into the browser at once.

## What changed

- Server-side pagination: 25 / 50 / 100 rows per page.
- Global KPI counts are calculated across all active reminders, independent of the current page.
- Server-side search by customer name, phone, and address.
- Filters for due state, service type, read/unread, and custom date range.
- Sort by nearest due, latest due, or newest reminder.
- Notification bell fetches only a small preview instead of the full reminder set.
- Additional MongoDB indexes support due-date, unread, and service-type queries.
- Legacy service-report backfill is throttled per scope so it is not repeated on every request.
- The previous hard 500-row admin list cap is removed; pagination can cover all matching records.

## Intended scale

A business with 700+ active service reminders can browse the complete dataset without rendering hundreds of cards at once. The API returns one page at a time while dashboard metrics continue to represent the complete active reminder set.
