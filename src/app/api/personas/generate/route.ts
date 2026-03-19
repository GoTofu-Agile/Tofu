import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";
import { getPersonaTemplateById } from "@/lib/personas/templates";

const requestSchema = z.object({
  groupId: z.string().min(1),
  count: z.number().int().min(1).max(100),
  domainContext: z.string().max(2000).optional(),
  sourceTypeOverride: z.enum(["PROMPT_GENERATED", "DATA_BASED", "UPLOAD_BASED"]).optional(),
  templateId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  // Auth check
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
    const raw = await request.json();
    body = requestSchema.parse(raw);
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

  // Stream generation progress as NDJSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const templateConfig = body.templateId
          ? getPersonaTemplateById(body.templateId)
          : undefined;

        const result = await generateAndSavePersonas({
          groupId: body.groupId,
          count: body.count,
          domainContext: body.domainContext,
          sourceTypeOverride: body.sourceTypeOverride,
          templateConfig,
          onProgress: (completed, total, personaName) => {
            const event = JSON.stringify({
              type: "progress",
              completed,
              total,
              personaName,
            });
            controller.enqueue(encoder.encode(event + "\n"));
          },
        });

        const doneEvent = JSON.stringify({
          type: "done",
          generated: result.generated,
          errors: result.errors,
        });
        controller.enqueue(encoder.encode(doneEvent + "\n"));
      } catch (error) {
        const errorEvent = JSON.stringify({
          type: "error",
          message:
            error instanceof Error ? error.message : "Generation failed",
        });
        controller.enqueue(encoder.encode(errorEvent + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
