import mongoose from "mongoose";
import { AutomationRule } from "../models/AutomationRule";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
function filter(scope: CallerScope): Record<string, unknown> { if (scope.role === UserRole.SUPER_ADMIN) return {}; if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Company and branch context are required"); return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) }; }
function ids(scope: CallerScope) { return { companyId: scope.companyId && mongoose.Types.ObjectId.isValid(scope.companyId) ? scope.companyId : undefined, branchId: scope.branchId && mongoose.Types.ObjectId.isValid(scope.branchId) ? scope.branchId : undefined }; }
export const automationRuleService = {
  async list(scope: CallerScope) { const rules = await AutomationRule.find(filter(scope)).sort({ enabled: -1, trigger: 1 }).lean(); return { rules, metrics: { total: rules.length, enabled: rules.filter((r) => r.enabled).length, externalChannels: rules.filter((r) => r.channels.some((c) => c !== "in_app")).length } }; },
  async create(scope: CallerScope, input: Record<string, unknown>) { return AutomationRule.create({ ...ids(scope), ...input, createdBy: new mongoose.Types.ObjectId(scope.userId) }); },
  async update(scope: CallerScope, id: string, input: Record<string, unknown>) { if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Automation rule not found"); const row = await AutomationRule.findOneAndUpdate({ _id: id, ...filter(scope) }, { $set: input }, { new: true, runValidators: true }); if (!row) throw ApiError.notFound("Automation rule not found"); return row; },
  async seedDefaults(scope: CallerScope) { const defaults = [
    { name: "Overdue invoice follow-up", trigger: "invoice_overdue", leadMinutes: 0, channels: ["in_app", "whatsapp"], template: "Payment reminder for {{invoiceNumber}}: {{balanceDue}} is overdue." },
    { name: "Upcoming service reminder", trigger: "service_due", leadMinutes: 4320, channels: ["in_app", "whatsapp"], template: "Your Pest Mantra service is due on {{dueDate}}." },
    { name: "AMC renewal reminder", trigger: "amc_renewal", leadMinutes: 43200, channels: ["in_app", "email"], template: "AMC {{contractNumber}} is approaching renewal." },
    { name: "Complaint SLA escalation", trigger: "complaint_sla", leadMinutes: 0, channels: ["in_app"], template: "Complaint {{complaintNumber}} needs immediate attention." },
  ]; let created = 0; for (const item of defaults) { const exists = await AutomationRule.findOne({ ...filter(scope), trigger: item.trigger }); if (!exists) { await AutomationRule.create({ ...ids(scope), ...item, enabled: true, createdBy: new mongoose.Types.ObjectId(scope.userId) }); created += 1; } } return { created }; },
};
