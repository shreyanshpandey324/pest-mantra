import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
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

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />

        <main className="flex-1 p-4 sm:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}