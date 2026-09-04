"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, UserRole } from "@/types/auth";
import { LeadAssignee, LEAD_PRIORITY_LABELS, LEAD_SOURCE_LABELS, LeadPriority, LeadSource } from "@/types/lead";
import { ServiceType, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

type Company = { _id: string; name: string; status?: string };
type Branch = { _id: string; name: string; city?: string; companyId?: string };

export default function LeadForm({ user }: { user: AuthUser }) {
  const router = useRouter();
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    serviceType: ServiceType.COCKROACH,
    source: "call" as LeadSource,
    sourceDetail: "",
    priority: "warm" as LeadPriority,
    assignedTo: user._id,
    followUpAt: "",
    siteVisitAt: "",
    notes: "",
    companyId: user.companyId ?? "",
    branchId: user.branchId ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function loadAssignees(companyId = form.companyId, branchId = form.branchId) {
    const params = new URLSearchParams();
    if (companyId) params.set("companyId", companyId);
    if (branchId) params.set("branchId", branchId);
    const response = await fetch(`/api/leads/assignees${params.size ? `?${params}` : ""}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || "Could not load assignees");
    setAssignees(json.data.assignees);
    if (!json.data.assignees.some((item: LeadAssignee) => item._id === form.assignedTo)) {
      const preferred = json.data.assignees.find((item: LeadAssignee) => item._id === user._id) ?? json.data.assignees[0];
      if (preferred) set("assignedTo", preferred._id);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        if (isSuperAdmin) {
          const response = await fetch("/api/companies", { cache: "no-store" });
          const json = await response.json();
          if (!response.ok || !json.success) throw new Error(json.message || "Could not load companies");
          if (cancelled) return;
          setCompanies(json.data.companies ?? []);
        } else {
          await loadAssignees();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not prepare lead form");
      }
    }
    void boot();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSuperAdmin || !form.companyId) { setBranches([]); return; }
    let cancelled = false;
    async function run() {
      try {
        const response = await fetch(`/api/companies/branches?companyId=${encodeURIComponent(form.companyId)}`, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.message || "Could not load branches");
        if (cancelled) return;
        const next = json.data.branches ?? [];
        setBranches(next);
        if (!next.some((branch: Branch) => branch._id === form.branchId)) set("branchId", "");
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load branches"); }
    }
    void run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.companyId, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !form.companyId || !form.branchId) return;
    void loadAssignees(form.companyId, form.branchId).catch((e) => setError(e instanceof Error ? e.message : "Could not load assignees"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchId, isSuperAdmin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = {
        ...form,
        customerEmail: form.customerEmail || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        sourceDetail: form.sourceDetail || undefined,
        assignedTo: form.assignedTo || undefined,
        followUpAt: form.followUpAt || undefined,
        siteVisitAt: form.siteVisitAt || undefined,
        notes: form.notes || undefined,
        companyId: isSuperAdmin ? form.companyId : undefined,
        branchId: isSuperAdmin ? form.branchId : undefined,
      };
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not create lead");
      router.push(`/dashboard/leads/${json.data.lead._id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create lead");
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-5">
      <section className={`${ui.card} p-6`}>
        <div className="flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Lead identity</p><h2 className="mt-1 text-lg font-semibold">Customer & opportunity</h2></div><span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">NEW</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label><span className={ui.label}>Customer name *</span><input className={`${ui.input} mt-1`} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required /></label>
          <label><span className={ui.label}>Phone *</span><input className={`${ui.input} mt-1`} inputMode="numeric" maxLength={10} value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value.replace(/\D/g, "").slice(0, 10))} required /></label>
          <label><span className={ui.label}>Email</span><input type="email" className={`${ui.input} mt-1`} value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} /></label>
          <label><span className={ui.label}>City</span><input className={`${ui.input} mt-1`} value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
          <label className="md:col-span-2"><span className={ui.label}>Site / service address</span><textarea className={`${ui.input} mt-1 h-24 py-3`} value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
          <label><span className={ui.label}>Interested service *</span><select className={`${ui.input} mt-1`} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value as ServiceType)}>{Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className={ui.label}>Lead source *</span><select className={`${ui.input} mt-1`} value={form.source} onChange={(e) => set("source", e.target.value as LeadSource)}>{Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="md:col-span-2"><span className={ui.label}>Source detail</span><input className={`${ui.input} mt-1`} placeholder="Referral name, campaign, website page, etc." value={form.sourceDetail} onChange={(e) => set("sourceDetail", e.target.value)} /></label>
        </div>
      </section>

      <section className={`${ui.card} p-6`}>
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Next action</p><h2 className="mt-1 text-lg font-semibold">Follow-up planning</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label><span className={ui.label}>Next follow-up</span><input type="datetime-local" className={`${ui.input} mt-1`} value={form.followUpAt} onChange={(e) => set("followUpAt", e.target.value)} /></label>
          <label><span className={ui.label}>Site visit</span><input type="datetime-local" className={`${ui.input} mt-1`} value={form.siteVisitAt} onChange={(e) => set("siteVisitAt", e.target.value)} /></label>
          <label className="md:col-span-2"><span className={ui.label}>Internal sales notes</span><textarea className={`${ui.input} mt-1 h-28 py-3`} placeholder="Customer requirement, preferred timing, budget signals, next step…" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label>
        </div>
      </section>
    </div>

    <aside><div className={`${ui.card} sticky top-6 p-6`}>
      <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Ownership</p><h2 className="mt-1 text-lg font-semibold">Sales routing</h2>
      <label className="mt-5 block"><span className={ui.label}>Priority</span><select className={`${ui.input} mt-1`} value={form.priority} onChange={(e) => set("priority", e.target.value as LeadPriority)}>{Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {isSuperAdmin ? <>
        <label className="mt-3 block"><span className={ui.label}>Company *</span><select className={`${ui.input} mt-1`} value={form.companyId} onChange={(e) => { set("companyId", e.target.value); set("branchId", ""); }} required><option value="">Select company</option>{companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}</select></label>
        <label className="mt-3 block"><span className={ui.label}>Branch *</span><select className={`${ui.input} mt-1`} value={form.branchId} onChange={(e) => set("branchId", e.target.value)} disabled={!form.companyId} required><option value="">Select branch</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}{branch.city ? ` · ${branch.city}` : ""}</option>)}</select></label>
      </> : null}
      <label className="mt-3 block"><span className={ui.label}>Assigned admin</span><select className={`${ui.input} mt-1`} value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>{assignees.length ? assignees.map((assignee) => <option key={assignee._id} value={assignee._id}>{assignee.name}{assignee.role === "super_admin" ? " · Super Admin" : ""}</option>) : <option value={user._id}>{user.name}</option>}</select></label>
      <div className="mt-5 rounded-xl border border-border-default bg-surface-2 p-4 text-xs leading-5 text-ink-muted"><b className="text-ink">CRM tip:</b> Set a follow-up before saving so new enquiries do not disappear from the sales queue.</div>
      {error ? <p className={`${ui.errorText} mt-4`}>{error}</p> : null}
      <button className={`${ui.btnPrimary} mt-6 w-full`} disabled={busy || (isSuperAdmin && (!form.companyId || !form.branchId))}>{busy ? "Creating lead…" : "Create lead"}</button>
    </div></aside>
  </form>;
}
