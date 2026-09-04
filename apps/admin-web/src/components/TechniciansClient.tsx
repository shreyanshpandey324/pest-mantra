"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";

import { ui } from "@/lib/ui-classes";
import {
  EditTechnicianFormData,
  TechnicianListItem,
} from "@/types/project";

import { AddTechnicianModal } from "./AddTechnicianModal";
import { EditTechnicianModal } from "./EditTechnicianModal";
import { TechnicianStats } from "./TechnicianStats";
import {
  ActiveFilter,
  DutyFilter,
  SortFilter,
  TechnicianFilters,
} from "./TechnicianFilters";
import { TechnicianProfileDrawer } from "./TechnicianProfileDrawer";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface TechniciansClientProps {
  technicians: TechnicianListItem[];
  loadError?: string | null;
}

type Toast = {
  kind: "success" | "error";
  text: string;
} | null;

const DUTY_LABELS: Record<
  TechnicianListItem["dutyStatus"],
  string
> = {
  off_duty: "Off Duty",
  on_duty_idle: "On Duty",
  en_route: "En Route",
  on_site: "On Site",
  busy: "Busy",
};

const DUTY_DOT: Record<
  TechnicianListItem["dutyStatus"],
  string
> = {
  off_duty: "bg-ink-faint",
  on_duty_idle: "bg-success",
  en_route: "bg-blue-400",
  on_site: "bg-blue-400",
  busy: "bg-amber-400",
};

export function TechniciansClient({
  technicians,
  loadError,
}: TechniciansClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [dutyFilter, setDutyFilter] =
    useState<DutyFilter>("all");
  const [activeFilter, setActiveFilter] =
    useState<ActiveFilter>("all");
  const [sortBy, setSortBy] =
    useState<SortFilter>("name");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [editingTechnician, setEditingTechnician] =
    useState<EditTechnicianFormData | null>(null);

  const [viewingTechnician, setViewingTechnician] =
    useState<TechnicianListItem | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<TechnicianListItem | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [toast, setToast] =
    useState<Toast>(null);

  const AddTechnicianModalComponent =
    AddTechnicianModal as unknown as ComponentType<{
      onClose: () => void;
      onCreated: () => void;
    }>;

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(null),
      3500
    );

    return () => clearTimeout(timer);
  }, [toast]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/users/${deleteTarget.id}`,
        {
          method: "DELETE",
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.message ??
            "Unable to deactivate technician."
        );
      }

      setToast({
        kind: "success",
        text: "Technician deactivated successfully.",
      });

      setDeleteTarget(null);

      router.refresh();
    } catch (err) {
      setToast({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to connect to server.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setDutyFilter("all");
    setActiveFilter("all");
    setSortBy("name");
  }

  const filteredTechnicians = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    let result = technicians.filter(
      (tech) => {
        const matchesSearch =
          !value ||
          tech.name
            .toLowerCase()
            .includes(value) ||
          tech.phone.includes(value) ||
          tech.employeeCode
            .toLowerCase()
            .includes(value);

        const matchesDuty =
          dutyFilter === "all" ||
          tech.dutyStatus === dutyFilter;

        const matchesActive =
          activeFilter === "all" ||
          (activeFilter === "active"
            ? tech.isActive
            : !tech.isActive);

        return (
          matchesSearch &&
          matchesDuty &&
          matchesActive
        );
      }
    );

    result = [...result].sort(
      (a, b) => {
        if (sortBy === "employee") {
          return a.employeeCode.localeCompare(
            b.employeeCode
          );
        }

        if (sortBy === "status") {
          return DUTY_LABELS[
            a.dutyStatus
          ].localeCompare(
            DUTY_LABELS[b.dutyStatus]
          );
        }

        return a.name.localeCompare(b.name);
      }
    );

    return result;
  }, [
    search,
    dutyFilter,
    activeFilter,
    sortBy,
    technicians,
  ]);

  return (
    <>
      {/* TOAST */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-5 z-[70] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
            toast.kind === "success"
              ? "border-success/20 bg-surface text-success"
              : "border-danger/20 bg-surface text-danger"
          }`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              toast.kind === "success"
                ? "bg-success/10"
                : "bg-danger/10"
            }`}
          >
            {toast.kind === "success"
              ? "✓"
              : "!"}
          </span>

          {toast.text}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />

            <h1 className="text-[24px] font-semibold tracking-tight text-ink">
              Technicians
            </h1>
          </div>

          <p className="mt-1.5 text-sm text-ink-muted">
            Manage your field technicians,
            availability and assignments.
          </p>
        </div>

        <button
          type="button"
          className={`${ui.btnPrimary} inline-flex h-10 items-center justify-center gap-2 px-4`}
          onClick={() =>
            setShowAddModal(true)
          }
        >
          <span className="text-lg leading-none">
            +
          </span>

          <span>
            Add Technician
          </span>
        </button>
      </div>

      {/* ERROR */}
      {loadError && (
        <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3">
          <p className={ui.errorText}>
            {loadError}
          </p>
        </div>
      )}

      {/* STATS */}
      <TechnicianStats
        technicians={technicians}
      />

      {/* FILTERS */}
      <TechnicianFilters
        search={search}
        onSearchChange={setSearch}
        dutyFilter={dutyFilter}
        onDutyFilterChange={
          setDutyFilter
        }
        activeFilter={activeFilter}
        onActiveFilterChange={
          setActiveFilter
        }
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClear={clearFilters}
      />

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Technician Directory
            </h2>

            <p className="mt-0.5 text-[11px] text-ink-faint">
              {filteredTechnicians.length}{" "}
              {filteredTechnicians.length ===
              1
                ? "technician"
                : "technicians"}{" "}
              shown
            </p>
          </div>

          {(search ||
            dutyFilter !== "all" ||
            activeFilter !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-warning transition hover:text-warning"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-2 text-left">
                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Technician
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Employee Code
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Contact
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Duty Status
                </th>

                <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Account
                </th>

                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredTechnicians.length ===
                0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-xl text-ink-faint">
                        ◌
                      </div>

                      <p className="text-sm font-medium text-ink">
                        No technicians found
                      </p>

                      <p className="mt-1 text-xs text-ink-faint">
                        Try changing your search
                        or filters.
                      </p>

                      {(search ||
                        dutyFilter !==
                          "all" ||
                        activeFilter !==
                          "all") && (
                        <button
                          type="button"
                          onClick={
                            clearFilters
                          }
                          className="mt-3 text-xs font-medium text-warning hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {filteredTechnicians.map(
                (tech) => (
                  <tr
                    key={tech.id}
                    className="group cursor-pointer border-b border-border-default transition last:border-b-0 hover:bg-surface-2"
                    onClick={() =>
                      setViewingTechnician(
                        tech
                      )
                    }
                  >
                    {/* NAME */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-sm font-semibold text-warning">
                          {tech.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">
                            {tech.name}
                          </div>

                          {tech.email && (
                            <div className="mt-0.5 max-w-[190px] truncate text-[11px] text-ink-faint">
                              {tech.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* EMPLOYEE */}
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink-muted">
                        {tech.employeeCode}
                      </span>
                    </td>

                    {/* CONTACT */}
                    <td className="px-5 py-4">
                      <div className="text-xs text-ink">
                        {tech.phone}
                      </div>

                      {tech.vehicleNumber && (
                        <div className="mt-1 text-[10px] text-ink-faint">
                          Vehicle:{" "}
                          {tech.vehicleNumber}
                        </div>
                      )}
                    </td>

                    {/* DUTY */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-2 px-2.5 py-1.5 text-[11px] font-medium text-[#c3c8d1]">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${DUTY_DOT[tech.dutyStatus]}`}
                        />

                        {
                          DUTY_LABELS[
                            tech.dutyStatus
                          ]
                        }
                      </span>
                    </td>

                    {/* ACCOUNT */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${
                          tech.isActive
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {tech.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td
                      className="px-5 py-4 text-right"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <div className="flex justify-end gap-2 opacity-80 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTechnician(
                              {
                                id: tech.id,
                                name: tech.name,
                                phone: tech.phone,
                                email: tech.email,
                                branchId:
                                  tech.branchId,
                                employeeCode:
                                  tech.employeeCode,
                                vehicleNumber:
                                  tech.vehicleNumber,
                                skills:
                                  tech.skills,
                                isActive:
                                  tech.isActive,
                                dutyStatus:
                                  tech.dutyStatus,
                              }
                            )
                          }
                          className="rounded-lg border border-border-default bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-border-strong hover:bg-surface-2 hover:text-accent-strong"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              tech
                            )
                          }
                          className="rounded-lg border border-danger/15 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger transition hover:border-red-400/20 hover:bg-danger/10"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD */}
      {showAddModal && (
        <AddTechnicianModalComponent
          onClose={() =>
            setShowAddModal(false)
          }
          onCreated={() => {
            setShowAddModal(false);

            setToast({
              kind: "success",
              text: "Technician added successfully.",
            });

            router.refresh();
          }}
        />
      )}

      {/* EDIT */}
      {editingTechnician && (
        <EditTechnicianModal
          technician={editingTechnician}
          onClose={() =>
            setEditingTechnician(null)
          }
          onUpdated={() => {
            setEditingTechnician(null);

            setToast({
              kind: "success",
              text: "Technician updated successfully.",
            });

            router.refresh();
          }}
        />
      )}

      {/* PROFILE */}
      {viewingTechnician && (
        <TechnicianProfileDrawer
          technician={viewingTechnician}
          onClose={() =>
            setViewingTechnician(null)
          }
        />
      )}

      {/* DEACTIVATE */}
      {deleteTarget && (
        <DeleteConfirmationModal
          title="Deactivate Technician"
          message={`Deactivate "${deleteTarget.name}"? They will be signed out and removed from active assignments, while completed-job history stays intact.`}
          isDeleting={isDeleting}
          actionLabel="Deactivate"
          pendingActionLabel="Deactivating..."
          onCancel={() =>
            setDeleteTarget(null)
          }
          onConfirm={
            handleConfirmDelete
          }
        />
      )}
    </>
  );
}
