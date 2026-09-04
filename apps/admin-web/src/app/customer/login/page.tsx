import Link from "next/link";
import { CustomerPortalLoginForm } from "@/components/CustomerPortalLoginForm";

export default function CustomerPortalLoginPage() {
  return (
    <main className="min-h-screen bg-[#06100c] px-4 py-10 text-white sm:py-14">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Pest Mantra Customer Portal</div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight">Your pest-control service history, without the phone calls.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">Track jobs, review quotations, check invoice balances, see AMC visits and open verified service reports from one secure dashboard.</p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">{["Jobs & technician status","Quotation decisions","Invoices & balances","AMC & service reports"].map((item)=><div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300"><span className="mr-2 text-emerald-300">✓</span>{item}</div>)}</div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-emerald-400/15 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur">
          <div className="border-b border-white/10 bg-gradient-to-br from-emerald-400/[0.10] to-transparent px-6 py-7 sm:px-8">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-sm font-black text-slate-950">PM</div><div><p className="font-semibold">Pest Mantra</p><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Customer access</p></div></div>
            <h2 className="mt-7 text-2xl font-semibold">Open your service portal</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Enter the same mobile number used for your service and the access code shared by your Pest Mantra office.</p>
          </div>
          <div className="px-6 py-7 sm:px-8"><CustomerPortalLoginForm /></div>
        </section>
      </div>
      <div className="mx-auto mt-5 max-w-5xl text-center text-xs text-slate-600"><Link href="/" className="transition hover:text-slate-300">← Back to Pest Mantra</Link></div>
    </main>
  );
}
