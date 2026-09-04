"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ServiceContract,
  CONTRACT_STATUS_LABELS,
  FREQUENCY_LABELS,
} from "@/types/serviceContract";
import { SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);

export default function ServiceContractDetail({
  contract,
}: {
  contract: ServiceContract;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function act(url: string, method = "POST", body?: unknown) {
    setBusy(url);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await response.json();
      if (!response.ok) {
        setMessage(json.message || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setBusy("");
    }
  }

  const usedVisits = contract.visits.filter(
    (visit) => visit.status !== "upcoming",
  ).length;

  const stats: Array<[string, string]> = [
    ["Status", CONTRACT_STATUS_LABELS[contract.status]],
    ["Frequency", FREQUENCY_LABELS[contract.frequency]],
    ["Contract value", money(contract.contractValue)],
    ["Visits", `${usedVisits}/${contract.includedVisits}`],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className={`${ui.card} p-5`} key={label}>
            <p className="text-xs uppercase tracking-wider text-ink-faint">
              {label}
            </p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <div className={`${ui.card} p-6`}>
          <h2 className="text-lg font-semibold">Contract overview</h2>
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-ink-muted">Customer</span>
              <p className="font-medium">{contract.customerName}</p>
              <p>{contract.customerPhone}</p>
            </div>
            <div>
              <span className="text-ink-muted">Service</span>
              <p className="font-medium">
                {SERVICE_TYPE_LABELS[contract.serviceType]}
              </p>
            </div>
            <div>
              <span className="text-ink-muted">Period</span>
              <p>
                {new Date(contract.startDate).toLocaleDateString("en-IN")} →{" "}
                {new Date(contract.endDate).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-ink-muted">Address</span>
              <p>{contract.address}</p>
            </div>
          </div>

          {contract.notes && (
            <p className="mt-5 rounded-xl bg-surface-2 p-4 text-sm text-ink-muted">
              {contract.notes}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {contract.status !== "cancelled" &&
              contract.status !== "expired" && (
                <>
                  <button
                    disabled={Boolean(busy)}
                    className={ui.btnGhost}
                    onClick={() =>
                      act(`/api/service-contracts/${contract._id}/status`, "PATCH", {
                        status: contract.status === "paused" ? "active" : "paused",
                      })
                    }
                  >
                    {contract.status === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    disabled={Boolean(busy)}
                    className={ui.btnGhost}
                    onClick={() =>
                      act(`/api/service-contracts/${contract._id}/status`, "PATCH", {
                        status: "cancelled",
                      })
                    }
                  >
                    Cancel
                  </button>
                </>
              )}

            {contract.renewedTo ? (
              <Link
                className={ui.btnPrimary}
                href={`/dashboard/service-contracts/${contract.renewedTo}`}
              >
                Open renewed contract
              </Link>
            ) : (
              <button
                disabled={Boolean(busy) || contract.status === "cancelled"}
                className={ui.btnPrimary}
                onClick={() =>
                  act(`/api/service-contracts/${contract._id}/renew`)
                }
              >
                {busy.includes("/renew") ? "Renewing…" : "Renew contract"}
              </button>
            )}
          </div>

          {message && <p className="mt-4 text-sm text-danger">{message}</p>}
        </div>

        <div className={`${ui.card} p-6`}>
          <h2 className="text-lg font-semibold">Terms</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm text-ink-muted">
            {contract.terms || "No contract terms recorded."}
          </p>
        </div>
      </div>

      <div className={`${ui.card} overflow-hidden`}>
        <div className="border-b border-border-default p-5">
          <h2 className="text-lg font-semibold">Service visit plan</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Create a real Project/Job from any scheduled AMC visit.
          </p>
        </div>
        <div className="divide-y divide-border-default">
          {contract.visits.map((visit, index) => (
            <div
              key={visit._id}
              className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  Visit {index + 1} ·{" "}
                  {new Date(visit.dueDate).toLocaleDateString("en-IN")}
                </p>
                <p className="text-xs uppercase tracking-wider text-ink-muted">
                  {visit.status.replaceAll("_", " ")}
                </p>
              </div>
              {!visit.projectId ? (
                <button
                  disabled={Boolean(busy) || contract.status !== "active"}
                  className={ui.btnGhostSm}
                  onClick={() =>
                    act(
                      `/api/service-contracts/${contract._id}/visits/${visit._id}/project`,
                    )
                  }
                >
                  Create service job
                </button>
              ) : (
                <Link
                  className={ui.btnGhostSm}
                  href={`/dashboard/projects/${visit.projectId}`}
                >
                  Open project
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
