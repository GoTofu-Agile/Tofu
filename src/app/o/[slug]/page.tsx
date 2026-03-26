import { redirect } from "next/navigation";
import { getAuthUser, resolveActiveOrgCookiesFromSlug } from "@/lib/auth";
import { WorkspaceCookieRedirect } from "@/components/layout/workspace-cookie-redirect";

export default async function WorkspaceSlugEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/login?next=/o/${slug}`);
  }

  const activeOrg = await resolveActiveOrgCookiesFromSlug(slug, user.id);
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
