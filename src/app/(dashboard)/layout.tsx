import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthWithOrgs } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let authData;
  try {
    authData = await requireAuthWithOrgs();
  } catch {
    redirect("/login");
  }

  const { user, organizations } = authData;

  // Determine active org from cookie, default to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("activeOrgId")?.value;
  const activeOrgId =
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0]?.id;

  if (!activeOrgId) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        organizations={organizations}
        activeOrgId={activeOrgId}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
