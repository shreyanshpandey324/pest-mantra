"use client";

import { TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface TechnicianProfileDrawerProps {
  technician: TechnicianListItem | null;
  onClose: () => void;
}

const DUTY_COLORS: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "bg-gray-500",
  on_duty_idle: "bg-green-500",
  en_route: "bg-blue-500",
  on_site: "bg-indigo-500",
  busy: "bg-yellow-500",
};

const DUTY_LABELS: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "Off Duty",
  on_duty_idle: "On Duty",
  en_route: "En Route",
  on_site: "On Site",
  busy: "Busy",
};

export function TechnicianProfileDrawer({
  technician,
  onClose,
}: TechnicianProfileDrawerProps) {
  if (!technician) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full max-w-md overflow-y-auto bg-surface shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border-default bg-surface p-6">
          <h2 className="text-xl font-semibold">
            Technician Profile
          </h2>

          <button
            onClick={onClose}
            className={ui.btnGhostSm}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-3xl font-bold text-white">
              {technician.name.charAt(0).toUpperCase()}
            </div>

            <h3 className="mt-4 text-xl font-semibold">
              {technician.name}
            </h3>

            <p className="text-sm text-ink-muted">
              {technician.employeeCode}
            </p>
          </div>

          <div className={`${ui.card} p-4`}>
            <h4 className="mb-4 font-semibold">
              Contact
            </h4>

            <p><strong>Phone:</strong> {technician.phone}</p>
            <p><strong>Email:</strong> {technician.email || "-"}</p>
          </div>

          <div className={`${ui.card} p-4`}>
            <h4 className="mb-4 font-semibold">
              Work Information
            </h4>

            <p><strong>Branch:</strong> {technician.branchId || "-"}</p>
            <p><strong>Vehicle:</strong> {technician.vehicleNumber || "-"}</p>

            <div className="mt-3">
              <p className="mb-2 font-medium">Skills</p>

              <div className="flex flex-wrap gap-2">
                {technician.skills.length === 0
                  ? "-"
                  : technician.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-accent/10 px-3 py-1 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${DUTY_COLORS[technician.dutyStatus]}`}
              />

              <span>
                {DUTY_LABELS[technician.dutyStatus]}
              </span>
            </div>

            <div className="mt-4">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  technician.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {technician.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}