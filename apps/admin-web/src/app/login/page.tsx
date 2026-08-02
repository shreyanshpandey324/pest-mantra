import { LoginForm } from "@/components/LoginForm";
import { ui } from "@/lib/ui-classes";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo && params.redirectTo.startsWith("/") ? params.redirectTo : "/dashboard";
  const notAuthorized = params.error === "not_authorized";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className={`${ui.card} w-full max-w-[420px] overflow-hidden`}>
        <div
          className="h-1 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, var(--color-accent), var(--color-accent) 10px, var(--color-surface) 10px, var(--color-surface) 20px)",
          }}
          aria-hidden="true"
        />
        <div className="px-8 pb-8 pt-9">
          <div className="mb-7">
            <p className="mb-2 font-mono text-[13px] tracking-wide text-accent">PEST MANTRA</p>
            <h1 className="mb-1.5 text-[26px]">Field Service Console</h1>
            <p className="text-sm text-ink-muted">
              Sign in with your admin account to view and dispatch jobs.
            </p>
          </div>

          {notAuthorized && (
            <div
              role="alert"
              className="mb-[18px] rounded-lg border border-danger/35 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger"
            >
              That account doesn&apos;t have access to the admin dashboard. Technicians should use
              the Pest Mantra field app instead.
            </div>
          )}

          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}
