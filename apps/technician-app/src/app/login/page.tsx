import { OtpLoginForm } from "@/components/OtpLoginForm";
import { DemoLoginButton } from "@/components/DemoLoginButton";
import { ui } from "@/lib/ui-classes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo && params.redirectTo.startsWith("/") ? params.redirectTo : "/jobs";
  const notAuthorized = params.error === "not_authorized";
  const demoMode = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-dvh bg-[#eef6f2]">
      <section className="relative overflow-hidden bg-[#17233f] px-6 pb-20 pt-8 text-white">
        <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
        <div className="pointer-events-none absolute -right-24 top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-10 top-28 h-40 w-40 rounded-full bg-accent/15" />
        <div className="mx-auto max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-base font-bold text-accent-ink">PM</div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Pest Mantra Field App</p>
          <h1 className="mt-2 text-3xl font-semibold">Your workday, one job at a time.</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">Sign in, see the next job, navigate, complete service proof and move on.</p>
        </div>
      </section>

      <section className="relative mx-auto -mt-10 max-w-md px-4 pb-10">
        <div className={`${ui.card} p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)]`}>
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Technician Login</p>
            <h2 className="mt-1.5 text-2xl font-semibold">Continue to today&apos;s jobs</h2>
            <p className="mt-2 text-sm text-ink-muted">{demoMode ? "Demo access is unlocked for company testing." : "Use the approved mobile number assigned to your technician account."}</p>
          </div>

          {notAuthorized ? (
            <div role="alert" className="mb-[18px] rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
              That account does not have technician-app access. Office staff should use the Admin Console.
            </div>
          ) : null}

          {demoMode ? <DemoLoginButton redirectTo={redirectTo} /> : <OtpLoginForm redirectTo={redirectTo} />}
        </div>
      </section>
    </main>
  );
}
