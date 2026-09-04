"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceType, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

type Item = { description: string; quantity: number; rate: number };
export type QuotationPrefill = {
  leadId?: string;
  companyId?: string;
  branchId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  city?: string;
  serviceType?: ServiceType;
  treatmentDescription?: string;
};

const defaultTerms = "Quotation is valid until the stated validity date. Service scope is limited to the treatment described above. Additional work outside the agreed scope may be quoted separately.";

export default function QuotationForm({ prefill }: { prefill?: QuotationPrefill }) {
  const router = useRouter();
  const [form, setForm] = useState({
    customerName: prefill?.customerName ?? "",
    customerPhone: prefill?.customerPhone ?? "",
    customerEmail: prefill?.customerEmail ?? "",
    customerCompany: "",
    address: prefill?.address ?? "",
    city: prefill?.city ?? "",
    serviceType: prefill?.serviceType ?? ServiceType.COCKROACH,
    propertyType: "Residential",
    area: "",
    areaUnit: "sq_ft",
    treatmentDescription: prefill?.treatmentDescription ?? "",
    visitFrequency: "One-time",
    numberOfVisits: "1",
    discount: "0",
    taxRate: "18",
    additionalCharges: "0",
    validUntil: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    terms: defaultTerms,
    internalNotes: "",
  });
  const [items, setItems] = useState<Item[]>([{ description: prefill?.serviceType ? `${SERVICE_TYPE_LABELS[prefill.serviceType]} service` : "Pest control service", quantity: 1, rate: 0 }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const calc = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const discount = Math.min(Number(form.discount) || 0, subtotal);
    const tax = (subtotal - discount) * (Number(form.taxRate) || 0) / 100;
    const total = subtotal - discount + tax + (Number(form.additionalCharges) || 0);
    return { subtotal, discount, tax, total };
  }, [items, form]);

  function set(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId: prefill?.companyId,
          branchId: prefill?.branchId,
          leadId: prefill?.leadId,
          area: form.area ? Number(form.area) : undefined,
          numberOfVisits: Number(form.numberOfVisits) || 1,
          discount: Number(form.discount) || 0,
          taxRate: Number(form.taxRate) || 0,
          additionalCharges: Number(form.additionalCharges) || 0,
          items,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not create quotation");
      router.push(`/dashboard/quotations/${json.data.quotation._id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create quotation"); setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
    <div className="space-y-5">
      {prefill?.leadId ? <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"><b>Lead-linked quotation:</b> Customer and service details were prefilled from CRM. Review scope and enter real pricing before sending.</div> : null}
      {[["Customer & site", [["customerName", "Customer name"], ["customerPhone", "Phone"], ["customerEmail", "Email"], ["customerCompany", "Company / business"], ["address", "Service address"], ["city", "City"]]], ["Treatment scope", [["propertyType", "Property type"], ["area", "Area / size"], ["visitFrequency", "Visit frequency"], ["numberOfVisits", "Number of visits"], ["treatmentDescription", "Treatment description"]]]].map(([title, fields]: any) => <section className={`${ui.card} p-6`} key={title}><h2 className="text-lg font-semibold">{title}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{fields.map(([key, label]: string[]) => <label className={key === "address" || key === "treatmentDescription" ? "md:col-span-2" : ""} key={key}><span className={ui.label}>{label}</span>{key === "treatmentDescription" ? <textarea className={`${ui.input} mt-1 h-28 py-3`} value={(form as any)[key]} onChange={(e) => set(key as keyof typeof form, e.target.value)} /> : <input className={`${ui.input} mt-1`} type={["area", "numberOfVisits"].includes(key) ? "number" : "text"} value={(form as any)[key]} onChange={(e) => set(key as keyof typeof form, e.target.value)} required={["customerName", "customerPhone", "address"].includes(key)} />}</label>)}</div><label className="mt-4 block"><span className={ui.label}>Service type</span><select className={`${ui.input} mt-1`} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)}>{Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>)}
      <section className={`${ui.card} p-6`}><div className="flex justify-between"><div><h2 className="text-lg font-semibold">Pricing</h2><p className="text-sm text-ink-muted">Itemised pricing calculated automatically.</p></div><button type="button" className={ui.btnGhostSm} onClick={() => setItems((current) => [...current, { description: "", quantity: 1, rate: 0 }])}>+ Line item</button></div><div className="mt-5 space-y-3">{items.map((item, index) => <div className="grid gap-2 md:grid-cols-[1fr_90px_130px_40px]" key={index}><input className={ui.input} placeholder="Service description" value={item.description} onChange={(e) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, description: e.target.value } : row))} /><input className={ui.input} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(e.target.value) } : row))} /><input className={ui.input} type="number" min="0" step="0.01" value={item.rate} onChange={(e) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, rate: Number(e.target.value) } : row))} /><button type="button" className="text-danger" onClick={() => items.length > 1 && setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button></div>)}</div></section>
      <section className={`${ui.card} p-6`}><h2 className="text-lg font-semibold">Terms & internal notes</h2><textarea className={`${ui.input} mt-4 h-32 py-3`} value={form.terms} onChange={(e) => set("terms", e.target.value)} /><textarea className={`${ui.input} mt-3 h-24 py-3`} placeholder="Internal notes (not for customer print)" value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} /></section>
    </div>
    <aside><div className={`${ui.card} sticky top-6 p-6`}><p className="text-xs uppercase tracking-wider text-accent">Quote summary</p><label className="mt-4 block"><span className={ui.label}>Valid until</span><input className={`${ui.input} mt-1`} type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></label>{[["Discount ₹", "discount"], ["GST / Tax %", "taxRate"], ["Additional charges ₹", "additionalCharges"]].map(([label, key]) => <label className="mt-3 block" key={key}><span className={ui.label}>{label}</span><input className={`${ui.input} mt-1`} type="number" min="0" value={(form as any)[key]} onChange={(e) => set(key as keyof typeof form, e.target.value)} /></label>)}<div className="mt-6 space-y-2 border-t border-border-default pt-5 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{calc.subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span>Discount</span><span>-₹{calc.discount.toFixed(2)}</span></div><div className="flex justify-between"><span>Tax</span><span>₹{calc.tax.toFixed(2)}</span></div><div className="flex justify-between border-t border-border-default pt-3 text-lg font-semibold"><span>Total</span><span className="text-accent">₹{calc.total.toFixed(2)}</span></div></div>{error ? <p className={`${ui.errorText} mt-4`}>{error}</p> : null}<button className={`${ui.btnPrimary} mt-6 w-full`} disabled={busy}>{busy ? "Creating…" : "Create quotation"}</button></div></aside>
  </form>;
}
