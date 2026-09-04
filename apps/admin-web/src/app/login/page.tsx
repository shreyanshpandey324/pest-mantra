import { LoginForm } from "@/components/LoginForm";
import { ui } from "@/lib/ui-classes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string; passwordChanged?: string }>;
}

const BENEFITS = [
  ["◎", "Lead & Follow-up Management", "Never lose a sales follow-up."],
  ["₹", "Quotation, Invoice & Payment", "From estimate to collection in one flow."],
  ["↻", "AMC & Renewal Tracking", "Keep recurring services and renewals visible."],
  ["⌖", "Technician & Field Operations", "Dispatch, tracking and proof of service."],
  ["!", "Complaints & Service Control", "SLA, exceptions and action queues."],
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo && params.redirectTo.startsWith("/") ? params.redirectTo : "/dashboard";
  const notAuthorized = params.error === "not_authorized";
  const passwordChanged = params.passwordChanged === "1";

  return (
    <main className="login-page min-h-dvh bg-[#edf3f0] p-2.5 sm:p-4 lg:p-5">
      <div className="login-shell mx-auto grid min-h-[calc(100dvh-1.25rem)] max-w-[1480px] overflow-hidden rounded-[30px] border border-[#d6e2dc] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:min-h-[calc(100dvh-2rem)] lg:grid-cols-[1.16fr_.84fr]">
        <section className="login-visual relative hidden overflow-hidden bg-[#14213d] px-9 py-8 text-white lg:flex lg:flex-col xl:px-14 xl:py-10">
          <div className="login-ambient pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_55%,rgba(30,165,106,.22),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(59,130,246,.13),transparent_30%)]" />
          <div className="pointer-events-none absolute -left-52 top-20 h-[620px] w-[620px] rounded-full border border-white/[0.055]" />
          <div className="pointer-events-none absolute -left-32 top-40 h-[450px] w-[450px] rounded-full border border-accent/20" />
          <div className="pointer-events-none absolute bottom-20 right-10 h-44 w-44 rounded-full border border-white/[0.045]" />
          <div className="login-glow-dot pointer-events-none absolute left-[11%] top-[47%] h-2 w-2 rounded-full bg-accent shadow-[0_0_34px_12px_rgba(30,165,106,.32)]" />

          <header className="login-brand relative z-10 mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3.5">
              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[19px] border border-white/10 bg-accent text-[19px] font-extrabold tracking-[-0.02em] text-accent-ink shadow-[0_14px_36px_rgba(30,165,106,.24)]">PM</div>
              <div className="text-left">
                <p className="text-[28px] font-extrabold leading-none tracking-[0.035em] text-white">PEST MANTRA</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.29em] text-white/48">Field Service Management</p>
              </div>
            </div>
            <div className="login-tagline mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/90">
              <span className="h-px w-11 bg-gradient-to-r from-transparent to-accent/55" />
              Smarter pest-control operations
              <span className="h-px w-11 bg-gradient-to-l from-transparent to-accent/55" />
            </div>
          </header>

          <div className="login-hero relative z-10 my-auto mx-auto w-full max-w-[620px] py-6 text-center">
            <h1 className="login-title mx-auto max-w-[570px] text-[40px] font-semibold leading-[1.07] tracking-[-0.03em] xl:text-[46px]">
              Track, manage and grow your service business.
            </h1>
            <p className="login-subcopy mx-auto mt-4 max-w-[540px] text-sm leading-6 text-white/60">
              One operational workspace for office teams, field technicians, customers, collections and recurring service.
            </p>

            <div className="login-benefit-list mx-auto mt-7 grid max-w-[580px] gap-2.5 text-left">
              {BENEFITS.map(([icon, title, detail]) => (
                <div
                  key={title}
                  className="login-benefit group flex items-center gap-3 rounded-[17px] border border-white/[0.075] bg-white/[0.045] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-sm transition hover:border-accent/25 hover:bg-white/[0.06]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.065] text-sm font-bold text-accent" aria-hidden="true">{icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-white/94">{title}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-white/46">{detail}</span>
                  </span>
                  <span className="ml-auto text-xs text-white/18 transition group-hover:translate-x-0.5 group-hover:text-accent/65" aria-hidden="true">→</span>
                </div>
              ))}
            </div>
          </div>

          <div className="login-proof relative z-10 mx-auto flex w-full max-w-[620px] items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
            <span>CRM</span><span className="h-1 w-1 rounded-full bg-accent/55" /><span>Operations</span><span className="h-1 w-1 rounded-full bg-accent/55" /><span>Field Service</span>
          </div>
        </section>

        <section className="login-auth-panel relative flex items-center justify-center bg-[radial-gradient(circle_at_100%_0%,rgba(30,165,106,.055),transparent_34%)] px-5 py-9 sm:px-10 lg:px-12 xl:px-16">
          <div className="absolute right-5 top-5"><LanguageSwitcher /></div>
          <div className="login-auth-wrap w-full max-w-[450px]">
            <div className="login-auth-heading mb-7 text-center lg:text-left">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/10 bg-accent-soft text-lg font-extrabold text-accent-strong shadow-[0_10px_24px_rgba(30,165,106,.09)] lg:mx-0">PM</div>
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-accent">Admin Console</p>
              <h2 className="mt-2 text-[31px] font-semibold tracking-[-0.025em] text-ink">Login to Pest Mantra</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Use your registered mobile number and password to continue.</p>
            </div>

            {notAuthorized ? (
              <div role="alert" className="mb-[18px] rounded-xl border border-danger/25 bg-danger/8 px-4 py-3 text-[13px] text-danger">
                That account does not have access to the Admin Console. Technicians should use the field app.
              </div>
            ) : null}

            {passwordChanged ? (
              <div role="status" className="mb-[18px] rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-[13px] text-success">
                Password updated successfully. Sign in again with your new password.
              </div>
            ) : null}

            <div className={`login-card ${ui.card} border-[#dfe8e3] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.075)] sm:p-6`}>
              <LoginForm redirectTo={redirectTo} />
            </div>

            <div className="login-security mt-5 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-ink-faint">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success/70" />
              Secure company access · Authentication rules remain unchanged
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
