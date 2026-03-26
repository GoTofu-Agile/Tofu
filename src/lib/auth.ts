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

  const dbUser =
    (await getUser(authUser.id)) ??
    (await upsertUser(authUser.id, authUser.email!, authUser.user_metadata?.name));

  return dbUser;
}

export async function requireAuthWithOrgs() {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const existingUser = await getUser(authUser.id);
  const dbUser =
    existingUser ??
    (await upsertUser(authUser.id, authUser.email!, authUser.user_metadata?.name));

  await ensureHandlyTrackMemberships(authUser.id);

  const organizationsAfterHandly = await getOrganizationsForUser(authUser.id);

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
    const updatedOrgs = await getOrganizationsForUser(authUser.id);
    return { user: dbUser, organizations: updatedOrgs };
  }

  return { user: dbUser, organizations: organizationsAfterHandly };
}

/**
 * Lightweight auth for pages — skips org fetching (layout already did it).
 * Returns authenticated user + activeOrgId from cookie.
 */
export async function requireAuthWithActiveOrg() {
  const user = await requireAuth();
  const cookieStore = await cookies();
  let activeOrgId = cookieStore.get("activeOrgId")?.value;

  if (!activeOrgId) {
    const organizations = await getOrganizationsForUser(user.id);
    activeOrgId = organizations[0]?.id;
    if (!activeOrgId) throw new Error("No active organization");
  }

  return { user, activeOrgId };
}

export async function getActiveOrgId(organizations: Array<{ id: string }>) {
  const cookieStore = await cookies();
  return (
    organizations.find((org) => org.id === cookieStore.get("activeOrgId")?.value)?.id ??
    organizations[0]?.id
  );
}

/**
 * Resolve the active workspace for API routes: cookie if valid, otherwise first org.
 */
export async function resolveActiveOrganizationId(
  cookieOrgId: string | undefined,
  userId: string
): Promise<string | null> {
  const organizations = await getOrganizationsForUser(userId);
  if (organizations.length === 0) return null;
  return (
    organizations.find((org) => org.id === cookieOrgId)?.id ??
    organizations[0]?.id ??
    null
  );
}
