import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { handleExpenseReceiptUpload } from "../middleware/upload.middleware";
import { createExpenseSchema, updateExpenseSchema, expenseStatusSchema, listExpensesSchema, financeSummarySchema, createExpenseClaimSchema, updateExpenseClaimSchema } from "../validators/expense.validators";

const router = Router();
router.use(authenticate);

// Technician self-service claims. Ownership is enforced again in the service layer.
router.get("/claims/me", requireRole(UserRole.TECHNICIAN), expenseController.listClaims);
router.post("/claims", requireRole(UserRole.TECHNICIAN), validateBody(createExpenseClaimSchema), expenseController.createClaim);
router.patch("/claims/:id", requireRole(UserRole.TECHNICIAN), validateBody(updateExpenseClaimSchema), expenseController.updateClaim);
router.post("/claims/:id/receipt", requireRole(UserRole.TECHNICIAN), handleExpenseReceiptUpload, expenseController.claimReceipt);
router.get("/claims/:id/receipt", requireRole(UserRole.TECHNICIAN), expenseController.claimReceiptFile);
router.delete("/claims/:id", requireRole(UserRole.TECHNICIAN), expenseController.removeClaim);

// Finance administration.
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN));
router.get("/summary", validateQuery(financeSummarySchema), expenseController.summary);
router.get("/", validateQuery(listExpensesSchema), expenseController.list);
router.post("/", validateBody(createExpenseSchema), expenseController.create);
router.get("/:id", expenseController.get);
router.patch("/:id", validateBody(updateExpenseSchema), expenseController.update);
router.patch("/:id/status", validateBody(expenseStatusSchema), expenseController.status);
router.post("/:id/receipt", handleExpenseReceiptUpload, expenseController.receipt);
router.get("/:id/receipt", expenseController.receiptFile);
router.delete("/:id", expenseController.remove);
export default router;
