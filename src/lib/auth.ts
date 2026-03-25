import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser, upsertUser } from "@/lib/db/queries/users";
import { getOrganizationsForUser, createPersonalWorkspace } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

async function ensureHandlyTrackMemberships(userId: string) {
  const cookieStore = await cookies();
  const slug = cookieStore.get("activeOrgSlug")?.value;
  if (slug !== "handly") return;

  const [gtm, product] = await Promise.all([
    prisma.organization.findUnique({
      where: { slug: "handly-gtm" },
      select: { id: true },
    }),
    prisma.organization.findUnique({
      where: { slug: "handly-product" },
      select: { id: true },
    }),
  ]);

  const orgIds = [gtm?.id, product?.id].filter(Boolean) as string[];
  if (orgIds.length === 0) return;

  await prisma.$transaction(
    orgIds.map((organizationId) =>
      prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId } },
        update: {},
        create: { organizationId, userId, role: "MEMBER" },
      })
    )
  );
}

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

  // If user landed via /o/handly, ensure they are added to Track 1 + Track 2
  // so they show up immediately in the workspace switcher.
  await ensureHandlyTrackMemberships(authUser.id);

  // Re-fetch orgs after potential membership updates
  const organizationsAfterHandly = await getOrganizationsForUser(authUser.id);

  // Ensure personal workspace exists
  if (organizationsAfterHandly.length === 0) {
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

  return { user: dbUser, organizations: organizationsAfterHandly };
}

export async function getActiveOrgId(organizations: Array<{ id: string }>) {
  const cookieStore = await cookies();
  return (
    organizations.find((org) => org.id === cookieStore.get("activeOrgId")?.value)?.id ??
    organizations[0]?.id
  );
}
