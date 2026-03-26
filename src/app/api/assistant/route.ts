import { streamText, tool, zodSchema, stepCountIs, convertToModelMessages } from "ai";
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
  getPersona,
} from "@/lib/db/queries/personas";
import {
  createStudy,
  getStudiesForOrg,
  getAnalysisReport,
} from "@/lib/db/queries/studies";
import {
  getOrgProductContext,
  createInvitation,
} from "@/lib/db/queries/organizations";
import {
  createConversation,
  addChatMessage,
  updateConversationTitle,
} from "@/lib/db/queries/chat";
import { resolveActiveOrganizationId } from "@/lib/auth";
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

  const cookieStore = await cookies();
  const activeOrgId = await resolveActiveOrganizationId(
    cookieStore.get("activeOrgId")?.value,
    dbUser.id
  );
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
  const { messages: uiMessages, conversationId: existingConvId } = body;

  // Convert UIMessages to ModelMessages for streamText
  const messages = await convertToModelMessages(uiMessages ?? []);

  // Persist: create or reuse conversation
  let convId = existingConvId as string | null;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText =
    lastUserMsg && "content" in lastUserMsg
      ? typeof lastUserMsg.content === "string"
        ? lastUserMsg.content
        : ""
      : "";

  if (lastUserText) {
    if (!convId) {
      const conv = await createConversation(activeOrgId, dbUser.id);
      convId = conv.id;
      // Set title from first message
      await updateConversationTitle(
        convId,
        lastUserText.slice(0, 60) + (lastUserText.length > 60 ? "..." : "")
      );
    }
    await addChatMessage(convId, "user", lastUserText);
  }

  const result = streamText({
    model: getModel(),
    system: `You are the GoTofu AI agent. You don't just chat — you take action. You help users create personas, set up studies, manage their workspace, invite team members, and configure their product.

Current workspace: ${orgName}
User: ${dbUser.name || dbUser.email}
Role: ${role}

${contextBlock}

YOUR TOOLS:
- createPersonaGroup: Create a persona group
- generatePersonas: Generate AI personas in a group
- createStudy / setupStudyFromDescription: Create studies
- runBatchInterviews: Run all interviews in a study
- listPersonaGroups / listStudies: List resources
- getPersonaDetails: Get detailed persona info
- getStudyInsights: Get study analysis results
- getWorkspaceInfo: Get workspace stats
- updateProductContext: Set up product info
- inviteTeamMember: Send team invitations
- navigateTo: Navigate the app

BEHAVIOR RULES:
- Be ACTION-ORIENTED. When you know what to do, do it immediately.
- SMART FOLLOW-UPS: If the user's request is vague, ask ONE short clarifying question first. Examples:
  - "Personas erstellen" → ask "Fuer welche Zielgruppe? Und wie viele soll ich erstellen?"
  - "Studie aufsetzen" → ask "Was moechtest du herausfinden?"
  - But if specific enough ("Erstell 5 Personas fuer Studenten aus Asien"), execute immediately.
- Chain multiple tools when needed. E.g. "Create personas and set up a study" → createPersonaGroup → generatePersonas → navigateTo the group page → setupStudyFromDescription.
- When the user describes their product, IMMEDIATELY call updateProductContext.
- After generating personas, call navigateTo to show the persona group page so the user can watch progress.
- When user asks to open/show/go to something, use navigateTo — the user sees the app navigate live in the window next to this chat.
- Be concise — one or two sentences max after tool execution.
- Respond in the user's language.`,
    messages,
    stopWhen: stepCountIs(8),
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

      updateProductContext: tool({
        description:
          "Update the workspace product context. Use when user describes their product, target audience, or industry.",
        inputSchema: zodSchema(
          z.object({
            productName: z.string().optional().describe("Product name"),
            productDescription: z.string().optional().describe("What the product does"),
            targetAudience: z.string().optional().describe("Who the product is for"),
            industry: z.string().optional().describe("Industry/domain"),
            competitors: z.string().optional().describe("Known competitors"),
          })
        ),
        execute: async ({ productName, productDescription, targetAudience, industry, competitors }) => {
          await prisma.organization.update({
            where: { id: activeOrgId },
            data: {
              ...(productName && { productName }),
              ...(productDescription && { productDescription }),
              ...(targetAudience && { targetAudience }),
              ...(industry && { industry }),
              ...(competitors && { competitors }),
              setupCompleted: true,
            },
          });
          return {
            message: `Updated product context: ${[productName, targetAudience, industry].filter(Boolean).join(", ")}`,
          };
        },
      }),

      generatePersonas: tool({
        description:
          "Generate AI personas for a persona group. Use when user wants to create/generate personas.",
        inputSchema: zodSchema(
          z.object({
            groupId: z.string().describe("Persona group ID to generate personas for"),
            count: z.number().min(1).max(10).default(5).describe("Number of personas to generate"),
            domainContext: z.string().optional().describe("Additional context about who these personas should be"),
          })
        ),
        execute: async ({ groupId, count, domainContext }) => {
          const { generateAndSavePersonas } = await import("@/lib/ai/generate-personas");
          const contextStr = [
            domainContext,
            orgContext?.productDescription,
            orgContext?.targetAudience ? `Target audience: ${orgContext.targetAudience}` : "",
            orgContext?.industry ? `Industry: ${orgContext.industry}` : "",
          ].filter(Boolean).join("\n");

          const result = await generateAndSavePersonas({
            groupId,
            count,
            domainContext: contextStr || undefined,
            sourceTypeOverride: "PROMPT_GENERATED",
          });
          return {
            message: `Generated ${result.generated} personas`,
            url: `/personas/${groupId}`,
            count: result.generated,
          };
        },
      }),

      getPersonaDetails: tool({
        description:
          "Get detailed info about a specific persona including personality traits and backstory.",
        inputSchema: zodSchema(
          z.object({
            personaId: z.string().describe("The persona ID"),
          })
        ),
        execute: async ({ personaId }) => {
          const persona = await getPersona(personaId);
          if (!persona) return { message: "Persona not found" };
          return {
            name: persona.name,
            occupation: persona.occupation,
            age: persona.age,
            backstory: persona.backstory,
            personality: persona.personality
              ? {
                  openness: persona.personality.openness,
                  conscientiousness: persona.personality.conscientiousness,
                  extraversion: persona.personality.extraversion,
                  agreeableness: persona.personality.agreeableness,
                  neuroticism: persona.personality.neuroticism,
                }
              : null,
            archetype: persona.archetype,
            goals: persona.goals,
            frustrations: persona.frustrations,
            url: `/personas/${persona.personaGroup.id}/${persona.id}`,
            message: `${persona.name} — ${persona.occupation || "Unknown role"}, age ${persona.age || "?"}`,
          };
        },
      }),

      getStudyInsights: tool({
        description:
          "Get analysis results and insights from a completed study.",
        inputSchema: zodSchema(
          z.object({
            studyId: z.string().describe("The study ID"),
          })
        ),
        execute: async ({ studyId }) => {
          const report = await getAnalysisReport(studyId);
          if (!report) return { message: "No analysis report found. Run interviews first, then insights will be generated." };
          return {
            title: report.title,
            summary: report.summary,
            themes: report.themes,
            recommendations: report.recommendations,
            sentiment: report.sentimentBreakdown,
            url: `/studies/${studyId}`,
            message: `Study insights: ${report.summary?.slice(0, 100)}...`,
          };
        },
      }),

      inviteTeamMember: tool({
        description:
          "Invite a team member to the current workspace by email.",
        inputSchema: zodSchema(
          z.object({
            email: z.string().email().describe("Email address to invite"),
            memberRole: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER").describe("Role for the new member"),
          })
        ),
        execute: async ({ email, memberRole }) => {
          const invitation = await createInvitation(activeOrgId, email, memberRole);
          const origin = request.headers.get("origin") || "http://localhost:3004";
          const inviteUrl = `${origin}/accept-invite/${invitation.token}`;
          return {
            message: `Invited ${email} as ${memberRole}. Share this link: ${inviteUrl}`,
            email,
            role: memberRole,
            inviteUrl,
          };
        },
      }),
    },
    async onFinish({ text }) {
      if (convId && text) {
        await addChatMessage(convId, "assistant", text);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
