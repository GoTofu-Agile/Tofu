import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getModel } from "@/lib/ai/provider";
import { loadOutscraperAppReviewsForGroup } from "./app-store-review-pool";

const assignmentSchema = z.object({
  assignments: z.array(
    z.object({
      personaId: z.string(),
      /** LLM may return fewer than 3; backfill enforces minimum when pool allows. */
      domainKnowledgeIds: z.array(z.string()).max(8),
    })
  ),
});

const MIN_QUOTES = 3;
const MAX_QUOTES = 6;

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** Remove invalid ids; dedupe; cap length */
function sanitizeIds(ids: string[], validSet: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!validSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_QUOTES) break;
  }
  return out;
}

/** Ensure each persona has up to `target` quotes from pool (round-robin), respecting uniqueness per persona */
function backfillPersonaQuotes(
  personaIds: string[],
  poolIds: string[],
  perPersona: Map<string, string[]>,
  target: number
): void {
  if (poolIds.length === 0) return;
  const effectiveTarget = Math.min(target, poolIds.length);

  for (const pid of personaIds) {
    const current = new Set(perPersona.get(pid) ?? []);
    let i = 0;
    while (current.size < effectiveTarget && i < poolIds.length * 3) {
      const id = poolIds[i % poolIds.length]!;
      if (!current.has(id)) {
        current.add(id);
      }
      i++;
    }
    perPersona.set(pid, Array.from(current).slice(0, MAX_QUOTES));
  }
}

/**
 * Maps Outscraper App Store reviews to personas (verbatim content only in DB).
 * Deletes existing APP_REVIEW PersonaDataSource links for the group, then inserts new ones.
 */
export async function assignAppStoreReviewsToPersonas(
  groupId: string
): Promise<{ linked: number; skippedReason?: string }> {
  const [pool, personas] = await Promise.all([
    loadOutscraperAppReviewsForGroup(groupId),
    prisma.persona.findMany({
      where: { personaGroupId: groupId, isActive: true },
      select: {
        id: true,
        name: true,
        bio: true,
        archetype: true,
        occupation: true,
        goals: true,
        frustrations: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (pool.length === 0) {
    return { linked: 0, skippedReason: "no_outscraper_reviews" };
  }
  if (personas.length === 0) {
    return { linked: 0, skippedReason: "no_personas" };
  }

  const poolIds = pool.map((p) => p.id);
  const validSet = new Set(poolIds);
  const personaIds = personas.map((p) => p.id);

  const perPersona = new Map<string, string[]>();

  if (pool.length < MIN_QUOTES) {
    backfillPersonaQuotes(personaIds, poolIds, perPersona, pool.length);
  } else {
    const reviewBlock = pool
      .map(
        (r, idx) =>
          `[${r.id}] (${r.title}) rating=${(r.metadata as { rating?: number } | null)?.rating ?? "?"}:\n${truncate(r.content, 400)}`
      )
      .join("\n\n");

    const personaBlock = personas
      .map(
        (p) =>
          `id=${p.id}\nname=${p.name}\narchetype=${p.archetype ?? ""}\noccupation=${p.occupation ?? ""}\nbio=${truncate(p.bio ?? "", 300)}\ngoals=${JSON.stringify(p.goals ?? [])}\nfrustrations=${JSON.stringify(p.frustrations ?? [])}`
      )
      .join("\n---\n");

    try {
      const { object } = await generateObject({
        model: getModel(),
        schema: assignmentSchema,
        prompt: `You assign real App Store review snippets (by id) to synthetic user personas for UX research.

Reviews (use ONLY these ids; verbatim text lives in the database — do not invent ids):
${reviewBlock}

Personas:
${personaBlock}

Rules:
- Every persona must get at least ${MIN_QUOTES} and at most ${MAX_QUOTES} review ids from the list above.
- The same review id MAY appear for multiple personas if thematically appropriate.
- Prefer reviews whose sentiment/topics plausibly match each persona's frustrations, goals, or archetype.
- Return one entry per persona id listed above.`,
      });

      for (const a of object.assignments) {
        if (!personaIds.includes(a.personaId)) continue;
        const cleaned = sanitizeIds(a.domainKnowledgeIds, validSet);
        perPersona.set(a.personaId, cleaned);
      }

      for (const pid of personaIds) {
        if (!perPersona.has(pid)) perPersona.set(pid, []);
      }

      backfillPersonaQuotes(personaIds, poolIds, perPersona, MIN_QUOTES);
    } catch (e) {
      console.error("[assignAppStoreReviewsToPersonas] LLM failed, using round-robin", e);
      for (const pid of personaIds) perPersona.set(pid, []);
      backfillPersonaQuotes(personaIds, poolIds, perPersona, MIN_QUOTES);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.personaDataSource.deleteMany({
      where: {
        persona: { personaGroupId: groupId },
        domainKnowledge: { sourceType: "APP_REVIEW" },
      },
    });

    const rows: { personaId: string; domainKnowledgeId: string; influence: string }[] =
      [];
    for (const pid of personaIds) {
      const ids = perPersona.get(pid) ?? [];
      for (const dkId of ids) {
        rows.push({
          personaId: pid,
          domainKnowledgeId: dkId,
          influence: "app_store_attribution",
        });
      }
    }
    if (rows.length > 0) {
      await tx.personaDataSource.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  });

  const linked = Array.from(perPersona.values()).reduce((n, ids) => n + ids.length, 0);
  return { linked };
}
