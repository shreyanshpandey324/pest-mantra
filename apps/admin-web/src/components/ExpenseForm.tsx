"use client";

import { FormEvent, useMemo, useState } from "react";
import { Expense, ExpenseCategory, ExpensePaymentMethod, EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHOD_LABELS } from "@/types/expense";
import { Project, TechnicianListItem, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

function projectIdOf(value?: string | { _id: string }) { return typeof value === "string" ? value : value?._id ?? ""; }
function technicianIdOf(value?: string | { _id?: string; id?: string }) { return typeof value === "string" ? value : value?._id ?? value?.id ?? ""; }

export function ExpenseForm({ projects, technicians, expense, onDone, onCancel }: {
  projects: Project[];
  technicians: TechnicianListItem[];
  expense?: Expense | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(expense);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "fuel");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(expense?.description ?? "");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod | "">(expense?.paymentMethod ?? "");
  const [paymentReference, setPaymentReference] = useState(expense?.paymentReference ?? "");
  const [projectId, setProjectId] = useState(projectIdOf(expense?.projectId as string | { _id: string } | undefined));
  const [technicianId, setTechnicianId] = useState(technicianIdOf(expense?.technicianId as string | { _id?: string; id?: string } | undefined));
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedProject = useMemo(() => projects.find(p => p._id === projectId), [projects, projectId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError("Enter a valid expense amount greater than zero."); return; }
    if (description.trim().length < 2) { setError("Add a short description for this expense."); return; }
    setBusy(true);
    try {
      const payload = {
        category,
        amount: numericAmount,
        expenseDate,
        description: description.trim(),
        vendor: vendor.trim() || undefined,
        paymentMethod: paymentMethod || undefined,
        paymentReference: paymentReference.trim() || undefined,
        projectId: projectId || undefined,
        technicianId: technicianId || undefined,
        notes: notes.trim() || undefined,
      };
      const response = await fetch(editing ? `/api/expenses/${expense!._id}` : "/api/expenses", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Expense could not be saved");
      const saved: Expense = json.data.expense;
      if (receipt) {
        const form = new FormData(); form.append("receipt", receipt);
        const upload = await fetch(`/api/expenses/${saved._id}/receipt`, { method: "POST", body: form });
        if (!upload.ok) {
          let message = "Expense saved, but receipt upload failed.";
          try { const body = await upload.json(); message = body.message || message; } catch { /* ignore */ }
          throw new Error(message);
        }
      }
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Expense could not be saved"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5">
    {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

    <div className="grid gap-4 md:grid-cols-2">
      <label className={ui.label}>Category
        <select className={`${ui.input} mt-1.5`} value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className={ui.label}>Amount (₹)
        <input className={`${ui.input} mt-1.5`} type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      </label>
      <label className={ui.label}>Expense date
        <input className={`${ui.input} mt-1.5`} type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
      </label>
      <label className={ui.label}>Vendor / merchant
        <input className={`${ui.input} mt-1.5`} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Petrol pump, supplier, vendor…" />
      </label>
    </div>

    <label className={ui.label}>Description
      <input className={`${ui.input} mt-1.5`} required value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this expense for?" />
    </label>

    <div className="grid gap-4 md:grid-cols-2">
      <label className={ui.label}>Link to project <span className="text-ink-faint">(optional)</span>
        <select className={`${ui.input} mt-1.5`} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">General / not project-linked</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.projectCode} · {p.customerName} · {SERVICE_TYPE_LABELS[p.serviceType]}</option>)}
        </select>
      </label>
      <label className={ui.label}>Technician / claimant <span className="text-ink-faint">(optional)</span>
        <select className={`${ui.input} mt-1.5`} value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
          <option value="">No technician linked</option>
          {technicians.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name} · {t.phone}</option>)}
        </select>
      </label>
    </div>

    {selectedProject ? <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-ink-muted">
      This cost will be included in <b className="text-ink">{selectedProject.projectCode}</b> profitability for {SERVICE_TYPE_LABELS[selectedProject.serviceType]}.
    </div> : null}

    <div className="grid gap-4 md:grid-cols-2">
      <label className={ui.label}>Payment method <span className="text-ink-faint">(optional)</span>
        <select className={`${ui.input} mt-1.5`} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as ExpensePaymentMethod | "")}>
          <option value="">Not recorded yet</option>
          {Object.entries(EXPENSE_PAYMENT_METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className={ui.label}>Reference / UTR / cheque no.
        <input className={`${ui.input} mt-1.5`} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Optional payment reference" />
      </label>
    </div>

    <label className={ui.label}>Internal notes
      <textarea className="mt-1.5 min-h-24 w-full rounded-lg border border-border-default bg-surface-2 px-3.5 py-3 text-sm text-ink outline-none focus:border-accent" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Approval context, reimbursement notes, etc." />
    </label>

    <label className={ui.label}>Receipt image <span className="text-ink-faint">(JPEG / PNG / WEBP, max 8MB)</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1.5 block w-full rounded-lg border border-dashed border-border-strong bg-surface-2 px-3 py-3 text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-semibold file:text-accent-ink" onChange={e => setReceipt(e.target.files?.[0] ?? null)} />
    </label>

    <div className="flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
      <button type="button" className={ui.btnGhost} onClick={onCancel} disabled={busy}>Cancel</button>
      <button type="submit" className={ui.btnPrimary} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create expense"}</button>
    </div>
  </form>;
}
