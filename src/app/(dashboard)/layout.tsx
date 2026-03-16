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

  if (organizations.length === 0) {
    // This should never happen — requireAuth auto-creates a personal workspace.
    // If it does, something is seriously wrong with the DB connection.
    throw new Error(
      "No organizations found. Please try logging out and back in, or contact support."
    );
  }

  // Determine active org from cookie, default to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("activeOrgId")?.value;
  const activeOrgId =
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0].id;

  const adminEmails = (process.env.GOTOFU_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(user.email);

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        organizations={organizations}
        activeOrgId={activeOrgId}
        isAdmin={isAdmin}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
