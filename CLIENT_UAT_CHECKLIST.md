# Pest Mantra Client UAT Checklist

Use dedicated test records. Do not test destructive actions against real customer data.

Record each result as **Pass**, **Fail** or **Not enabled**, with evidence and notes.

## Environment

- [ ] Admin URL opens over HTTPS.
- [ ] Technician URL opens over HTTPS on a phone-sized screen.
- [ ] API `/health` and `/ready` return HTTP 200.
- [ ] Browser console has no repeated application errors.
- [ ] Correct production company/branch is shown.

## Authentication and permissions

- [ ] Super Admin mobile + password login works.
- [ ] Wrong password is rejected without revealing account details.
- [ ] Office Admin login and assigned branch scope work.
- [ ] Technician cannot enter the Admin dashboard.
- [ ] Admin cannot enter Technician job pages.
- [ ] Logout removes the session; refresh does not restore it.
- [ ] Password change/reset and subsequent re-login work.
- [ ] Technician OTP works, or is explicitly recorded as Not enabled.

## Sales and customer flow

- [ ] Create and edit a customer.
- [ ] Add a second site to a multi-site customer.
- [ ] Create a lead and follow-up activity.
- [ ] Convert lead progress through expected statuses.
- [ ] Create a quotation with correct totals.
- [ ] Accept/reject quotation through the intended workflow.
- [ ] Convert an accepted quotation into a project/job.

## Operations and technician flow

- [ ] Create a project/job with date, slot and service details.
- [ ] Assign Normal, Medium and High priority jobs.
- [ ] Technician sees and acknowledges the assignment.
- [ ] Start duty and update location with permission granted.
- [ ] Next Job, Call and Navigate actions behave correctly.
- [ ] Start job, record chemical usage and complete required fields.
- [ ] Upload before/after photos and reopen them after a redeploy test.
- [ ] Capture customer signature.
- [ ] Submit service report and verify its Admin/public view.
- [ ] Failed Visit and Reschedule requests appear in Admin exceptions.
- [ ] End-of-Day summary completes successfully.

## Finance, AMC and service quality

- [ ] Create invoice from the intended record.
- [ ] Record partial payment; balance and status update correctly.
- [ ] Record final payment; balance becomes zero.
- [ ] Create expense with receipt and approval status.
- [ ] Profitability totals match the test records.
- [ ] Create AMC/service contract and scheduled visits.
- [ ] Renewal and service reminders appear at the expected dates.
- [ ] Create complaint from Admin and Customer Portal.
- [ ] Complaint priority, SLA, owner, comments and resolution work.
- [ ] Add/restock/issue/return inventory chemicals.
- [ ] Feedback link, rating submission and dashboard result work.

## Administration and reliability

- [ ] Notification sweep and read/unread actions work.
- [ ] Approval Center create/approve/reject actions work.
- [ ] Audit log captures a successful mutation without secrets.
- [ ] Exported data opens and matches the filtered records.
- [ ] Hindi/English switch persists after refresh.
- [ ] Mobile layouts remain usable at 360 px width.
- [ ] Refreshing deep links does not produce a 404.
- [ ] Photos and receipts remain accessible after service restart/redeploy.
- [ ] Background scheduler does not create duplicate alerts.

## Integration status

| Integration | Live / Ready / Disabled | Evidence or limitation |
| --- | --- | --- |
| Firebase Phone OTP |  |  |
| Google Maps |  |  |
| WhatsApp/SMS/email delivery |  |  |
| Automatic online payments |  |  |
| Object storage |  |  |

## Sign-off

- Environment/version tested:
- Tester name:
- Test date:
- Failed items accepted for later work:
- Client decision: Accepted / Rejected / Accepted with conditions
- Client approval reference:
