import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ProductTour } from "@/components/ProductTour";
import { getCurrentUser } from "@/lib/current-user";
import { UserRole } from "@/types/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  /*
   * Technicians must use the technician application.
   *
   * This is intentionally checked server-side as well as during
   * authentication. Frontend navigation is never treated as
   * the security boundary.
   */
  if (user.role === UserRole.TECHNICIAN) {
    redirect("/login?error=wrong_application");
  }

  /*
   * `pm-shell` scopes the premium dark enterprise design tokens to the
   * authenticated admin workspace only. Public surfaces (login, customer
   * portal, service verification, printed reports) keep their own theme.
   */
  return (
    <div className="pm-shell flex min-h-dvh">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />

        <main className="pm-enter flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <ProductTour />
      </div>
    </div>
  );
}
