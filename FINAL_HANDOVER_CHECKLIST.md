# Pest Mantra Final Handover Checklist

## Ownership

- [ ] Source repository is private and owned by the customer/company.
- [ ] Render workspace owner is the customer/company.
- [ ] MongoDB Atlas project owner is the customer/company.
- [ ] Domain, DNS, Firebase and provider accounts are customer-owned.
- [ ] Delivery-team access is documented and removable.

## Technical delivery

- [ ] Accepted Git commit/tag is recorded.
- [ ] CI run for that exact commit is green.
- [ ] Production URLs and health endpoints are recorded.
- [ ] `CLIENT_UAT_CHECKLIST.md` is completed and signed off.
- [ ] Database backup/restore procedure is demonstrated.
- [ ] Upload persistence is verified after a redeploy.
- [ ] Rollback procedure is documented and tested where practical.
- [ ] Monitoring/contact process for production incidents is agreed.
- [ ] Dependabot pull requests and CI failures have a named client-side owner.

## Files to deliver

- [ ] Final source ZIP without `.env`, private keys, `node_modules` or build caches.
- [ ] Private Git repository access.
- [ ] `DEPLOYMENT_RUNBOOK.md`.
- [ ] Completed UAT checklist and evidence.
- [ ] Deployment-readiness report.
- [ ] Data backup/export, if the client owns existing production data.
- [ ] Brand assets and `THIRD_PARTY_LICENSE_SUMMARY.md`; collect full installed license texts if required by client policy.

## Credentials

- [ ] Credentials are transferred through an approved secure channel, never inside the ZIP.
- [ ] Temporary staff passwords are rotated.
- [ ] Seed password environment variables are removed after use.
- [ ] Provider keys are restricted to the required domains/services.
- [ ] Former developer/collaborator access has an agreed removal date.

## Feature claims

- [ ] Every claimed Live feature has passed production UAT.
- [ ] Provider-dependent features are marked Live, Integration-ready or Disabled.
- [ ] Automatic payment reconciliation is not claimed unless a gateway adapter and verified webhook are live.
- [ ] Current single-instance disk limitation is disclosed until object storage is enabled.
- [ ] Known issues and accepted follow-up items are written down.

## Acceptance record

- Product/version:
- Production release date:
- Customer representative:
- Delivery representative:
- Accepted limitations:
- Support/warranty period, if agreed separately:
- Acceptance reference/signature:
