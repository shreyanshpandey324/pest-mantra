import { Router } from "express";
import { invoiceController } from "../controllers/invoice.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { createInvoiceSchema, updateInvoiceSchema, invoiceStatusSchema, addPaymentSchema, listInvoicesSchema } from "../validators/invoice.validators";

const router = Router();
router.use(authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));
router.get("/", validateQuery(listInvoicesSchema), invoiceController.list);
router.post("/", validateBody(createInvoiceSchema), invoiceController.create);
router.get("/:id", invoiceController.get);
router.patch("/:id", validateBody(updateInvoiceSchema), invoiceController.update);
router.patch("/:id/status", validateBody(invoiceStatusSchema), invoiceController.status);
router.post("/:id/payments", validateBody(addPaymentSchema), invoiceController.payment);
router.delete("/:id", invoiceController.remove);
export default router;
