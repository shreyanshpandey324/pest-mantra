"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-classes";
import { EditTechnicianFormData, TechnicianListItem } from "@/types/project";
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

type Toast = { kind: "success" | "error"; text: string } | null;

const DUTY_LABELS: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "Off Duty",
  on_duty_idle: "On Duty",
  en_route: "En Route",
  on_site: "On Site",
  busy: "Busy",
};

const DUTY_DOT: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "bg-ink-faint",
  on_duty_idle: "bg-success",
  en_route: "bg-accent",
  on_site: "bg-accent",
  busy: "bg-warning",
};

export function TechniciansClient({
  technicians,
  loadError,
}: TechniciansClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [dutyFilter, setDutyFilter] = useState<DutyFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortBy, setSortBy] = useState<SortFilter>("name");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTechnician, setEditingTechnician] =
    useState<EditTechnicianFormData | null>(null);
  const [viewingTechnician, setViewingTechnician] =
    useState<TechnicianListItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<TechnicianListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const AddTechnicianModalComponent =
    AddTechnicianModal as unknown as ComponentType<{
      onClose: () => void;
      onCreated: () => void;
    }>;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Unable to delete technician.");
      }

      setToast({ kind: "success", text: "Technician deleted successfully." });
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      setToast({
        kind: "error",
        text: err instanceof Error ? err.message : "Unable to connect to server.",
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
    const value = search.trim().toLowerCase();

    let result = technicians.filter((tech) => {
      const matchesSearch =
        !value ||
        tech.name.toLowerCase().includes(value) ||
        tech.phone.includes(value) ||
        tech.employeeCode.toLowerCase().includes(value);

      const matchesDuty = dutyFilter === "all" || tech.dutyStatus === dutyFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? tech.isActive : !tech.isActive);

      return matchesSearch && matchesDuty && matchesActive;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "employee") return a.employeeCode.localeCompare(b.employeeCode);
      if (sortBy === "status") return DUTY_LABELS[a.dutyStatus].localeCompare(DUTY_LABELS[b.dutyStatus]);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [search, dutyFilter, activeFilter, sortBy, technicians]);

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-6 top-6 z-[70] rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
            toast.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold">Technicians</h1>

          <p className="mt-1 text-sm text-ink-muted">
            Manage your field technicians.
          </p>
        </div>

        <button
          className={ui.btnPrimary}
          onClick={() => setShowAddModal(true)}
        >
          + Add Technician
        </button>
      </div>

      {loadError && (
        <div className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          <p className={ui.errorText}>{loadError}</p>
        </div>
      )}

      <TechnicianStats technicians={technicians} />

      <TechnicianFilters
        search={search}
        onSearchChange={setSearch}
        dutyFilter={dutyFilter}
        onDutyFilterChange={setDutyFilter}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClear={clearFilters}
      />

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
              <th className="px-5 py-3.5 font-medium">Name</th>
              <th className="px-5 py-3.5 font-medium">Employee Code</th>
              <th className="px-5 py-3.5 font-medium">Phone</th>
              <th className="px-5 py-3.5 font-medium">Duty Status</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredTechnicians.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-14 text-center text-ink-faint"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      🧑‍🔧
                    </span>
                    <span>No technicians found.</span>
                    {(search || dutyFilter !== "all" || activeFilter !== "all") && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {filteredTechnicians.map((tech) => (
              <tr
                key={tech.id}
                className="cursor-pointer border-b border-border-default last:border-b-0 hover:bg-surface-2"
                onClick={() => setViewingTechnician(tech)}
              >
                <td className="px-5 py-4 font-medium">{tech.name}</td>

                <td className="px-5 py-4 font-mono text-xs text-ink-muted">
                  {tech.employeeCode}
                </td>

                <td className="px-5 py-4">{tech.phone}</td>

                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${DUTY_DOT[tech.dutyStatus]}`}
                    />
                    {DUTY_LABELS[tech.dutyStatus]}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      tech.isActive
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {tech.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                <td
                  className="px-5 py-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setEditingTechnician({
                        id: tech.id,
                        name: tech.name,
                        phone: tech.phone,
                        email: tech.email,
                        branchId: tech.branchId,
                        employeeCode: tech.employeeCode,
                        vehicleNumber: tech.vehicleNumber,
                        skills: tech.skills,
                        isActive: tech.isActive,
                        dutyStatus: tech.dutyStatus,
                      })
                    }
                    className={`${ui.btnGhostSm} mr-2`}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteTarget(tech)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddTechnicianModalComponent
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            setToast({ kind: "success", text: "Technician added successfully." });
            router.refresh();
          }}
        />
      )}

      {editingTechnician && (
        <EditTechnicianModal
          technician={editingTechnician}
          onClose={() => setEditingTechnician(null)}
          onUpdated={() => {
            setEditingTechnician(null);
            setToast({ kind: "success", text: "Technician updated successfully." });
            router.refresh();
          }}
        />
      )}

      {viewingTechnician && (
        <TechnicianProfileDrawer
          technician={viewingTechnician}
          onClose={() => setViewingTechnician(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmationModal
          title="Delete Technician"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}
