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

  // Upsert user — idempotent, works for both new and returning users
  const dbUser = await upsertUser(
    authUser.id,
    authUser.email!,
    authUser.user_metadata?.name
  );

  return dbUser;
}

export async function requireAuthWithOrgs() {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  // Upsert user + fetch orgs in parallel
  const [dbUser, organizations] = await Promise.all([
    upsertUser(authUser.id, authUser.email!, authUser.user_metadata?.name),
    getOrganizationsForUser(authUser.id),
  ]);

  // Ensure personal workspace exists
  if (organizations.length === 0) {
    try {
      await createPersonalWorkspace(authUser.id, authUser.email!);
    } catch (error) {
      if (
        !(error instanceof Error && error.message.includes("Unique constraint"))
      ) {
        throw error;
      }
    }
    // Re-fetch orgs after creating workspace
    const updatedOrgs = await getOrganizationsForUser(authUser.id);
    return { user: dbUser, organizations: updatedOrgs };
  }

  return { user: dbUser, organizations };
}

export async function getActiveOrgId(organizations: Array<{ id: string }>) {
  const cookieStore = await cookies();
  return (
    organizations.find((org) => org.id === cookieStore.get("activeOrgId")?.value)?.id ??
    organizations[0]?.id
  );
}
