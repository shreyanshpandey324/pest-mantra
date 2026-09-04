"use client";

import { ui } from "@/lib/ui-classes";

interface DeleteConfirmationModalProps {
  title?: string;
  message?: string;
  isDeleting?: boolean;
  actionLabel?: string;
  pendingActionLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmationModal({
  title = "Delete Technician",
  message = "Are you sure you want to delete this technician? This action cannot be undone.",
  isDeleting = false,
  actionLabel = "Delete",
  pendingActionLabel = "Deleting...",
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pm-modal-backdrop p-4"
      onClick={onCancel}
    >
      <div
        className={`${ui.card} w-full max-w-md p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{title}</h2>

        <p className="mt-3 text-sm text-ink-muted">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className={ui.btnGhost}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting ? pendingActionLabel : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
