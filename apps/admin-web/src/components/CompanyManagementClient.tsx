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
    useState(initialCompanies);

  const [branches, setBranches] =
    useState(initialBranches);

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
          branch.companyId ===
          selectedCompanyId
      ),
    [branches, selectedCompanyId]
  );

  async function handleCompanyCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const form =
      new FormData(event.currentTarget);

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

      if (!response.ok || !json.success) {
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
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/${action}`,
        {
          method: "POST",
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
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

    setError(null);
    setIsSubmitting(true);

    const form =
      new FormData(event.currentTarget);

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

      if (!response.ok || !json.success) {
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
    <>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-surface px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className={`${ui.card} overflow-hidden`}>
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
              onClick={() =>
                setShowCompanyForm(
                  (value) => !value
                )
              }
            >
              + Company
            </button>
          </div>

          {showCompanyForm && (
            <form
              onSubmit={handleCompanyCreate}
              className="border-b border-border-default p-5"
            >
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${ui.btnPrimary} w-full`}
                >
                  {isSubmitting
                    ? "Creating..."
                    : "Create Company"}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-border-default">
            {companies.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-faint">
                No companies found.
              </div>
            ) : (
              companies.map((company) => {
                const isSelected =
                  company._id ===
                  selectedCompanyId;

                return (
                  <button
                    key={company._id}
                    type="button"
                    onClick={() =>
                      setSelectedCompanyId(
                        company._id
                      )
                    }
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
                          {company.name}
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
              })
            )}
          </div>
        </section>

        <section className={`${ui.card} min-w-0`}>
          {!selectedCompany ? (
            <div className="p-8 text-center text-sm text-ink-faint">
              Select a company to view details.
            </div>
          ) : (
            <>
              <div className="border-b border-border-default p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
                      Company
                    </p>

                    <h2 className="mt-1 text-xl font-semibold">
                      {selectedCompany.name}
                    </h2>

                    <p className="mt-2 text-sm text-ink-muted">
                      {selectedCompany.email ??
                        "No email"}{" "}
                      {selectedCompany.phone
                        ? `• ${selectedCompany.phone}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.status !==
                      "approved" && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          handleCompanyAction(
                            selectedCompany._id,
                            "approve"
                          )
                        }
                        className={ui.btnPrimary}
                      >
                        Approve
                      </button>
                    )}

                    {selectedCompany.status !==
                      "suspended" && (
                      <button
                        type="button"
                        disabled={isSubmitting}
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
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Branches
                    </h3>

                    <p className="mt-1 text-xs text-ink-muted">
                      {selectedBranches.length} branch
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
                    onClick={() =>
                      setShowBranchForm(
                        (value) => !value
                      )
                    }
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

                {showBranchForm && (
                  <form
                    onSubmit={
                      handleBranchCreate
                    }
                    className="mb-5 rounded-xl border border-border-default bg-surface-2 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Branch name"
                        className={ui.input}
                      />

                      <input
                        name="city"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="City"
                        className={ui.input}
                      />

                      <input
                        name="state"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="State"
                        className={ui.input}
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={ui.btnPrimary}
                      >
                        {isSubmitting
                          ? "Creating..."
                          : "Create Branch"}
                      </button>
                    </div>
                  </form>
                )}

                {selectedBranches.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-ink-faint">
                    No branches for this company yet.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedBranches.map(
                      (branch) => (
                        <div
                          key={branch._id}
                          className="rounded-xl border border-border-default p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {branch.name}
                              </p>

                              <p className="mt-1 text-sm text-ink-muted">
                                {branch.city},{" "}
                                {branch.state}
                              </p>
                            </div>

                            <span
                              className={
                                "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide " +
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
                            {branch._id}
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
    </>
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
    status === "more_information_required"
      ? "More info"
      : status;

  return (
    <span
      className={
        "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide " +
        (active
          ? "border-success/40 text-success"
          : status === "pending"
            ? "border-warning/40 text-warning"
            : "border-danger/40 text-danger")
      }
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}