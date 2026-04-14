import { inngest } from "../client";
import { prisma } from "@/lib/db/prisma";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";
import { getPersonaTemplateById } from "@/lib/personas/templates";
import { getUserRole } from "@/lib/db/queries/organizations";
import type { PersonaGenerationSpeedMode } from "@/lib/ai/generate-personas";
import type { PersonaQualityTier } from "@/lib/personas/persona-creation-policy";
import type { SourceType } from "@prisma/client";
import {
  initPersonaGenerationRun,
  updatePersonaGenerationRun,
  flushPersonaGenerationPersistence,
} from "@/lib/server/persona-generation-tracker";

export type PersonaGenerateRequestedEvent = {
  name: "persona/generate.requested";
  data: {
    runId: string;
    userId: string;
    groupId: string;
    count: number;
    domainContext?: string;
    sourceTypeOverride?: SourceType;
    templateId?: string;
    includeSkeptics: boolean;
    speedMode: PersonaGenerationSpeedMode;
    qualityTier: PersonaQualityTier;
  };
};

export const generatePersonasRequested = inngest.createFunction(
  {
    id: "persona-generate-requested",
    concurrency: { key: "event.data.groupId", limit: 1 },
    retries: 1,
  },
  { event: "persona/generate.requested" },
  async ({ event, step }) => {
    const d = event.data as PersonaGenerateRequestedEvent["data"];

    await step.run("verify-access", async () => {
      const group = await prisma.personaGroup.findUnique({
        where: { id: d.groupId },
        select: { organizationId: true },
      });
      if (!group) throw new Error("Persona group not found");
      const role = await getUserRole(group.organizationId, d.userId);
      if (!role) throw new Error("Not a member of this organization");
    });

    await step.run("generate-and-save", async () => {
      initPersonaGenerationRun({
        runId: d.runId,
        userId: d.userId,
        groupId: d.groupId,
        total: d.count,
      });
      await flushPersonaGenerationPersistence(d.runId);

      const templateConfig = d.templateId ? getPersonaTemplateById(d.templateId) : undefined;
      if (d.templateId && !templateConfig) {
        updatePersonaGenerationRun(d.runId, {
          phase: "error",
          message: "Selected template was not found.",
        });
        await flushPersonaGenerationPersistence(d.runId);
        throw new Error("Selected template was not found.");
      }

      try {
        const result = await generateAndSavePersonas({
          groupId: d.groupId,
          count: d.count,
          domainContext: d.domainContext,
          sourceTypeOverride: d.sourceTypeOverride,
          templateConfig,
          includeSkeptics: d.includeSkeptics,
          qualityTier: d.qualityTier,
          speedMode: d.speedMode,
          onProgress: (completed, total, personaName) => {
            updatePersonaGenerationRun(d.runId, {
              phase: "generating",
              completed,
              total,
              currentName: personaName,
            });
          },
        });
        updatePersonaGenerationRun(d.runId, {
          phase: "done",
          generated: result.generated,
          errors: result.errors.length,
          message: result.errors.length
            ? `${result.generated} generated, ${result.errors.length} failed`
            : "Generation complete",
          completed: result.generated,
          total: d.count,
          currentName: null,
        });
      } catch (error) {
        updatePersonaGenerationRun(d.runId, {
          phase: "error",
          message: error instanceof Error ? error.message : "Generation failed",
        });
        await flushPersonaGenerationPersistence(d.runId);
        throw error;
      }
      await flushPersonaGenerationPersistence(d.runId);
      return { ok: true as const };
    });

    return { ok: true as const };
  }
);
