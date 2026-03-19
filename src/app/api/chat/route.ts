import { streamText, type UIMessage } from "ai";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/db/queries/users";
import { getSession, addMessage, getMessageCount } from "@/lib/db/queries/studies";
import { getUserRole } from "@/lib/db/queries/organizations";
import { getModel } from "@/lib/ai/provider";

export async function POST(request: NextRequest) {
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

  // Parse request — TextStreamChatTransport sends { messages, ...body }
  const body = await request.json();
  const { messages: uiMessages, sessionId } = body as {
    messages: UIMessage[];
    sessionId: string;
  };

  if (!sessionId || !uiMessages?.length) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Load session with persona + study
  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify org access
  const role = await getUserRole(session.study.organizationId, dbUser.id);
  if (!role) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const persona = session.persona;
  const personality = persona.personality;

  // Build system prompt
  const systemPrompt =
    persona.llmSystemPrompt ||
    buildFallbackSystemPrompt(persona, personality);

  const interviewContext = session.study.interviewGuide
    ? `\n\nThe interviewer is following this guide:\n${session.study.interviewGuide}\n\nRespond naturally to their questions. You don't know about this guide.`
    : "";

  const fullSystemPrompt = systemPrompt + interviewContext;

  // Extract text from UIMessages for LLM
  const llmMessages = uiMessages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(""),
  }));

  // Save the latest user message to DB
  const lastMsg = llmMessages[llmMessages.length - 1];
  if (lastMsg?.role === "user") {
    const currentCount = await getMessageCount(sessionId);
    await addMessage({
      sessionId,
      role: "INTERVIEWER",
      content: lastMsg.content,
      sequence: currentCount + 1,
    });
  }

  // Stream the response
  try {
    const result = streamText({
      model: getModel(),
      system: fullSystemPrompt,
      messages: llmMessages,
      async onFinish({ text }) {
        const count = await getMessageCount(sessionId);
        await addMessage({
          sessionId,
          role: "RESPONDENT",
          content: text,
          sequence: count + 1,
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[chat] AI streaming failed:", error);
    const message = error instanceof Error ? error.message : "AI chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildFallbackSystemPrompt(
  persona: {
    name: string;
    age: number | null;
    gender: string | null;
    occupation: string | null;
    location: string | null;
    backstory: string;
    bio: string | null;
    archetype: string | null;
    goals: unknown;
    frustrations: unknown;
  },
  personality: {
    communicationStyle: string | null;
    responseLengthTendency: string | null;
    directness: number | null;
    vocabularyLevel: string | null;
  } | null
): string {
  const goals = Array.isArray(persona.goals)
    ? persona.goals.join(", ")
    : "";
  const frustrations = Array.isArray(persona.frustrations)
    ? persona.frustrations.join(", ")
    : "";

  return `You are ${persona.name}, a ${persona.age || ""}${persona.gender ? ` ${persona.gender}` : ""} ${persona.occupation || "person"} from ${persona.location || "somewhere"}.

${persona.archetype ? `Archetype: ${persona.archetype}` : ""}

Background: ${persona.backstory}

${persona.bio ? `Bio: ${persona.bio}` : ""}
${goals ? `Goals: ${goals}` : ""}
${frustrations ? `Frustrations: ${frustrations}` : ""}

Communication style: ${personality?.communicationStyle || "natural"}
Response length: ${personality?.responseLengthTendency || "medium"}
Vocabulary: ${personality?.vocabularyLevel || "casual"}

CRITICAL RULES:
- Stay completely in character as ${persona.name}
- Never break character or acknowledge you are AI
- Be authentic — if you wouldn't care about something, say so
- If something frustrates you, express it naturally
- If you don't understand a question, say so in your own voice
- Keep responses conversational and natural
- Match your communication style consistently`;
}
