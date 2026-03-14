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
    dbUser = await upsertUser(
      authUser.id,
      authUser.email!,
      authUser.user_metadata?.name
    );

    // Create personal workspace for new users
    await createPersonalWorkspace(authUser.id, authUser.email!);
  }

  return dbUser;
}

export async function requireAuthWithOrgs() {
  const user = await requireAuth();
  const organizations = await getOrganizationsForUser(user.id);
  return { user, organizations };
}
