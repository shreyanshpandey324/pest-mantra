import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";
import CompanyManagementClient from "@/components/CompanyManagementClient";

export interface CompanyItem {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  isActive: boolean;
  subscriptionPlan?: "starter" | "growth" | "pro" | "enterprise";
  subscriptionStatus?: "trial" | "active" | "past_due" | "suspended";
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  billingCurrency?: string;
  timezone?: string;
  countryCode?: string;
  locale?: string;
  taxLabel?: string;
  defaultTaxRate?: number;
  distanceUnit?: "km" | "mi";
  dateFormat?: string;
  limits?: { technicians: number; branches: number };
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchItem {
  _id: string;
  companyId: string;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  subscriptionPlan?: "starter" | "growth" | "pro" | "enterprise";
  subscriptionStatus?: "trial" | "active" | "past_due" | "suspended";
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  billingCurrency?: string;
  timezone?: string;
  countryCode?: string;
  locale?: string;
  taxLabel?: string;
  defaultTaxRate?: number;
  distanceUnit?: "km" | "mi";
  dateFormat?: string;
  limits?: { technicians: number; branches: number };
  createdAt: string;
  updatedAt: string;
}

export default async function CompaniesPage() {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(
      ACCESS_COOKIE_NAME
    )?.value;

  let companies: CompanyItem[] = [];
  let branches: BranchItem[] = [];
  let loadError: string | null = null;

  try {
    const [companyData, branchData] =
      await Promise.all([
        backendFetch<{
          companies: CompanyItem[];
        }>("/companies", {
          accessToken,
        }),

        backendFetch<{
          branches: BranchItem[];
        }>("/companies/branches", {
          accessToken,
        }),
      ]);

    companies = companyData.companies;
    branches = branchData.branches;
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load companies and branches.";
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
          Organization
        </p>

        <h1 className="mt-1 text-2xl font-semibold">
          Companies & Branches
        </h1>

        <p className="mt-1 text-sm text-ink-muted">
          Manage companies, approvals and operational branches.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger"
        >
          {loadError}
        </div>
      )}

      <CompanyManagementClient
        initialCompanies={companies}
        initialBranches={branches}
      />
    </div>
  );
}