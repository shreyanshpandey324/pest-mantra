# Pest Mantra — Digital Service Report & Customer Signature

This release adds a signed field-service evidence workflow on top of the existing Project/Technician system. It does not create a second job system.

## Technician workflow

For an in-progress job the Technician App now captures:

- after-treatment evidence photos
- actual chemical usage already supported by the inventory module
- treatment summary
- site observations
- recommendations
- recommended next-service date
- customer / authorized signatory name
- finger/stylus digital signature
- payment method
- explicit customer completion confirmation

The technician completes a job through **Complete & Generate Service Report**. The app first saves the signed report draft and then asks the existing Project status API to complete the job.

The backend is the final authority. Project completion now requires a signed service-report draft in addition to the existing completion requirements. Once the Project is completed, the report is finalized and becomes immutable through the application API.

## Service report record

A ServiceReport stores a tenant-scoped snapshot of the completed visit:

- unique report number
- unique verification code
- project/job code
- company + branch ownership
- customer/site/service snapshot
- assigned technician snapshot
- treatment narrative
- next-service recommendation
- digital signature and signatory timestamp
- before/after photo references
- chemical-usage snapshot
- payment/completion metadata

There is one service report per Project.

## Admin experience

Admin Web now includes a dedicated **Service Reports** workspace with:

- total/finalized/draft/today KPIs
- search by report, job, customer, technician or verification code
- status filter
- service-type filter
- direct report access

Project Details also exposes **View Service Report** whenever one exists.

The report itself is a premium A4 print layout with:

- Pest Mantra branding
- report/job identifiers
- service and customer information
- treatment summary, observations and recommendations
- chemical usage
- before/after evidence
- customer signature
- QR verification
- Print / Save PDF action through the browser print dialog

## QR verification

No QR package or external QR-image service was added. Admin Web contains a self-contained QR encoder, so report verification does not depend on a third-party QR API.

The QR opens:

`/verify/service/<verification-code>`

The public verification endpoint exposes only limited finalized-report metadata. Customer phone, signature, treatment evidence and chemical details are not exposed publicly.

## Authorization / tenant isolation

- Report list: Super Admin + Office Admin, using existing company/branch scope.
- Report drafting/signature capture: Technician role only.
- Report read: authenticated users still pass the existing Project visibility rules.
- Public verification: finalized report metadata only.
- Technician cannot create a report for another technician's Project because Project visibility is enforced by the existing Project service.

## Verification actually run

- Backend TypeScript typecheck: PASS
- Admin Web TypeScript typecheck: PASS
- Technician App TypeScript typecheck: PASS
- Backend TypeScript build: PASS
- QR matrix was decoded successfully with OpenCV during implementation.
- Admin Next.js production build was attempted in the sandbox but could not run because the available node_modules contains Windows native Next/SWC binaries and network access could not download the Linux SWC fallback. It is therefore not claimed as passing.

No real `.env` or `.env.local` secrets are packaged in the final ZIP.
