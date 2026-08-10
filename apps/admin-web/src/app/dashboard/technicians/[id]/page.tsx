"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EditTechnicianModal } from "@/components/EditTechnicianModal";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { ui } from "@/lib/ui-classes";
import { EditTechnicianFormData, TechnicianListItem } from "@/types/project";

interface TechnicianProfilePageProps {
  params: Promise<{ id: string }>;
}

type TechnicianProfileData = Omit<TechnicianListItem, "email"> & {
  email?: string | null;
  branch: {
    id: string;
    name: string;
    city: string;
    state: string;
    isActive: boolean;
  } | null;
  createdAt: string;
  stats: {
    todayAssignedJobs: number;
    totalCompletedJobs: number;
  };
};

interface TechnicianProfileApiResponse {
  technician: TechnicianProfileData;
}

type Toast = { kind: "success" | "error"; text: string } | null;

function formatDutyStatus(value: string): string {
  switch (value) {
    case "off_duty":
      return "Off Duty";
    case "on_duty_idle":
      return "On Duty";
    case "en_route":
      return "En Route";
    case "on_site":
      return "On Site";
    case "busy":
      return "Busy";
    default:
      return value;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TechnicianProfilePage({ params }: TechnicianProfilePageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [technician, setTechnician] = useState<TechnicianProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<EditTechnicianFormData | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolvedParams = await params;
      if (!cancelled) {
        setId(resolvedParams.id);
      }
    }

    void resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadTechnician() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/technicians/${id}`, {
          credentials: "same-origin",
          cache: "no-store",
        });

        const json = (await response.json()) as {
          success?: boolean;
          message?: string;
          data?: TechnicianProfileApiResponse;
        };

        if (!response.ok || !json.success) {
          throw new Error(json.message ?? "Could not load technician profile.");
        }

        if (!cancelled) {
          setTechnician(json.data?.technician ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load technician profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTechnician();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleConfirmDelete() {
    if (!technician) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/users/${technician.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Unable to delete technician.");
      }

      router.push("/dashboard/technicians");
    } catch (err) {
      setToast({
        kind: "error",
        text: err instanceof Error ? err.message : "Unable to connect to server.",
      });
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/dashboard/technicians" className="mb-5 inline-block text-sm text-ink-muted hover:underline">
          ← Back to Technicians
        </Link>
        <div className={`${ui.card} flex items-center gap-3 p-6`}>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent"
            aria-hidden="true"
          />
          <p className="text-sm text-ink-muted">Loading technician profile…</p>
        </div>
      </div>
    );
  }

  if (error || !technician) {
    return (
      <div>
        <Link href="/dashboard/technicians" className="mb-5 inline-block text-sm text-ink-muted hover:underline">
          ← Back to Technicians
        </Link>
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          ⚠ {error ?? "Technician not found."}
        </div>
      </div>
    );
  }

  const editFormData: EditTechnicianFormData = {
    id: technician.id,
    name: technician.name,
    phone: technician.phone,
    email: technician.email ?? undefined,
    branchId: technician.branch?.id,
    employeeCode: technician.employeeCode,
    vehicleNumber: technician.vehicleNumber,
    skills: technician.skills,
    isActive: technician.isActive,
    dutyStatus: technician.dutyStatus,
  };

  return (
    <div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-6 z-[70] rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger shadow-2xl"
        >
          {toast.text}
        </div>
      )}

      <Link href="/dashboard/technicians" className="mb-5 inline-block text-sm text-ink-muted hover:underline">
        ← Back to Technicians
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">{technician.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border-default bg-surface-2 px-3 py-1 text-xs font-medium text-ink-muted">
              {technician.employeeCode}
            </span>
            <span className={`${ui.badge}`}>{formatDutyStatus(technician.dutyStatus)}</span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                technician.isActive
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {technician.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className={`${ui.card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Technician Information</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Phone</dt>
              <dd className="font-mono">{technician.phone}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Email</dt>
              <dd>{technician.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Branch</dt>
              <dd>{technician.branch ? `${technician.branch.name} • ${technician.branch.city}` : "—"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Created Date</dt>
              <dd>{formatDate(technician.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className={`${ui.card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Performance Statistics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border-default bg-surface-2 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Today&apos;s Assigned</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{technician.stats.todayAssignedJobs}</p>
            </div>
            <div className="rounded-xl border border-border-default bg-surface-2 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Completed</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{technician.stats.totalCompletedJobs}</p>
            </div>
          </div>
        </div>

        <div className={`${ui.card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Actions</h2>
          <div className="flex flex-col gap-3">
            <button className={ui.btnPrimary} type="button" onClick={() => setEditingTechnician(editFormData)}>
              Edit Technician
            </button>
            <button className={ui.btnGhost} type="button" onClick={() => setConfirmingDelete(true)}>
              Delete Technician
            </button>
          </div>
        </div>
      </div>

      {editingTechnician && (
        <EditTechnicianModal
          technician={editingTechnician}
          onClose={() => setEditingTechnician(null)}
          onUpdated={() => {
            setEditingTechnician(null);
            setLoading(true);
            void fetch(`/api/technicians/${id}`, {
              credentials: "same-origin",
              cache: "no-store",
            })
              .then((response) => response.json())
              .then((json) => {
                if (json?.success) {
                  setTechnician(json.data?.technician ?? null);
                }
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        />
      )}

      {confirmingDelete && (
        <DeleteConfirmationModal
          title="Delete Technician"
          message={`Are you sure you want to delete "${technician.name}"? This action cannot be undone.`}
          isDeleting={isDeleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
