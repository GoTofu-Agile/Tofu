import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserByEmail, upsertUser } from "@/lib/db/queries/users";
import {
  getOrganizationsForUser,
  createPersonalWorkspace,
  getOrganizationBySlug,
} from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

async function ensureHandlyTrackMemberships(userId: string, activeOrgSlug?: string) {
  const slug =
    activeOrgSlug ??
    (await cookies())
      .get("activeOrgSlug")
      ?.value;
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

  const email = authUser.email;
  if (!email) throw new Error("Authenticated user has no email");

  // Resolve by auth id first, then by email (for Supabase account migration), then upsert.
  const dbUser =
    (await getUser(authUser.id)) ??
    (await getUserByEmail(email)) ??
    (await upsertUser(authUser.id, email, authUser.user_metadata?.name));

  return dbUser;
}

const requireAuthWithOrgsUncached = async () => {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const email = authUser.email;
  if (!email) throw new Error("Authenticated user has no email");

  // Resolve user robustly across Supabase project switches.
  const dbUser =
    (await getUser(authUser.id)) ??
    (await getUserByEmail(email)) ??
    (await upsertUser(authUser.id, email, authUser.user_metadata?.name));

  // Fetch orgs for resolved app user id (not necessarily current auth id).
  const organizations = await getOrganizationsForUser(dbUser.id);

  // Ensure personal workspace exists
  if (organizations.length === 0) {
    try {
      await createPersonalWorkspace(dbUser.id, email);
    } catch (error) {
      if (
        !(error instanceof Error && error.message.includes("Unique constraint"))
      ) {
        throw error;
      }
    }
    // Re-fetch orgs after creating workspace
    const updatedOrgs = await getOrganizationsForUser(dbUser.id);
    return { user: dbUser, organizations: updatedOrgs };
  }

  return { user: dbUser, organizations };
};

/**
 * Request-scoped auth/org resolver used by server components.
 * Caching avoids duplicate Supabase + DB lookups within the same render pass
 * (e.g. dashboard layout + nested page), which reduces intermittent auth mismatches.
 */
export const requireAuthWithOrgs = cache(requireAuthWithOrgsUncached);

/**
 * Auth helper for dashboard pages.
 * Always resolves an org that belongs to the current authenticated user.
 * This avoids stale `activeOrgId` cookies leaking across account switches.
 */
export async function requireAuthWithActiveOrg() {
  const { user, organizations } = await requireAuthWithOrgs();
  if (organizations.length === 0) {
    throw new Error("No active organization");
  }

  const cookieStore = await cookies();
  const activeOrgId =
    organizations.find((org) => org.id === cookieStore.get("activeOrgId")?.value)?.id ??
    organizations[0].id;

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
 * Matches dashboard layout behavior so client fetches work before `activeOrgId` is set in document.cookie.
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

type ActiveOrgCookieValues = {
  activeOrgId: string;
  activeOrgSlug: string;
};

/**
 * Resolve an org slug for the authenticated user and return cookie values.
 * Special-cases `/o/handly` to keep the Handly track context behavior.
 */
export async function resolveActiveOrgCookiesFromSlug(
  slug: string,
  userId: string
): Promise<ActiveOrgCookieValues | null> {
  if (slug === "handly") {
    await ensureHandlyTrackMemberships(userId, "handly");

    const handlyTrack = await getOrganizationBySlug("handly-gtm");
    if (!handlyTrack) return null;

    return {
      activeOrgId: handlyTrack.id,
      activeOrgSlug: "handly",
    };
  }

  const organization = await getOrganizationBySlug(slug);
  if (!organization) return null;

  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId,
      },
    },
    select: { userId: true },
  });

  if (!member) return null;

  return {
    activeOrgId: organization.id,
    activeOrgSlug: organization.slug,
  };
}
