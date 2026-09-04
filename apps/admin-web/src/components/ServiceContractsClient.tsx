"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ServiceContract,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
  FREQUENCY_LABELS,
} from "@/types/serviceContract";
import { SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ServiceContractsClient({
  initial,
}: {
  initial: ServiceContract[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ContractStatus | "all">("all");

  const rows = useMemo(
    () =>
      initial.filter(
        (contract) =>
          (status === "all" || contract.status === status) &&
          (!query ||
            `${contract.contractNumber} ${contract.customerName} ${contract.customerPhone}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [initial, query, status],
  );

  const active = initial.filter((contract) => contract.status === "active");
  const expiring = active.filter(
    (contract) =>
      new Date(contract.endDate).getTime() - Date.now() < 30 * 86_400_000,
  );
  const upcoming = active
    .flatMap((contract) => contract.visits)
    .filter(
      (visit) =>
        visit.status === "upcoming" && new Date(visit.dueDate) >= new Date(),
    ).length;

  const stats: Array<[string, string | number]> = [
    ["Active contracts", active.length],
    ["Contract value", money(active.reduce((sum, item) => sum + item.contractValue, 0))],
    ["Upcoming visits", upcoming],
    ["Expiring ≤30 days", expiring.length],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className={`${ui.card} p-5`} key={label}>
            <p className="text-xs uppercase tracking-[.16em] text-ink-faint">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className={`${ui.card} p-4`}>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className={ui.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contract, customer or phone…"
          />
          <select
            className={ui.input}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ContractStatus | "all")
            }
          >
            <option value="all">All statuses</option>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <Link
            className={`${ui.btnPrimary} shrink-0`}
            href="/dashboard/service-contracts/new"
          >
            + New contract
          </Link>
        </div>
      </div>

      <div className={`${ui.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-ink-faint">
              <tr>
                {[
                  "Contract",
                  "Customer",
                  "Service",
                  "Frequency",
                  "Value",
                  "Visits",
                  "Ends",
                  "Status",
                  "",
                ].map((heading) => (
                  <th className="px-5 py-4" key={heading}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {rows.map((contract) => (
                <tr key={contract._id} className="hover:bg-surface-2/50">
                  <td className="px-5 py-4 font-mono text-accent">
                    {contract.contractNumber}
                  </td>
                  <td className="px-5 py-4">
                    <b>{contract.customerName}</b>
                    <div className="text-xs text-ink-muted">
                      {contract.customerPhone}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {SERVICE_TYPE_LABELS[contract.serviceType]}
                  </td>
                  <td className="px-5 py-4">
                    {FREQUENCY_LABELS[contract.frequency]}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {money(contract.contractValue)}
                  </td>
                  <td className="px-5 py-4">
                    {
                      contract.visits.filter(
                        (visit) => visit.status !== "upcoming",
                      ).length
                    }
                    /{contract.includedVisits}
                  </td>
                  <td className="px-5 py-4 text-ink-muted">
                    {new Date(contract.endDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-border-default bg-surface-2 px-2.5 py-1 text-xs">
                      {CONTRACT_STATUS_LABELS[contract.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className={ui.btnGhostSm}
                      href={`/dashboard/service-contracts/${contract._id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-14 text-center text-ink-muted"
                  >
                    No service contracts match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
