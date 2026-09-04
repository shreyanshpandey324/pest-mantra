"use client";

import { useMemo, useState } from "react";
import { ui } from "@/lib/ui-classes";
import type {
  CompanyItem,
  BranchItem,
} from "@/app/dashboard/companies/page";

interface Props {
  initialCompanies: CompanyItem[];
  initialBranches: BranchItem[];
}

export default function CompanyManagementClient({
  initialCompanies,
  initialBranches,
}: Props) {
  const [companies, setCompanies] =
    useState<CompanyItem[]>(initialCompanies);

  const [branches, setBranches] =
    useState<BranchItem[]>(initialBranches);

  const [selectedCompanyId, setSelectedCompanyId] =
    useState<string | null>(
      initialCompanies[0]?._id ?? null
    );

  const [showCompanyForm, setShowCompanyForm] =
    useState(false);

  const [showBranchForm, setShowBranchForm] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const selectedCompany = useMemo(
    () =>
      companies.find(
        (company) =>
          company._id === selectedCompanyId
      ) ?? null,
    [companies, selectedCompanyId]
  );

  const selectedBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          branch.companyId === selectedCompanyId
      ),
    [branches, selectedCompanyId]
  );

  function clearError() {
    if (error) {
      setError(null);
    }
  }

  async function handleCompanyCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    clearError();
    setIsSubmitting(true);

    const form = new FormData(
      event.currentTarget
    );

    const body = {
      name: String(
        form.get("name") ?? ""
      ).trim(),

      phone:
        String(
          form.get("phone") ?? ""
        ).trim() || undefined,

      email:
        String(
          form.get("email") ?? ""
        ).trim() || undefined,
      subscriptionPlan: String(form.get("subscriptionPlan") ?? "starter"),
      billingCurrency: String(form.get("billingCurrency") ?? "INR").toUpperCase(),
      timezone: String(form.get("timezone") ?? "Asia/Kolkata"),
      countryCode: String(form.get("countryCode") ?? "IN").toUpperCase(),
      locale: String(form.get("locale") ?? "en-IN"),
      taxLabel: String(form.get("taxLabel") ?? "GST"),
      defaultTaxRate: Number(form.get("defaultTaxRate") ?? 18),
      distanceUnit: String(form.get("distanceUnit") ?? "km"),
      dateFormat: String(form.get("dateFormat") ?? "DD/MM/YYYY"),
    };

    try {
      const response = await fetch(
        "/api/companies",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json = await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ??
            "Could not create company"
        );
      }

      const company =
        json.data.company as CompanyItem;

      setCompanies((current) => [
        company,
        ...current,
      ]);

      setSelectedCompanyId(
        company._id
      );

      setShowCompanyForm(false);

      event.currentTarget.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create company"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompanyAction(
    companyId: string,
    action: "approve" | "suspend"
  ) {
    clearError();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/${action}`,
        {
          method: "POST",
        }
      );

      const json = await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ??
            `Could not ${action} company`
        );
      }

      const updated =
        json.data.company as CompanyItem;

      setCompanies((current) =>
        current.map((company) =>
          company._id === companyId
            ? updated
            : company
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not ${action} company`
      );
    } finally {
      setIsSubmitting(false);
    }
  }


  async function handleCompanyConfigUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany) return;
    clearError();
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const body = {
      subscriptionPlan: String(form.get("subscriptionPlan") ?? selectedCompany.subscriptionPlan ?? "starter"),
      subscriptionStatus: String(form.get("subscriptionStatus") ?? selectedCompany.subscriptionStatus ?? "trial"),
      billingCurrency: String(form.get("billingCurrency") ?? selectedCompany.billingCurrency ?? "INR").toUpperCase(),
      timezone: String(form.get("timezone") ?? selectedCompany.timezone ?? "Asia/Kolkata"),
      countryCode: String(form.get("countryCode") ?? selectedCompany.countryCode ?? "IN").toUpperCase(),
      locale: String(form.get("locale") ?? selectedCompany.locale ?? "en-IN"),
      taxLabel: String(form.get("taxLabel") ?? selectedCompany.taxLabel ?? "GST"),
      defaultTaxRate: Number(form.get("defaultTaxRate") ?? selectedCompany.defaultTaxRate ?? 18),
      distanceUnit: String(form.get("distanceUnit") ?? selectedCompany.distanceUnit ?? "km"),
      dateFormat: String(form.get("dateFormat") ?? selectedCompany.dateFormat ?? "DD/MM/YYYY"),
    };
    try {
      const response = await fetch(`/api/companies/${selectedCompany._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not update company settings");
      const updated = json.data.company as CompanyItem;
      setCompanies((current) => current.map((company) => company._id === updated._id ? updated : company));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update company settings"); } finally { setIsSubmitting(false); }
  }

  async function handleBranchCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedCompanyId) {
      setError(
        "Select a company first."
      );
      return;
    }

    clearError();
    setIsSubmitting(true);

    const form = new FormData(
      event.currentTarget
    );

    const body = {
      companyId:
        selectedCompanyId,

      name: String(
        form.get("name") ?? ""
      ).trim(),

      city: String(
        form.get("city") ?? ""
      ).trim(),

      state: String(
        form.get("state") ?? ""
      ).trim(),

      isActive: true,
    };

    try {
      const response = await fetch(
        "/api/companies/branches",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json = await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        throw new Error(
          json.message ??
            "Could not create branch"
        );
      }

      const branch =
        json.data.branch as BranchItem;

      setBranches((current) => [
        ...current,
        branch,
      ]);

      setShowBranchForm(false);

      event.currentTarget.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create branch"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            className="shrink-0 font-semibold"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* =====================================================
            COMPANY LIST
        ====================================================== */}

        <section
          className={`${ui.card} overflow-hidden`}
        >
          <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
            <div>
              <h2 className="font-semibold">
                Companies
              </h2>

              <p className="mt-1 text-xs text-ink-muted">
                {companies.length} total
              </p>
            </div>

            <button
              type="button"
              className={ui.btnPrimary}
              onClick={() => {
                clearError();
                setShowCompanyForm(
                  (value) => !value
                );
              }}
            >
              + Company
            </button>
          </div>

          {/* CREATE COMPANY FORM */}

          {showCompanyForm && (
            <form
              onSubmit={
                handleCompanyCreate
              }
              className="border-b border-border-default bg-surface-2 p-5"
            >
              <div className="mb-4">
                <h3 className="font-semibold">
                  Create Company
                </h3>

                <p className="mt-1 text-xs text-ink-muted">
                  Add a new company to the
                  system.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={150}
                  placeholder="Company name"
                  className={ui.input}
                />

                <input
                  name="phone"
                  placeholder="Phone"
                  className={ui.input}
                />

                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className={ui.input}
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  <select name="subscriptionPlan" className={ui.input} defaultValue="starter" aria-label="Subscription plan"><option value="starter">Starter</option><option value="growth">Growth</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                  <input name="billingCurrency" className={ui.input} defaultValue="INR" maxLength={3} aria-label="Billing currency" />
                  <input name="timezone" className={ui.input} defaultValue="Asia/Kolkata" aria-label="Timezone" />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input name="countryCode" className={ui.input} defaultValue="IN" maxLength={2} aria-label="Country code" />
                  <input name="locale" className={ui.input} defaultValue="en-IN" aria-label="Locale" />
                  <select name="distanceUnit" className={ui.input} defaultValue="km" aria-label="Distance unit"><option value="km">Kilometres</option><option value="mi">Miles</option></select>
                  <input name="taxLabel" className={ui.input} defaultValue="GST" aria-label="Tax label" />
                  <input name="defaultTaxRate" type="number" min="0" max="100" step="0.01" className={ui.input} defaultValue="18" aria-label="Default tax rate" />
                  <input name="dateFormat" className={ui.input} defaultValue="DD/MM/YYYY" aria-label="Date format" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting
                    }
                    className={`${ui.btnPrimary} flex-1`}
                  >
                    {isSubmitting
                      ? "Creating..."
                      : "Create Company"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      isSubmitting
                    }
                    onClick={() =>
                      setShowCompanyForm(
                        false
                      )
                    }
                    className={ui.btnGhost}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* COMPANY LIST */}

          <div className="divide-y divide-border-default">
            {companies.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-ink-faint">
                  No companies found.
                </p>

                <button
                  type="button"
                  className={`${ui.btnPrimary} mt-4`}
                  onClick={() =>
                    setShowCompanyForm(
                      true
                    )
                  }
                >
                  Create First Company
                </button>
              </div>
            ) : (
              companies.map(
                (company) => {
                  const isSelected =
                    company._id ===
                    selectedCompanyId;

                  return (
                    <button
                      key={
                        company._id
                      }
                      type="button"
                      onClick={() => {
                        clearError();
                        setSelectedCompanyId(
                          company._id
                        );
                        setShowBranchForm(
                          false
                        );
                      }}
                      className={
                        "w-full px-5 py-4 text-left transition-colors " +
                        (isSelected
                          ? "bg-surface-2"
                          : "hover:bg-surface-2/60")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {
                              company.name
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-ink-muted">
                            {company.email ??
                              company.phone ??
                              "No contact details"}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            company.status
                          }
                          active={
                            company.isActive
                          }
                        />
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* =====================================================
            COMPANY DETAILS
        ====================================================== */}

        <section
          className={`${ui.card} min-w-0 overflow-hidden`}
        >
          {!selectedCompany ? (
            <div className="p-10 text-center">
              <p className="text-sm text-ink-faint">
                Select a company to view
                details.
              </p>
            </div>
          ) : (
            <>
              {/* COMPANY HEADER */}

              <div className="border-b border-border-default p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
                      Company
                    </p>

                    <h2 className="mt-1 break-words text-xl font-semibold">
                      {
                        selectedCompany.name
                      }
                    </h2>

                    <div className="mt-2 space-y-1 text-sm text-ink-muted">
                      <p>
                        Email:{" "}
                        {selectedCompany.email ??
                          "Not provided"}
                      </p>

                      <p>
                        Phone:{" "}
                        {selectedCompany.phone ??
                          "Not provided"}
                      </p>
                    </div>

                    <div className="mt-3">
                      <StatusBadge
                        status={
                          selectedCompany.status
                        }
                        active={
                          selectedCompany.isActive
                        }
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                      <span className="rounded-full border border-accent/25 bg-accent/5 px-2.5 py-1 text-accent">{(selectedCompany.subscriptionPlan ?? "starter").replace("_", " ")} plan</span>
                      <span className="rounded-full border border-border-default px-2.5 py-1 text-ink-muted">{(selectedCompany.subscriptionStatus ?? "trial").replace("_", " ")}</span>
                      <span className="rounded-full border border-border-default px-2.5 py-1 text-ink-muted">{selectedCompany.billingCurrency ?? "INR"} · {selectedCompany.timezone ?? "Asia/Kolkata"}</span>
                      <span className="rounded-full border border-border-default px-2.5 py-1 text-ink-muted">{selectedCompany.countryCode ?? "IN"} · {selectedCompany.distanceUnit ?? "km"} · {selectedCompany.taxLabel ?? "GST"} {selectedCompany.defaultTaxRate ?? 18}%</span>
                    </div>
                  </div>

                  {/* COMPANY ACTIONS */}

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {selectedCompany.status !==
                      "approved" && (
                      <button
                        type="button"
                        disabled={
                          isSubmitting
                        }
                        onClick={() =>
                          handleCompanyAction(
                            selectedCompany._id,
                            "approve"
                          )
                        }
                        className={
                          ui.btnPrimary
                        }
                      >
                        {isSubmitting
                          ? "Working..."
                          : "Approve"}
                      </button>
                    )}

                    {selectedCompany.status !==
                      "suspended" && (
                      <button
                        type="button"
                        disabled={
                          isSubmitting
                        }
                        onClick={() =>
                          handleCompanyAction(
                            selectedCompany._id,
                            "suspend"
                          )
                        }
                        className={
                          ui.btnGhost
                        }
                      >
                        {isSubmitting
                          ? "Working..."
                          : "Suspend"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-b border-border-default p-5">
                <div className="mb-4"><h3 className="font-semibold">Global operating profile</h3><p className="mt-1 text-xs text-ink-muted">Country, currency, tax, timezone and SaaS-plan defaults for this company.</p></div>
                <form onSubmit={handleCompanyConfigUpdate} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <select name="subscriptionPlan" className={ui.input} defaultValue={selectedCompany.subscriptionPlan ?? "starter"}><option value="starter">Starter</option><option value="growth">Growth</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                  <select name="subscriptionStatus" className={ui.input} defaultValue={selectedCompany.subscriptionStatus ?? "trial"}><option value="trial">Trial</option><option value="active">Active</option><option value="past_due">Past due</option><option value="suspended">Suspended</option></select>
                  <input name="billingCurrency" className={ui.input} defaultValue={selectedCompany.billingCurrency ?? "INR"} maxLength={3} />
                  <input name="timezone" className={ui.input} defaultValue={selectedCompany.timezone ?? "Asia/Kolkata"} />
                  <input name="countryCode" className={ui.input} defaultValue={selectedCompany.countryCode ?? "IN"} maxLength={2} />
                  <input name="locale" className={ui.input} defaultValue={selectedCompany.locale ?? "en-IN"} />
                  <input name="taxLabel" className={ui.input} defaultValue={selectedCompany.taxLabel ?? "GST"} />
                  <input name="defaultTaxRate" type="number" min="0" max="100" step="0.01" className={ui.input} defaultValue={selectedCompany.defaultTaxRate ?? 18} />
                  <select name="distanceUnit" className={ui.input} defaultValue={selectedCompany.distanceUnit ?? "km"}><option value="km">Kilometres</option><option value="mi">Miles</option></select>
                  <input name="dateFormat" className={ui.input} defaultValue={selectedCompany.dateFormat ?? "DD/MM/YYYY"} />
                  <div className="sm:col-span-2 xl:col-span-2 flex justify-end"><button disabled={isSubmitting} className={ui.btnPrimary}>{isSubmitting?"Saving…":"Save global profile"}</button></div>
                </form>
              </div>

              {/* BRANCHES */}

              <div className="p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Branches
                    </h3>

                    <p className="mt-1 text-xs text-ink-muted">
                      {
                        selectedBranches.length
                      }{" "}
                      branch
                      {selectedBranches.length ===
                      1
                        ? ""
                        : "es"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !selectedCompany.isActive
                    }
                    onClick={() => {
                      clearError();
                      setShowBranchForm(
                        (value) => !value
                      );
                    }}
                    className={
                      selectedCompany.isActive
                        ? ui.btnPrimary
                        : ui.btnGhost
                    }
                    title={
                      !selectedCompany.isActive
                        ? "Company must be active before creating a branch"
                        : undefined
                    }
                  >
                    + Branch
                  </button>
                </div>

                {!selectedCompany.isActive && (
                  <div className="mb-5 rounded-xl border border-warning/40 bg-surface-2 px-4 py-3 text-sm text-warning">
                    Approve this company
                    before creating a
                    branch.
                  </div>
                )}

                {/* CREATE BRANCH FORM */}

                {showBranchForm &&
                  selectedCompany.isActive && (
                    <form
                      onSubmit={
                        handleBranchCreate
                      }
                      className="mb-5 rounded-xl border border-border-default bg-surface-2 p-4"
                    >
                      <div className="mb-4">
                        <h4 className="font-semibold">
                          Create Branch
                        </h4>

                        <p className="mt-1 text-xs text-ink-muted">
                          Add a branch under{" "}
                          {
                            selectedCompany.name
                          }
                          .
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          name="name"
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="Branch name"
                          className={
                            ui.input
                          }
                        />

                        <input
                          name="city"
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="City"
                          className={
                            ui.input
                          }
                        />

                        <input
                          name="state"
                          required
                          minLength={2}
                          maxLength={100}
                          placeholder="State"
                          className={
                            ui.input
                          }
                        />
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={
                            isSubmitting
                          }
                          onClick={() =>
                            setShowBranchForm(
                              false
                            )
                          }
                          className={
                            ui.btnGhost
                          }
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={
                            isSubmitting
                          }
                          className={
                            ui.btnPrimary
                          }
                        >
                          {isSubmitting
                            ? "Creating..."
                            : "Create Branch"}
                        </button>
                      </div>
                    </form>
                  )}

                {/* BRANCH LIST */}

                {selectedBranches.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-border-default p-8 text-center">
                    <p className="text-sm text-ink-faint">
                      No branches for this
                      company yet.
                    </p>

                    {selectedCompany.isActive && (
                      <button
                        type="button"
                        className={`${ui.btnPrimary} mt-4`}
                        onClick={() =>
                          setShowBranchForm(
                            true
                          )
                        }
                      >
                        + Create Branch
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedBranches.map(
                      (branch) => (
                        <div
                          key={
                            branch._id
                          }
                          className="rounded-xl border border-border-default p-4 transition-colors hover:bg-surface-2/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-medium">
                                {
                                  branch.name
                                }
                              </p>

                              <p className="mt-1 break-words text-sm text-ink-muted">
                                {
                                  branch.city
                                }
                                ,{" "}
                                {
                                  branch.state
                                }
                              </p>
                            </div>

                            <span
                              className={
                                "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide " +
                                (branch.isActive
                                  ? "border-success/40 text-success"
                                  : "border-danger/40 text-danger")
                              }
                            >
                              {branch.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>

                          <p className="mt-4 break-all font-mono text-[10px] text-ink-faint">
                            ID:{" "}
                            {
                              branch._id
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  active,
}: {
  status: string;
  active: boolean;
}) {
  const label =
    status ===
    "more_information_required"
      ? "More info"
      : status;

  let className =
    "border-danger/40 text-danger";

  if (active) {
    className =
      "border-success/40 text-success";
  } else if (
    status === "pending"
  ) {
    className =
      "border-warning/40 text-warning";
  }

  return (
    <span
      className={
        "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide " +
        className
      }
    >
      {label.replaceAll(
        "_",
        " "
      )}
    </span>
  );
}