import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { fetchAppStoreReviews } from "@/lib/reviews/outscraper";

const requestSchema = z.object({
  groupId: z.string().min(1),
  appUrl: z.string().url(),
  limit: z.number().int().min(1).max(1000).optional(),
});

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export async function POST(request: NextRequest) {
  // Auth check (same pattern as /api/personas/generate)
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate body
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify group exists and user has access
  const group = await getPersonaGroup(body.groupId);
  if (!group) {
    return new Response(JSON.stringify({ error: "Group not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const role = await getUserRole(group.organizationId, dbUser.id);
  if (!role) {
    return new Response(
      JSON.stringify({ error: "Not a member of this organization" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const domain = extractDomain(body.appUrl);

  let reviews;
  try {
    // Fetch reviews from Outscraper
    reviews = await fetchAppStoreReviews({
      appUrl: body.appUrl,
      limit: body.limit ?? 100,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to scrape reviews";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Persist as DomainKnowledge (APP_REVIEW)
  const nowSession = crypto.randomUUID();
  type AppReviewDomainRow = Prisma.DomainKnowledgeCreateManyInput & {
    sourceType: "APP_REVIEW";
  };

  const rows = reviews
    .map((r): AppReviewDomainRow | null => {
      const text = (r.text || "").trim();
      if (!text) return null;
      const title = (r.title || "App Store review").trim();
      const rating =
        typeof r.rating === "number" && Number.isFinite(r.rating) ? r.rating : undefined;
      const publishedAt = r.date ? new Date(r.date) : null;
      return {
        personaGroupId: body.groupId,
        title,
        content: text,
        sourceType: "APP_REVIEW" as const,
        sourceUrl: body.appUrl,
        sourceDomain: domain,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        relevanceScore: rating ? Math.max(0.1, Math.min(1, rating / 5)) : null,
        searchQuery: `appstore:${body.appUrl}`,
        searchSession: nowSession,
        metadata: {
          rating,
          userName: r.userName,
          version: r.version,
          country: r.country,
          reviewUrl: r.url,
        },
      };
    })
    .filter((row): row is AppReviewDomainRow => row !== null);

  if (rows.length > 0) {
    // createMany is faster; we don't require individual ids here
    await prisma.domainKnowledge.createMany({
      data: rows,
    });
  }

  return new Response(
    JSON.stringify({
      totalFetched: reviews.length,
      totalSaved: rows.length,
      sourceDomain: domain,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

