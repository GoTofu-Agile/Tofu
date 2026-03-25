import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, upsertUser } from "@/lib/db/queries/users";
import { prisma } from "@/lib/db/prisma";
import { generateAndSavePersonas } from "@/lib/ai/generate-personas";
import { quickResearch } from "@/lib/research/tavily";
import {
  HANDLY_TRACK_ORGS,
  HANDLY_TRACK_GROUPS,
  buildHandlyOrgProductContextFields,
  buildHandlyPersonaGroupDomainContext,
} from "@/lib/seed/handlyTracks";

const bodySchema = z.object({
  dryRun: z.boolean().optional().default(false),
  generate: z.boolean().optional().default(true),
  research: z.boolean().optional().default(true),
});

const LEGACY_GROUP_LABELS: Record<string, string[]> = {
  "Sales Representative": ["Handly BDR / Sales Rep"],
  "Office Manager": ["Office Manager (buyer signal)"],
};

function requireAdmin(email: string | null | undefined) {
  const adminEmails = (process.env.GOTOFU_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!email || adminEmails.length === 0 || !adminEmails.includes(email)) {
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  // Auth (Supabase user + DB user)
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const isAdmin = requireAdmin(authUser.email);

  if (!isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure DB user exists (idempotent)
  await upsertUser(authUser.id, authUser.email!, authUser.user_metadata?.name);
  const dbUser = await getUser(authUser.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const productFields = buildHandlyOrgProductContextFields();

  const ops: Array<Record<string, unknown>> = [];

  try {
    for (const track of HANDLY_TRACK_ORGS) {
      // Ensure org exists (idempotent)
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: track.slug },
        select: { id: true },
      });

      const orgId = existingOrg?.id
        ? existingOrg.id
        : body.dryRun
          ? null
          : (
              await prisma.organization.create({
                data: {
                  name: track.name,
                  slug: track.slug,
                  isPersonal: false,
                  ...productFields,
                },
                select: { id: true },
              })
            ).id;

      ops.push({
        op: existingOrg ? "org.exists" : "org.create",
        track: track.key,
        slug: track.slug,
        organizationId: orgId,
      });

      if (!orgId) continue;

      // Always ensure product context is set (safe overwrite)
      if (!body.dryRun) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { ...productFields },
        });
      }

      const groups = HANDLY_TRACK_GROUPS[track.key];
      let missingTotal = 0;

      for (const group of groups) {
        const existingGroupByLabel = await prisma.personaGroup.findFirst({
          where: { organizationId: orgId, name: group.label },
          select: { id: true },
        });
        let existingGroup = existingGroupByLabel;

        if (!existingGroup && !body.dryRun) {
          const legacyLabels = LEGACY_GROUP_LABELS[group.label] ?? [];
          if (legacyLabels.length > 0) {
            const legacyGroup = await prisma.personaGroup.findFirst({
              where: {
                organizationId: orgId,
                name: { in: legacyLabels },
              },
              select: { id: true, name: true },
            });
            if (legacyGroup) {
              await prisma.personaGroup.update({
                where: { id: legacyGroup.id },
                data: { name: group.label },
              });
              existingGroup = { id: legacyGroup.id };
              ops.push({
                op: "group.rename",
                track: track.key,
                groupKey: group.key,
                from: legacyGroup.name,
                to: group.label,
                personaGroupId: legacyGroup.id,
              });
            }
          }
        }

        const domainContext = buildHandlyPersonaGroupDomainContext({
          track,
          group,
        });

        const groupId = existingGroup?.id
          ? existingGroup.id
          : body.dryRun
            ? null
            : (
                await prisma.personaGroup.create({
                  data: {
                    organizationId: orgId,
                    name: group.label,
                    description: group.notes ?? null,
                    domainContext,
                    sourceType: "PROMPT_GENERATED",
                  },
                  select: { id: true },
                })
              ).id;

        ops.push({
          op: existingGroup ? "group.exists" : "group.create",
          track: track.key,
          groupKey: group.key,
          groupLabel: group.label,
          personaGroupId: groupId,
        });

        if (!groupId) continue;

        // Keep domainContext up to date (idempotent)
        if (!body.dryRun) {
          await prisma.personaGroup.update({
            where: { id: groupId },
            data: { domainContext, description: group.notes ?? null },
          });
        }

        const existingPersonaCount = await prisma.persona.count({
          where: { personaGroupId: groupId, isActive: true },
        });

        const target = 10;
        const missing = Math.max(0, target - existingPersonaCount);
        missingTotal += missing;
        ops.push({
          op: "group.count",
          track: track.key,
          groupLabel: group.label,
          existingPersonaCount,
          target,
          missing,
        });

        if (missing === 0) continue;

        if (body.research && process.env.TAVILY_API_KEY) {
          // Optional: add a bit of fresh evidence so personas are less generic.
          const queries = [
            `${group.label} persona for German roofing company operations`,
            `${group.label} pain points roofing contractor Germany admin invoicing quoting`,
            `${group.label} decision making buying marketing services for local contractors`,
          ];
          if (!body.dryRun) {
            await quickResearch(groupId, queries);
          }
          ops.push({
            op: "group.research",
            track: track.key,
            groupLabel: group.label,
            queries,
            enabled: Boolean(process.env.TAVILY_API_KEY),
          });
        } else {
          ops.push({
            op: "group.research.skipped",
            track: track.key,
            groupLabel: group.label,
            reason: body.research ? "missing_TAVILY_API_KEY" : "research_disabled",
          });
        }

        if (body.generate) {
          if (!body.dryRun) {
            await generateAndSavePersonas({
              groupId,
              count: missing,
              domainContext,
            });
          }
          ops.push({
            op: "group.generate",
            track: track.key,
            groupLabel: group.label,
            generated: body.dryRun ? 0 : missing,
          });
        } else {
          ops.push({
            op: "group.generate.skipped",
            track: track.key,
            groupLabel: group.label,
            reason: "generate_disabled",
          });
        }
      }

    }

  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    dryRun: body.dryRun,
    generate: body.generate,
    research: body.research,
    operations: ops,
  });
}

