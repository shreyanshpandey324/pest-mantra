"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-classes";
import { EditTechnicianFormData, TechnicianListItem } from "@/types/project";
import { AddTechnicianModal } from "./AddTechnicianModal";
import { EditTechnicianModal } from "./EditTechnicianModal";

interface TechniciansClientProps {
  technicians: TechnicianListItem[];
  loadError?: string | null;
}

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<EditTechnicianFormData | null>(null);

  const AddTechnicianModalComponent =
    AddTechnicianModal as unknown as ComponentType<{
      onClose: () => void;
      onCreated: () => void;
    }>;

  async function deleteTechnician(
    id: string,
    name: string
  ) {
    const confirmed = window.confirm(
      `Delete technician "${name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        alert(
          json.message ??
            "Unable to delete technician."
        );
        return;
      }

      alert("Technician deleted successfully.");

      router.refresh();
    } catch {
      alert("Unable to connect to server.");
    }
  }

  const filteredTechnicians = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return technicians;

    return technicians.filter((tech) => {
      return (
        tech.name.toLowerCase().includes(value) ||
        tech.phone.includes(value) ||
        tech.employeeCode
          .toLowerCase()
          .includes(value)
      );
    });
  }, [search, technicians]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold">
            Technicians
          </h1>

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
        <p className={ui.errorText}>
          {loadError}
        </p>
      </div>
    )}

    <div className="mb-6">
      <input
        className={ui.input}
        placeholder="Search by name, phone or employee code..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />
    </div>

    <div className={`${ui.card} overflow-x-auto`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-default text-left text-xs text-ink-muted">
            <th className="px-5 py-3.5 font-medium">
              Name
            </th>

            <th className="px-5 py-3.5 font-medium">
              Employee Code
            </th>

            <th className="px-5 py-3.5 font-medium">
              Phone
            </th>

            <th className="px-5 py-3.5 font-medium">
              Duty Status
            </th>

            <th className="px-5 py-3.5 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredTechnicians.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-5 py-10 text-center text-ink-faint"
              >
                No technicians found.
              </td>
            </tr>
          )}

          {filteredTechnicians.map((tech) => (
            <tr
              key={tech.id}
              className="border-b border-border-default last:border-b-0"
            >
              <td className="px-5 py-4 font-medium">
                {tech.name}
              </td>

              <td className="px-5 py-4 font-mono text-xs text-ink-muted">
                {tech.employeeCode}
              </td>

              <td className="px-5 py-4">
                {tech.phone}
              </td>

              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${DUTY_DOT[tech.dutyStatus]}`}
                  />

                  {DUTY_LABELS[tech.dutyStatus]}
                </span>
              </td>

              <td className="px-5 py-4 text-right">
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
                  onClick={() =>
                    deleteTechnician(
                      tech.id,
                      tech.name
                    )
                  }
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
          router.refresh();
        }}
      />
    )}
    </>
  );
}