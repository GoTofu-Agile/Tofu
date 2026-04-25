import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { getModel } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 120;

const extractSchema = z.object({
  productName: z.string().nullable(),
  productDescription: z.string().nullable(),
  targetAudience: z.string().nullable(),
  industry: z.string().nullable(),
  competitors: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  missingFields: z.array(z.string()),
  followUpQuestion: z.string().nullable(),
});

const requestSchema = z.object({
  orgId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

/** Match http(s) URLs; stop at whitespace or angle brackets (common in HTML). */
const URL_IN_TEXT_REGEX = /https?:\/\/[^\s<>]+/gi;

/** Last http(s) URL the user sent — helps when the model forgets to fill websiteUrl. */
function lastUserHttpsUrl(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const raw = messages[i].content.match(URL_IN_TEXT_REGEX);
    if (!raw?.length) continue;
    const picked = raw[raw.length - 1];
    return picked.replace(/[.,;:!?)}\]]+$/u, "");
  }
  return null;
}

// POST: Process chat messages and extract/update org info
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const role = await getUserRole(body.orgId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }
  if (role === "VIEWER") {
    return Response.json(
      { error: "Insufficient permissions to update workspace setup." },
      { status: 403 }
    );
  }

  // Load current org data
  const org = await prisma.organization.findUnique({
    where: { id: body.orgId },
    select: {
      productName: true,
      productDescription: true,
      targetAudience: true,
      industry: true,
      competitors: true,
      websiteUrl: true,
    },
  });

  const currentFields = org
    ? Object.entries(org)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "No information yet.";

  // Extract structured data from the conversation
  const conversationText = body.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const { object: extracted } = await generateObject({
    model: getModel(),
    schema: extractSchema,
    prompt: `You are helping set up a company profile for a user research platform. Extract product information from this conversation.

Current known info:
${currentFields}

Conversation:
${conversationText}

Extract all product information you can find. For each field:
- productName: The name of the product/app/service
- productDescription: What it does (1-2 sentences)
- targetAudience: Who uses it
- industry: What industry/sector
- competitors: Comma-separated competitor names
- websiteUrl: Product or company website ONLY if the user gave a normal http(s) URL for their product. If the user pastes a search-engine or tracking URL, set websiteUrl to null.

IMPORTANT — completion rules:
- websiteUrl is OPTIONAL. Never block finishing setup because website is missing.
- If the user provides any plausible product website URL (https://...), put it in websiteUrl and do NOT ask for another URL.
- If productDescription AND targetAudience are both available (from this extraction OR from "Current known info" above), you MUST set followUpQuestion to null and empty missingFields. Do not ask for a website in that case.
- Do NOT repeat the same follow-up question; if the user already answered, move on or finish.

Set fields to null if not mentioned or unclear.
missingFields: only for genuinely blocking gaps — not website when description and audience are already known.
followUpQuestion: null when productDescription and targetAudience are both known (conversation or current info). Otherwise one short friendly question.`,
  });

  const urlFromUser = lastUserHttpsUrl(body.messages);
  if (urlFromUser && !extracted.websiteUrl?.trim()) {
    extracted.websiteUrl = urlFromUser;
  }

  const mergedDescription =
    extracted.productDescription?.trim() || org?.productDescription?.trim() || "";
  const mergedAudience =
    extracted.targetAudience?.trim() || org?.targetAudience?.trim() || "";

  if (mergedDescription && mergedAudience) {
    extracted.followUpQuestion = null;
    extracted.missingFields = [];
  }

  // Update org with any new data
  const updateData: Record<string, string> = {};
  if (extracted.productName) updateData.productName = extracted.productName;
  if (extracted.productDescription)
    updateData.productDescription = extracted.productDescription;
  if (extracted.targetAudience)
    updateData.targetAudience = extracted.targetAudience;
  if (extracted.industry) updateData.industry = extracted.industry;
  if (extracted.competitors) updateData.competitors = extracted.competitors;
  if (extracted.websiteUrl) updateData.websiteUrl = extracted.websiteUrl;

  const isComplete = !extracted.followUpQuestion;
  if (isComplete) {
    updateData.setupCompleted = "true";
  }

  if (Object.keys(updateData).length > 0) {
    const { setupCompleted: sc, ...stringFields } = updateData;
    await prisma.organization.update({
      where: { id: body.orgId },
      data: {
        ...stringFields,
        ...(sc ? { setupCompleted: true } : {}),
      },
    });
  }

  // Build an effective context view (existing org data + newly extracted values).
  const effectiveProductDescription =
    extracted.productDescription || org?.productDescription || null;
  const effectiveTargetAudience =
    extracted.targetAudience || org?.targetAudience || null;

  // Only treat these as critical for onboarding completion.
  // Product name and website are optional, so we should not block with follow-up for those.
  const missingCritical: string[] = [];
  if (!effectiveProductDescription) missingCritical.push("product description");
  if (!effectiveTargetAudience) missingCritical.push("target audience");

  // If still missing critical info, ask a focused follow-up.
  if (missingCritical.length > 0) {
    const followUpQuestion =
      missingCritical.length === 2
        ? "Can you quickly add what your product does and who it is for?"
        : missingCritical[0] === "product description"
          ? "Can you briefly describe what your product does?"
          : "Who is your primary target audience?";

    return Response.json({
      type: "follow_up",
      message: followUpQuestion,
      extracted: {
        productName: extracted.productName,
        productDescription: extracted.productDescription,
        targetAudience: extracted.targetAudience,
        industry: extracted.industry,
        competitors: extracted.competitors,
        websiteUrl: extracted.websiteUrl,
      },
      missingFields: missingCritical,
    });
  }

  // Complete — return final extracted data
  return Response.json({
    type: "complete",
    message: `Got it! I've saved your product info${extracted.productName ? ` for ${extracted.productName}` : ""}. You're all set to create personas now.`,
    extracted: {
      productName: extracted.productName,
      productDescription: extracted.productDescription,
      targetAudience: extracted.targetAudience,
      industry: extracted.industry,
      competitors: extracted.competitors,
      websiteUrl: extracted.websiteUrl,
    },
  });
}
