"use client";

import { useMemo, useState } from "react";
import { Chemical, ChemicalCheckout, UNIT_LABELS } from "@/types/inventory";
import { ui } from "@/lib/ui-classes";
import { AddChemicalModal } from "./AddChemicalModal";
import { IssueChemicalModal } from "./IssueChemicalModal";

interface InventoryBoardProps {
  initialChemicals: Chemical[];
  initialOpenCheckouts: ChemicalCheckout[];
}

export function InventoryBoard({ initialChemicals, initialOpenCheckouts }: InventoryBoardProps) {
  const [chemicals, setChemicals] = useState<Chemical[]>(initialChemicals);
  const [openCheckouts, setOpenCheckouts] = useState<ChemicalCheckout[]>(initialOpenCheckouts);
  const [showAddChemical, setShowAddChemical] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [returnDrafts, setReturnDrafts] = useState<Record<string, string>>({});
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  const chemicalById = useMemo(() => new Map(chemicals.map((c) => [c._id, c])), [chemicals]);
  const lowStockCount = useMemo(
    () => chemicals.filter((c) => c.currentStock <= c.lowStockThreshold).length,
    [chemicals]
  );
  const restockSuggestions = useMemo(
    () => chemicals
      .filter((c) => c.currentStock <= c.lowStockThreshold)
      .map((c) => ({
        chemical: c,
        suggestedQuantity: Math.max(c.lowStockThreshold, Number((c.lowStockThreshold * 2 - c.currentStock).toFixed(2))),
      }))
      .sort((a, b) => (a.chemical.currentStock / Math.max(1, a.chemical.lowStockThreshold)) - (b.chemical.currentStock / Math.max(1, b.chemical.lowStockThreshold))),
    [chemicals],
  );

  function handleChemicalCreated(chemical: Chemical) {
    setChemicals((prev) => [...prev, chemical].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddChemical(false);
  }

  function handleIssued(checkout: ChemicalCheckout) {
    setOpenCheckouts((prev) => [checkout, ...prev]);
    // Reflect the stock decrement immediately rather than waiting
    // for a full page refresh — the backend already applied it
    // atomically; this just keeps the visible number in sync.
    setChemicals((prev) =>
      prev.map((c) =>
        c._id === checkout.chemicalId ? { ...c, currentStock: c.currentStock - checkout.quantityIssued } : c
      )
    );
    setShowIssue(false);
  }

  async function handleReturn(checkout: ChemicalCheckout) {
    setReturnError(null);
    const draft = returnDrafts[checkout._id] ?? "";
    const returnQuantity = draft === "" ? 0 : Number(draft);
    if (Number.isNaN(returnQuantity) || returnQuantity < 0) {
      setReturnError("Enter a return quantity of 0 or more.");
      return;
    }
    if (returnQuantity > checkout.quantityIssued) {
      setReturnError("Cannot return more than was issued.");
      return;
    }

    setReturningId(checkout._id);
    try {
      const res = await fetch(`/api/chemicals/checkout/${checkout._id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnQuantity }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setReturnError(json.message ?? "Could not record this return.");
        setReturningId(null);
        return;
      }
      setOpenCheckouts((prev) => prev.filter((c) => c._id !== checkout._id));
      if (returnQuantity > 0) {
        setChemicals((prev) =>
          prev.map((c) => (c._id === checkout.chemicalId ? { ...c, currentStock: c.currentStock + returnQuantity } : c))
        );
      }
    } catch {
      setReturnError("Unable to reach the server. Please try again.");
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <section aria-label="Summary" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          <div className={`${ui.card} px-5 py-[18px]`}>
            <p className="mb-2 text-[13px] text-ink-muted">Chemicals tracked</p>
            <p className="font-mono text-[26px] font-semibold">{chemicals.length}</p>
          </div>
          <div className={`${ui.card} px-5 py-[18px]`}>
            <p className="mb-2 text-[13px] text-ink-muted">Low stock</p>
            <p className={`font-mono text-[26px] font-semibold ${lowStockCount > 0 ? "text-danger" : ""}`}>
              {lowStockCount}
            </p>
          </div>
          <div className={`${ui.card} px-5 py-[18px]`}>
            <p className="mb-2 text-[13px] text-ink-muted">Currently checked out</p>
            <p className="font-mono text-[26px] font-semibold">{openCheckouts.length}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className={ui.btnGhost} onClick={() => setShowAddChemical(true)}>
            + Add Chemical
          </button>
          <button type="button" className={ui.btnPrimary} onClick={() => setShowIssue(true)}>
            Issue to Technician
          </button>
        </div>
      </section>

      {restockSuggestions.length > 0 ? (
        <section aria-label="Restock intelligence" className={`${ui.card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default bg-warning/5 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-warning">Restock intelligence</p>
              <p className="mt-1 text-sm text-ink-muted">Suggested quantities restore each low-stock chemical to roughly twice its alert level.</p>
            </div>
            <span className={`${ui.badge} border-warning/30 text-warning`}>{restockSuggestions.length} action{restockSuggestions.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {restockSuggestions.map(({ chemical, suggestedQuantity }) => (
              <article key={chemical._id} className="rounded-xl border border-border-default bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{chemical.name}</h3>
                    <p className="mt-1 text-xs text-ink-muted">Current {chemical.currentStock} {UNIT_LABELS[chemical.unit]} · alert at {chemical.lowStockThreshold}</p>
                  </div>
                  <span className="text-xs font-semibold text-danger">LOW</span>
                </div>
                <p className="mt-3 text-xs text-ink-faint">Suggested reorder</p>
                <p className="mt-0.5 font-mono text-lg font-semibold text-ink">+{suggestedQuantity} {UNIT_LABELS[chemical.unit]}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Stock levels">
        <h2 className="mb-3 text-[15px] font-semibold">Stock Levels</h2>
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Chemical</th>
                <th className="px-5 py-3.5 font-medium">Current stock</th>
                <th className="px-5 py-3.5 font-medium">Low-stock alert level</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {chemicals.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink-faint">
                    No chemicals added yet.
                  </td>
                </tr>
              )}
              {chemicals.map((c, i) => {
                const isLow = c.currentStock <= c.lowStockThreshold;
                return (
                  <tr
                    key={c._id}
                    className={`border-b border-border-default last:border-b-0 ${i % 2 === 1 ? "bg-surface-2/40" : ""}`}
                  >
                    <td className="px-5 py-3.5 font-medium">{c.name}</td>
                    <td className="px-5 py-3.5 font-mono">
                      {c.currentStock} {UNIT_LABELS[c.unit]}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink-muted">
                      {c.lowStockThreshold} {UNIT_LABELS[c.unit]}
                    </td>
                    <td className="px-5 py-3.5">
                      {isLow ? (
                        <span className={`${ui.badge} border-danger/40 text-danger`}>LOW STOCK</span>
                      ) : (
                        <span className={ui.badge}>OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Open checkouts">
        <h2 className="mb-3 text-[15px] font-semibold">Currently Checked Out</h2>
        {returnError && <p className={`${ui.errorText} mb-3`}>{returnError}</p>}
        <div className={`${ui.card} overflow-x-auto`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Chemical</th>
                <th className="px-5 py-3.5 font-medium">Quantity issued</th>
                <th className="px-5 py-3.5 font-medium">Issued at</th>
                <th className="px-5 py-3.5 font-medium">Return quantity</th>
                <th className="px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {openCheckouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-faint">
                    Nothing currently checked out.
                  </td>
                </tr>
              )}
              {openCheckouts.map((checkout) => {
                const chemical = chemicalById.get(checkout.chemicalId);
                return (
                  <tr key={checkout._id} className="border-b border-border-default last:border-b-0">
                    <td className="px-5 py-3.5 font-medium">
                      {chemical?.name ?? <span className="font-mono text-xs text-ink-muted">{checkout.chemicalId}</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {checkout.quantityIssued} {chemical ? UNIT_LABELS[chemical.unit] : ""}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">
                      {new Date(checkout.issuedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Return quantity for ${chemical?.name ?? "chemical"}`}
                        className="h-9 w-24 rounded-md border border-border-default bg-surface-2 px-2 text-sm"
                        value={returnDrafts[checkout._id] ?? ""}
                        onChange={(e) => setReturnDrafts((prev) => ({ ...prev, [checkout._id]: e.target.value }))}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        className={ui.btnGhostSm}
                        disabled={returningId === checkout._id}
                        aria-busy={returningId === checkout._id}
                        onClick={() => handleReturn(checkout)}
                      >
                        {returningId === checkout._id ? "Saving…" : "Record Return"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showAddChemical && (
        <AddChemicalModal onClose={() => setShowAddChemical(false)} onCreated={handleChemicalCreated} />
      )}
      {showIssue && (
        <IssueChemicalModal chemicals={chemicals} onClose={() => setShowIssue(false)} onIssued={handleIssued} />
      )}
    </div>
  );
}
