import { redirect } from "next/navigation";
import {
  getAuthUser,
  requireAuth,
  resolveActiveOrgCookiesFromSlug,
} from "@/lib/auth";
import { WorkspaceCookieRedirect } from "@/components/layout/workspace-cookie-redirect";

export default async function WorkspaceSlugDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?next=/o/${slug}/dashboard`);
  }

  // Ensure the auth user is persisted in DB before membership checks.
  const dbUser = await requireAuth();
  const activeOrg = await resolveActiveOrgCookiesFromSlug(slug, dbUser.id);
  if (!activeOrg) {
    redirect("/dashboard");
  }

  return (
    <WorkspaceCookieRedirect
      activeOrgId={activeOrg.activeOrgId}
      activeOrgSlug={activeOrg.activeOrgSlug}
      redirectTo="/dashboard"
    />
  );
}
