import { z } from "zod";
import { CustomerStatus, CustomerType } from "../models/CustomerAccount";

const phone = z.string().trim().min(8).max(25).regex(/^\+?[0-9][0-9\s()-]{6,23}$/, "Invalid phone number");
const site = z.object({
  label: z.string().trim().min(2).max(100),
  address: z.string().trim().min(3).max(500),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(30).optional(),
  countryCode: z.string().trim().length(2).default("IN"),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: phone.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isPrimary: z.boolean().optional(),
});

export const createCustomerAccountSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone,
  email: z.string().trim().email().optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  taxId: z.string().trim().max(100).optional(),
  preferredLanguage: z.string().trim().min(2).max(12).optional(),
  notes: z.string().trim().max(2500).optional(),
  site: site.optional(),
});

export const updateCustomerAccountSchema = createCustomerAccountSchema.partial().omit({ site: true });
export const addCustomerSiteSchema = site;
export type CreateCustomerAccountInput = z.infer<typeof createCustomerAccountSchema>;
export type UpdateCustomerAccountInput = z.infer<typeof updateCustomerAccountSchema>;
export type AddCustomerSiteInput = z.infer<typeof addCustomerSiteSchema>;
