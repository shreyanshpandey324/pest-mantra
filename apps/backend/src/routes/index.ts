import { Router } from "express";

import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import projectRoutes from "./project.routes";
import technicianRoutes from "./technician.routes";
import chemicalRoutes from "./chemical.routes";
import locationRoutes from "./location.routes";
import companyRoutes from "./company.routes";
import mileageRoutes from "./mileage.routes";
import settingsRoutes from "./settings.routes";
import quotationRoutes from "./quotation.routes";
import invoiceRoutes from "./invoice.routes";
import serviceContractRoutes from "./serviceContract.routes";
import serviceReportRoutes from "./serviceReport.routes";
import feedbackRoutes from "./feedback.routes";
import customerPortalRoutes from "./customerPortal.routes";
import serviceReminderRoutes from "./serviceReminder.routes";
import leadRoutes from "./lead.routes";
import expenseRoutes from "./expense.routes";
import complaintRoutes from "./complaint.routes";
import auditRoutes from "./audit.routes";
import notificationAlertRoutes from "./notificationAlert.routes";
import communicationRoutes from "./communication.routes";
import customerAccountRoutes from "./customerAccount.routes";
import approvalRoutes from "./approval.routes";
import automationRuleRoutes from "./automationRule.routes";
import systemRoutes from "./system.routes";
import zeroChaosRoutes from "./zeroChaos.routes";


const router = Router();

router.use(
  "/auth",
  authRoutes
);

router.use(
  "/users",
  userRoutes
);

router.use(
  "/projects",
  projectRoutes
);

router.use(
  "/technicians",
  technicianRoutes
);

router.use(
  "/chemicals",
  chemicalRoutes
);

router.use(
  "/location",
  locationRoutes
);

router.use(
  "/companies",
  companyRoutes
);

router.use(
  "/mileage",
  mileageRoutes
);

router.use(
  "/settings",
  settingsRoutes
);

router.use("/quotations", quotationRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/service-contracts", serviceContractRoutes);
router.use("/service-reports", serviceReportRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/customer-portal", customerPortalRoutes);
router.use("/service-reminders", serviceReminderRoutes);
router.use("/leads", leadRoutes);
router.use("/expenses", expenseRoutes);
router.use("/complaints", complaintRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/notification-center", notificationAlertRoutes);
router.use("/communications", communicationRoutes);
router.use("/customers-master", customerAccountRoutes);
router.use("/approvals", approvalRoutes);
router.use("/automations", automationRuleRoutes);
router.use("/system", systemRoutes);
router.use("/operations", zeroChaosRoutes);

export default router;