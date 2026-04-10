import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import {
  fetchStoreReviewsViaSerpApi,
} from "@/lib/research/serpapi/store-reviews";
import {
  isAppleAppStoreUrl,
  isGooglePlayStoreUrl,
} from "@/lib/research/serpapi/store-url";
import { isSerpApiConfigured } from "@/lib/research/serpapi/client";

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

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  if (!isSerpApiConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          "SERPAPI_API_KEY is not set or SerpAPI is disabled (SERPAPI_ENABLED=false).",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const domain = extractDomain(body.appUrl);
  const isPlay = isGooglePlayStoreUrl(body.appUrl);
  const isApple = isAppleAppStoreUrl(body.appUrl);

  let reviews;
  try {
    reviews = await fetchStoreReviewsViaSerpApi({
      appUrl: body.appUrl,
      limit: body.limit ?? 100,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch store reviews";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nowSession = crypto.randomUUID();
  const sourceType = isPlay ? ("PLAY_STORE_REVIEW" as const) : ("APP_REVIEW" as const);
  const queryPrefix = isPlay ? "playstore:" : "appstore:";

  const rows = reviews
    .map((r) => {
      const text = (r.text || "").trim();
      if (!text) return null;
      const title = (r.title || (isPlay ? "Play Store review" : "App Store review")).trim();
      const rating =
        typeof r.rating === "number" && Number.isFinite(r.rating) ? r.rating : undefined;
      const publishedAt = r.date ? new Date(r.date) : null;
      return {
        personaGroupId: body.groupId,
        title,
        content: text,
        sourceType,
        sourceUrl: body.appUrl,
        sourceDomain: domain,
        publishedAt:
          publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        relevanceScore: rating
          ? Math.max(0.1, Math.min(1, isPlay ? rating / 5 : rating / 5))
          : null,
        searchQuery: `${queryPrefix}${body.appUrl}`,
        searchSession: nowSession,
        metadata: {
          provider: "serpapi",
          rating,
          userName: r.userName,
          version: r.version,
          country: r.country,
          reviewUrl: r.url,
          serpReviewId: r.serpReviewId,
        },
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await prisma.domainKnowledge.createMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- narrowed by filter(Boolean)
      data: rows as any,
    });
  }

  return new Response(
    JSON.stringify({
      totalFetched: reviews.length,
      totalSaved: rows.length,
      sourceDomain: domain,
      store: isPlay ? "google_play" : isApple ? "apple_app_store" : "unknown",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
