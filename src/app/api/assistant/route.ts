import { streamText, tool, zodSchema } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getUserRole } from "@/lib/db/queries/organizations";
import { getModel } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";
import {
  createPersonaGroup,
  getPersonaGroupsForOrg,
} from "@/lib/db/queries/personas";
import {
  createStudy,
  getStudiesForOrg,
} from "@/lib/db/queries/studies";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import type { StudyType } from "@prisma/client";

export async function POST(request: Request) {
  // Auth
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

  // Active org
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) {
    return Response.json({ error: "No active workspace" }, { status: 400 });
  }

  const role = await getUserRole(activeOrgId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // Get workspace context
  const [orgContext, org] = await Promise.all([
    getOrgProductContext(activeOrgId),
    prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { name: true, isPersonal: true },
    }),
  ]);

  const orgName = org?.isPersonal
    ? "Personal Workspace"
    : (org?.name ?? "Workspace");

  const contextBlock = orgContext?.setupCompleted
    ? `Product: ${orgContext.productName || "Not set"}
Description: ${orgContext.productDescription || "Not set"}
Target audience: ${orgContext.targetAudience || "Not set"}
Industry: ${orgContext.industry || "Not set"}`
    : "Product context not yet configured. Suggest the user set it up in Settings.";

  const body = await request.json();
  const { messages } = body;

  const result = streamText({
    model: getModel(),
    system: `You are the GoTofu AI assistant. You help users create personas, set up studies, and manage their research workspace.

Current workspace: ${orgName}
User: ${dbUser.name || dbUser.email}
Role: ${role}

${contextBlock}

Guidelines:
- Be concise and helpful
- Use the tools provided to take actions
- After creating something, mention what was created and offer next steps
- When listing items, use the list tools to show clickable results
- If the user asks to navigate somewhere, use the navigateTo tool
- Respond in the same language the user writes in
- If you don't know something, say so honestly`,
    messages,
    tools: {
      createPersonaGroup: tool({
        description:
          "Create a new persona group. Use this when the user wants to create personas.",
        inputSchema: zodSchema(
          z.object({
            name: z.string().describe("Name for the persona group"),
            description: z
              .string()
              .describe("Description of who these personas represent"),
          })
        ),
        execute: async ({ name, description }) => {
          const group = await createPersonaGroup({
            organizationId: activeOrgId,
            name,
            description,
            sourceType: "PROMPT_GENERATED",
          });
          return {
            name: group.name,
            id: group.id,
            url: `/personas/${group.id}`,
            message: `Created persona group "${name}". Go there to generate personas.`,
          };
        },
      }),

      createStudy: tool({
        description:
          "Create a new interview study. Use when user wants to run interviews or studies.",
        inputSchema: zodSchema(
          z.object({
            title: z.string().describe("Study title"),
            description: z
              .string()
              .optional()
              .describe("What the study aims to learn"),
            interviewGuide: z
              .string()
              .optional()
              .describe("Interview questions, one per line"),
            personaGroupIds: z
              .array(z.string())
              .describe("IDs of persona groups to include"),
          })
        ),
        execute: async ({
          title,
          description,
          interviewGuide,
          personaGroupIds,
        }) => {
          const study = await createStudy({
            organizationId: activeOrgId,
            createdById: dbUser.id,
            title,
            description,
            studyType: "INTERVIEW" as StudyType,
            interviewGuide,
            personaGroupIds,
          });
          return {
            name: title,
            id: study.id,
            url: `/studies/${study.id}`,
            message: `Created study "${title}". Go there to run interviews.`,
          };
        },
      }),

      setupStudyFromDescription: tool({
        description:
          "Set up a study automatically from a description. AI generates title, guide, and suggests persona groups.",
        inputSchema: zodSchema(
          z.object({
            description: z
              .string()
              .describe("What the user wants to learn from the study"),
          })
        ),
        execute: async ({ description }) => {
          const groups = await getPersonaGroupsForOrg(activeOrgId);
          const groupsForAi = groups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
          }));

          const { generateObject } = await import("ai");

          const setupSchema = z.object({
            title: z.string(),
            interviewGuide: z.array(z.string()),
            suggestedGroupIds: z.array(z.string()),
          });

          const { object } = await generateObject({
            model: getModel(),
            schema: setupSchema,
            prompt: `Generate a study setup for: "${description}"

Available persona groups: ${JSON.stringify(groupsForAi)}
${orgContext?.setupCompleted ? `Product: ${orgContext.productName}, Target: ${orgContext.targetAudience}` : ""}

Generate: title, 6-8 interview questions, and relevant group IDs.`,
          });

          const guide = object.interviewGuide.join("\n");
          const groupIds =
            object.suggestedGroupIds.length > 0
              ? object.suggestedGroupIds
              : groups.length > 0
                ? [groups[0].id]
                : [];

          if (groupIds.length === 0) {
            return {
              message:
                "No persona groups found. Create a persona group first, then set up the study.",
            };
          }

          const study = await createStudy({
            organizationId: activeOrgId,
            createdById: dbUser.id,
            title: object.title,
            description,
            studyType: "INTERVIEW" as StudyType,
            interviewGuide: guide,
            personaGroupIds: groupIds,
          });

          return {
            name: object.title,
            id: study.id,
            url: `/studies/${study.id}`,
            message: `Created study "${object.title}" with ${object.interviewGuide.length} interview questions.`,
          };
        },
      }),

      listPersonaGroups: tool({
        description: "List all persona groups in the current workspace.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const groups = await getPersonaGroupsForOrg(activeOrgId);
          return {
            items: groups.map((g) => ({
              id: g.id,
              name: g.name,
              url: `/personas/${g.id}`,
              detail: `${g._count?.personas ?? g.personaCount ?? 0} personas`,
            })),
            count: groups.length,
          };
        },
      }),

      listStudies: tool({
        description: "List all studies in the current workspace.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const studies = await getStudiesForOrg(activeOrgId);
          return {
            items: studies.map((s) => ({
              id: s.id,
              name: s.title,
              url: `/studies/${s.id}`,
              detail: `${s.status.toLowerCase()} · ${s._count.sessions} sessions`,
            })),
            count: studies.length,
          };
        },
      }),

      runBatchInterviews: tool({
        description:
          "Start batch interviews for all pending personas in a study.",
        inputSchema: zodSchema(
          z.object({
            studyId: z
              .string()
              .describe("The study ID to run interviews for"),
          })
        ),
        execute: async ({ studyId }) => {
          const { inngest } = await import("@/lib/inngest/client");
          await inngest.send({
            name: "study/run-batch",
            data: { studyId },
          });
          return {
            message:
              "Batch interviews started! Go to the study page to see progress.",
            url: `/studies/${studyId}`,
          };
        },
      }),

      getWorkspaceInfo: tool({
        description:
          "Get information about the current workspace including stats.",
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const [groupCount, personaCount, studyCount] = await Promise.all([
            prisma.personaGroup.count({
              where: { organizationId: activeOrgId },
            }),
            prisma.persona.count({
              where: { personaGroup: { organizationId: activeOrgId } },
            }),
            prisma.study.count({ where: { organizationId: activeOrgId } }),
          ]);

          return {
            workspace: orgName,
            productContext: orgContext?.setupCompleted
              ? {
                  product: orgContext.productName,
                  audience: orgContext.targetAudience,
                  industry: orgContext.industry,
                }
              : null,
            stats: {
              personaGroups: groupCount,
              personas: personaCount,
              studies: studyCount,
            },
          };
        },
      }),

      navigateTo: tool({
        description:
          "Navigate the user to a specific page in GoTofu. Use for pages like /personas, /studies, /settings, /dashboard, etc.",
        inputSchema: zodSchema(
          z.object({
            path: z
              .string()
              .describe(
                "The path to navigate to, e.g. /personas, /studies/new"
              ),
          })
        ),
        execute: async ({ path }) => {
          return { path, message: `Navigating to ${path}` };
        },
      }),
    },
  });

  return result.toTextStreamResponse();
}
