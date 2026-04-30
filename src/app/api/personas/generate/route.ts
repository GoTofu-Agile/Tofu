import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getPersonaGroup } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";
import { getPersonaTemplateById } from "@/lib/personas/templates";
import {
  initPersonaGenerationRun,
  updatePersonaGenerationRun,
  flushPersonaGenerationPersistence,
} from "@/lib/server/persona-generation-tracker";
import { isPersonaGenerationBlockedForGroup } from "@/lib/server/persona-generation-db";
import { inngest } from "@/lib/inngest/client";
import {
  acquireInFlightLease,
  checkRateLimit,
  releaseInFlightLease,
} from "@/lib/server/request-guards";
import {
  assertPersonaGenerationAllowed,
  getPersonaGenerationGuardForGroup,
} from "@/lib/personas/persona-generation-guard";
import type { PersonaGenerationSpeedMode } from "@/lib/ai/generate-personas";
import { sendPersonaGenCompleteEmail } from "@/lib/email/resend";
import {
  BillingUpgradeRequiredError,
  consumeCreditOrThrow,
} from "@/lib/billing/credits";

/** Vercel / serverless max wall time for streaming generation (plan may cap lower). */
export const maxDuration = 300;

const requestSchema = z.object({
  groupId: z.string().min(1),
  count: z.number().int().min(1).max(100),
  domainContext: z.string().max(2000).optional(),
  sourceTypeOverride: z.enum(["PROMPT_GENERATED", "DATA_BASED", "UPLOAD_BASED"]).optional(),
  templateId: z.string().min(1).optional(),
  includeSkeptics: z.boolean().optional(),
  clientRunId: z.string().min(1).max(80).optional(),
  /** True when the client used the “deep search” research path (Quick or Guided). */
  usedDeepResearchPipeline: z.boolean().optional(),
  /**
   * quality: slowest, full prompts + LLM authenticity judge.
   * fast: default — parallel LLM + compact prompts + heuristic scores.
   * turbo: template assembly, no persona LLM (near-instant).
   */
  speedMode: z.enum(["quality", "fast", "turbo"]).optional(),
  /** When true, enqueue Inngest and return 202 immediately (progress via `/api/personas/generation-status`). */
  async: z.boolean().optional(),
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

  const rate = checkRateLimit({
    key: `persona-generate:${authUser.id}`,
    limit: 12,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many generation requests. Please wait a moment and retry.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      }
    );
  }

  const leaseKey = `persona-generate:${authUser.id}:${body.groupId}`;
  const leaseAcquired = acquireInFlightLease({
    key: leaseKey,
    ttlMs: 3 * 60_000,
  });
  if (!leaseAcquired) {
    return new Response(
      JSON.stringify({
        error:
          "A generation is already in progress for this persona group. Please wait for it to finish.",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify group exists, user has access, and fetch generation guard — in parallel.
  const [group, guard] = await Promise.all([
    getPersonaGroup(body.groupId),
    getPersonaGenerationGuardForGroup(body.groupId),
  ]);
  if (!group || !guard) {
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

  try {
    await consumeCreditOrThrow({
      userId: dbUser.id,
      organizationId: group.organizationId,
      kind: "persona",
      metadata: {
        groupId: body.groupId,
        requestedCount: body.count,
      },
    });
  } catch (error) {
    if (error instanceof BillingUpgradeRequiredError) {
      releaseInFlightLease(leaseKey);
      return new Response(
        JSON.stringify({
          error: error.message,
          billingRequired: true,
          creditKind: error.kind,
          credits: error.snapshot,
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    releaseInFlightLease(leaseKey);
    return new Response(JSON.stringify({ error: "Failed to validate credits" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    assertPersonaGenerationAllowed({
      guard,
      requestedCount: body.count,
      usedDeepResearchPipeline: body.usedDeepResearchPipeline,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const genBlock = await isPersonaGenerationBlockedForGroup(body.groupId);
  if (genBlock.blocked) {
    releaseInFlightLease(leaseKey);
    return new Response(
      JSON.stringify({ error: genBlock.reason ?? "Persona generation is already in progress for this group." }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }

  const runId = body.clientRunId ?? crypto.randomUUID();
  initPersonaGenerationRun({
    runId,
    userId: authUser.id,
    groupId: body.groupId,
    total: body.count,
  });
  await flushPersonaGenerationPersistence(runId);

  if (body.async) {
    try {
      await inngest.send({
        name: "persona/generate.requested",
        data: {
          runId,
          userId: authUser.id,
          groupId: body.groupId,
          count: body.count,
          domainContext: body.domainContext,
          sourceTypeOverride: body.sourceTypeOverride,
          templateId: body.templateId,
          includeSkeptics: body.includeSkeptics ?? true,
          speedMode: (body.speedMode ?? "fast") as PersonaGenerationSpeedMode,
          qualityTier: guard.tier,
        },
      });
    } catch (err) {
      console.error("[personas/generate] inngest.send failed:", err);
      updatePersonaGenerationRun(runId, {
        phase: "error",
        message: "Failed to queue persona generation. Try again.",
      });
      await flushPersonaGenerationPersistence(runId);
      releaseInFlightLease(leaseKey);
      return new Response(JSON.stringify({ error: "Failed to queue persona generation. Try again." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    releaseInFlightLease(leaseKey);
    return new Response(JSON.stringify({ runId, async: true }), {
      status: 202,
      headers: {
        "Content-Type": "application/json",
        "X-Persona-Run-Id": runId,
      },
    });
  }

  // Stream generation progress as NDJSON
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const templateConfig = body.templateId
          ? getPersonaTemplateById(body.templateId)
          : undefined;
        if (body.templateId && !templateConfig) {
          throw new Error("Selected template was not found.");
        }

        const speedMode: PersonaGenerationSpeedMode = body.speedMode ?? "fast";

        const result = await generateAndSavePersonas({
          groupId: body.groupId,
          count: body.count,
          domainContext: body.domainContext,
          sourceTypeOverride: body.sourceTypeOverride,
          templateConfig,
          includeSkeptics: body.includeSkeptics ?? true,
          qualityTier: guard.tier,
          speedMode,
          onPartial: ({ index, name, archetype, age }) => {
            const event = JSON.stringify({
              type: "partial",
              runId,
              index,
              name,
              archetype,
              age,
            });
            controller.enqueue(encoder.encode(event + "\n"));
          },
          onProgress: (completed, total, personaName, personaId) => {
            updatePersonaGenerationRun(runId, {
              phase: "generating",
              completed,
              total,
              currentName: personaName,
            });
            const event = JSON.stringify({
              type: "progress",
              completed,
              total,
              personaName,
              personaId,
              sourceUrl: `/personas/${body.groupId}/${personaId}`,
              runId,
            });
            controller.enqueue(encoder.encode(event + "\n"));
          },
        });
        updatePersonaGenerationRun(runId, {
          phase: "done",
          generated: result.generated,
          errors: result.errors.length,
          message: result.errors.length
            ? `${result.generated} generated, ${result.errors.length} failed`
            : "Generation complete",
          completed: result.generated,
          total: body.count,
          currentName: null,
        });

        const doneEvent = JSON.stringify({
          type: "done",
          runId,
          generated: result.generated,
          errors: result.errors,
          evaluationsQueued: result.evaluationsQueued,
          authenticity: result.authenticity,
        });
        controller.enqueue(encoder.encode(doneEvent + "\n"));

        // Send email notification if user opted in and there's something to report
        if (dbUser.notifyPersonaGenComplete && result.generated > 0) {
          sendPersonaGenCompleteEmail({
            to: dbUser.email,
            userName: dbUser.name,
            groupName: group.name,
            generated: result.generated,
            groupId: body.groupId,
          }).catch(() => {/* non-fatal */});
        }
      } catch (error) {
        updatePersonaGenerationRun(runId, {
          phase: "error",
          message: error instanceof Error ? error.message : "Generation failed",
        });
        const errorEvent = JSON.stringify({
          type: "error",
          runId,
          message:
            error instanceof Error ? error.message : "Generation failed",
        });
        controller.enqueue(encoder.encode(errorEvent + "\n"));
      } finally {
        await flushPersonaGenerationPersistence(runId);
        releaseInFlightLease(leaseKey);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      "X-Persona-Run-Id": runId,
    },
  });
}
