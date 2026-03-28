import { NextRequest } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getModel } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";
import { getUserRole } from "@/lib/db/queries/organizations";

const requestSchema = z.object({
  personaId: z.string().min(1),
  section: z.enum([
    "bio",
    "backstory",
    "representativeQuote",
    "dayInTheLife",
    "communicationSample",
  ]),
  tone: z.enum(["balanced", "conversational", "analytical", "direct"]).default("balanced"),
  depth: z.enum(["concise", "standard", "detailed"]).default("standard"),
  instruction: z
    .enum(["make_more_realistic", "make_more_specific", "make_more_distinct"])
    .default("make_more_realistic"),
});

const sectionSchema = z.object({
  content: z.string().min(10).max(2500),
});

function getLengthHint(section: z.infer<typeof requestSchema>["section"], depth: z.infer<typeof requestSchema>["depth"]) {
  if (section === "representativeQuote") return "1-2 sentences";
  if (section === "bio") return depth === "concise" ? "2-3 sentences" : depth === "detailed" ? "5-6 sentences" : "3-4 sentences";
  return depth === "concise" ? "1 short paragraph" : depth === "detailed" ? "2 concise paragraphs" : "1 medium paragraph";
}

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
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const persona = await prisma.persona.findUnique({
    where: { id: body.personaId },
    include: {
      personality: true,
      personaGroup: {
        select: { organizationId: true, domainContext: true },
      },
    },
  });
  if (!persona) {
    return Response.json({ error: "Persona not found" }, { status: 404 });
  }

  const role = await getUserRole(persona.personaGroup.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const sectionValue = String(persona[body.section] ?? "");
  const prompt = `Rewrite ONE persona section to improve authenticity.

Section: ${body.section}
Instruction: ${body.instruction}
Tone: ${body.tone}
Depth: ${body.depth}
Length target: ${getLengthHint(body.section, body.depth)}

Persona context:
- Name: ${persona.name}
- Archetype: ${persona.archetype ?? "N/A"}
- Occupation: ${persona.occupation ?? "N/A"}
- Location: ${persona.location ?? "N/A"}
- Domain context: ${persona.personaGroup.domainContext ?? "N/A"}
- Goals: ${JSON.stringify(persona.goals ?? [])}
- Frustrations: ${JSON.stringify(persona.frustrations ?? [])}
- Behaviors: ${JSON.stringify(persona.behaviors ?? [])}
- Existing section text: ${sectionValue}

Rules:
- Keep this persona identity consistent.
- Remove generic/cliche wording.
- Use concrete, believable details.
- Avoid repeating common startup phrases.
- Include at least one subtle trade-off or contradiction where natural.
- Return only the rewritten section content.`;

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: sectionSchema,
      prompt,
    });

    const content = object.content.trim();
    await prisma.persona.update({
      where: { id: body.personaId },
      data: { [body.section]: content },
    });

    return Response.json({ success: true, section: body.section, content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate section";
    return Response.json({ error: message }, { status: 500 });
  }
}
