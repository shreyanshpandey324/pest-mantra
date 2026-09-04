import mongoose from "mongoose";
import { CustomerAccount, ICustomerAccount } from "../models/CustomerAccount";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { AddCustomerSiteInput, CreateCustomerAccountInput, UpdateCustomerAccountInput } from "../validators/customerAccount.validators";

function scopedFilter(scope: CallerScope): Record<string, unknown> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Company and branch context are required");
  return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) };
}
function tenantIds(scope: CallerScope) {
  return {
    companyId: scope.companyId && mongoose.Types.ObjectId.isValid(scope.companyId) ? new mongoose.Types.ObjectId(scope.companyId) : undefined,
    branchId: scope.branchId && mongoose.Types.ObjectId.isValid(scope.branchId) ? new mongoose.Types.ObjectId(scope.branchId) : undefined,
  };
}
function customerCode(): string {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `CUS-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
function siteCode(index: number): string { return `SITE-${String(index + 1).padStart(2, "0")}`; }
async function getOne(id: string, scope: CallerScope): Promise<ICustomerAccount> {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Customer not found");
  const customer = await CustomerAccount.findOne({ _id: id, ...scopedFilter(scope) });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}


export const customerAccountService = {
  async list(scope: CallerScope, search?: string, status?: string, type?: string) {
    const filter: Record<string, unknown> = { ...scopedFilter(scope) };
    if (status) filter.status = status;
    if (type) filter.customerType = type;
    if (search?.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { customerCode: { $regex: q, $options: "i" } },
        { "sites.address": { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }
    const customers = await CustomerAccount.find(filter).sort({ updatedAt: -1 }).limit(250).lean();
    return { customers, metrics: {
      total: await CustomerAccount.countDocuments(scopedFilter(scope)),
      active: await CustomerAccount.countDocuments({ ...scopedFilter(scope), status: "active" }),
      enterprise: await CustomerAccount.countDocuments({ ...scopedFilter(scope), customerType: "enterprise" }),
      multiSite: await CustomerAccount.countDocuments({ ...scopedFilter(scope), "sites.1": { $exists: true } }),
    } };
  },
  async get(id: string, scope: CallerScope): Promise<ICustomerAccount> { return getOne(id, scope); },
  async create(input: CreateCustomerAccountInput, scope: CallerScope) {
    const ids = tenantIds(scope);
    const duplicate = await CustomerAccount.findOne({ ...scopedFilter(scope), phone: input.phone });
    if (duplicate) throw ApiError.conflict("A customer with this phone already exists in the current scope");
    const sites = input.site ? [{ ...input.site, countryCode: input.site.countryCode.toUpperCase(), siteCode: siteCode(0), isPrimary: true }] : [];
    return CustomerAccount.create({ ...ids, customerCode: customerCode(), name: input.name, phone: input.phone, email: input.email, customerType: input.customerType, status: input.status, tags: input.tags ?? [], taxId: input.taxId, preferredLanguage: input.preferredLanguage ?? "en", notes: input.notes, sites, createdBy: new mongoose.Types.ObjectId(scope.userId) });
  },
  async update(id: string, input: UpdateCustomerAccountInput, scope: CallerScope) {
    const customer = await getOne(id, scope);
    Object.assign(customer, input);
    await customer.save();
    return customer;
  },

  async syncFromProject(input: {
    companyId?: mongoose.Types.ObjectId;
    branchId?: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    address: string;
    latitude?: number;
    longitude?: number;
    createdBy: string;
  }) {
    if (!input.companyId || !input.branchId || !mongoose.Types.ObjectId.isValid(input.createdBy)) return null;
    const filter = { companyId: input.companyId, branchId: input.branchId, phone: input.phone };
    let customer = await CustomerAccount.findOne(filter);
    if (!customer) {
      try {
        customer = await CustomerAccount.create({
          companyId: input.companyId,
          branchId: input.branchId,
          customerCode: customerCode(),
          name: input.name,
          phone: input.phone,
          customerType: "residential",
          status: "active",
          tags: ["auto-linked"],
          preferredLanguage: "en",
          sites: [{
            siteCode: siteCode(0),
            label: "Primary service site",
            address: input.address,
            countryCode: "IN",
            latitude: input.latitude,
            longitude: input.longitude,
            isPrimary: true,
          }],
          createdBy: new mongoose.Types.ObjectId(input.createdBy),
        });
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
          customer = await CustomerAccount.findOne(filter);
        } else {
          throw error;
        }
      }
      return customer;
    }

    customer.name = input.name || customer.name;
    const normalizedAddress = input.address.trim().toLowerCase();
    const alreadyKnown = customer.sites.some((site) => site.address.trim().toLowerCase() === normalizedAddress);
    if (!alreadyKnown && input.address.trim()) {
      customer.sites.push({
        siteCode: siteCode(customer.sites.length),
        label: `Service site ${customer.sites.length + 1}`,
        address: input.address,
        countryCode: "IN",
        latitude: input.latitude,
        longitude: input.longitude,
        isPrimary: customer.sites.length === 0,
      });
    }
    if (!customer.tags.includes("auto-linked")) customer.tags.push("auto-linked");
    await customer.save();
    return customer;
  },
  async addSite(id: string, input: AddCustomerSiteInput, scope: CallerScope) {
    const customer = await getOne(id, scope);
    const makePrimary = input.isPrimary || customer.sites.length === 0;
    if (makePrimary) customer.sites.forEach((site) => { site.isPrimary = false; });
    customer.sites.push({ ...input, countryCode: input.countryCode.toUpperCase(), siteCode: siteCode(customer.sites.length), isPrimary: makePrimary });
    await customer.save();
    return customer;
  },
};
