import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser, upsertUser } from "@/lib/db/queries/users";
import { getOrganizationsForUser, createPersonalWorkspace } from "@/lib/db/queries/organizations";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  // Ensure user exists in our DB
  let dbUser = await getUser(authUser.id);
  if (!dbUser) {
    console.log("[auth] New user, creating DB record:", authUser.email);
    dbUser = await upsertUser(
      authUser.id,
      authUser.email!,
      authUser.user_metadata?.name
    );

    // Create personal workspace for new users
    try {
      await createPersonalWorkspace(authUser.id, authUser.email!);
      console.log("[auth] Created personal workspace for:", authUser.email);
    } catch (error) {
      // Personal workspace may already exist from a concurrent request — ignore unique constraint errors
      if (
        !(error instanceof Error && error.message.includes("Unique constraint"))
      ) {
        throw error;
      }
      console.log("[auth] Personal workspace already exists for:", authUser.email);
    }
  }

  return dbUser;
}

export async function requireAuthWithOrgs() {
  const user = await requireAuth();
  const organizations = await getOrganizationsForUser(user.id);
  return { user, organizations };
}

export async function getActiveOrgId(organizations: Array<{ id: string }>) {
  const cookieStore = await cookies();
  return (
    organizations.find((org) => org.id === cookieStore.get("activeOrgId")?.value)?.id ??
    organizations[0]?.id
  );
}
