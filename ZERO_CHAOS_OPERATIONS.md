# Zero-Chaos Operations Upgrade

This build focuses on reducing daily coordination overhead between the office and field technicians.

## Admin Exception Inbox
`/dashboard/exception-inbox`

Automatically surfaces operational exceptions instead of forcing admins to monitor every module:
- unassigned jobs
- overdue jobs
- jobs assigned to off-duty technicians
- technician failed visits
- technician reschedule requests
- active jobs with no movement for 2+ hours
- overdue invoices
- complaint SLA breaches
- due/overdue service reminders

Off-duty/failed-visit jobs can be handed over directly to an active technician from the inbox.

## Technician One-Screen Field Workflow
The existing job detail flow remains the single operational screen and now includes:
- call / navigation context
- journey -> arrival -> before photo -> treatment -> after photo -> signed report -> completion
- service quality gate
- offline draft protection
- one-tap Reschedule request
- one-tap Failed Visit with standard reasons

Field exceptions appear in the Admin Exception Inbox so technicians do not need repeated coordination calls.

## Next Best Job
Technician home highlights one recommended next job using current priority and schedule data, with immediate Open / Call / Navigate actions.

## Smart Handover
Admin Exception Inbox detects jobs owned by off-duty technicians and failed visits. Admin can hand the job to another active technician without recreating the job.

## Failed Visit reasons
- Customer unavailable
- Site locked
- Wrong address
- Material unavailable
- Safety risk
- Other

The failed visit automatically creates an office-visible reschedule/exception signal.

## End-of-Day Summary
`GET /api/v1/operations/end-of-day`

Provides daily assigned/completed/active/cancelled/failed/reschedule/collection counts. Technician home displays the live daily summary.

## Existing no-retyping automation preserved
The project already finalizes the signed service report and creates the next-service reminder from the same technician completion workflow. Chemical usage, proof photos and customer sign-off remain part of the same job record.

## Production note
This build preserves the real MongoDB/JWT authentication architecture. It does not replace real external communication providers with fake success responses.
