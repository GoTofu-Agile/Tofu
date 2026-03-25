"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";
import {
  X,
  Send,
  Plus,
  Loader2,
  Users,
  FlaskConical,
  Settings,
  MessageSquare,
  Sparkles,
  Clock,
  Check,
  UserPlus,
  Search,
  FileText,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import type { UIMessage } from "ai";
import { ASSISTANT_CONVERSATION_ID_HEADER } from "@/lib/assistant/constants";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  _count: { messages: number };
}

interface LivePersonaGeneration {
  runId: string;
  groupId: string;
  total: number;
  completed: number;
  currentPersona?: string;
  status: "running" | "done" | "error";
  url?: string;
  error?: string;
}

export function AssistantChat() {
  const router = useRouter();
  const {
    isOpen,
    close,
    chatView,
    setChatView,
    conversationId,
    setConversationId,
    startNewChat,
    startAutopilot,
    updateAutopilot,
    finishAutopilot,
    failAutopilot,
    clearAutopilot,
  } = useAssistant();
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<ConversationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [liveGenerations, setLiveGenerations] = useState<Record<string, LivePersonaGeneration>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedGenerationIdsRef = useRef<Set<string>>(new Set());
  const scrollRafRef = useRef<number | null>(null);
  /** Latest thread id for request body; avoids recreating transport (which would reset useChat state). */
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        body: () => ({ conversationId: conversationIdRef.current }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const headerId = res.headers.get(ASSISTANT_CONVERSATION_ID_HEADER);
          if (headerId) setConversationId(headerId);
          return res;
        },
      }),
    [setConversationId]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onError(error) {
      toast.error(error.message || "Something went wrong");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const panelTitle = conversationId
    ? history.find((conv) => conv.id === conversationId)?.title || "Chat"
    : "Ask GoTofu";
  const filteredHistory = history.filter((conv) => {
    const query = historyQuery.trim().toLowerCase();
    if (!query) return true;
    return (conv.title || "Untitled chat").toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: status === "streaming" ? "auto" : "smooth",
      });
    });
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [messages.length, status]);

  useEffect(() => {
    if (isOpen && chatView === "chat")
      setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, chatView]);

  // Handle navigation tool results
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      for (const part of lastMessage.parts) {
        if (
          part.type === "tool-navigateTo" &&
          "state" in part &&
          part.state === "output-available" &&
          "output" in part
        ) {
          const output = part.output as { path?: string };
          if (output?.path) router.push(output.path);
        }
      }
    }
  }, [messages, router]);

  const startLivePersonaGeneration = useCallback(
    async (payload: {
      runId: string;
      groupId: string;
      count: number;
      domainContext?: string;
      sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
      url?: string;
    }) => {
      const { runId, groupId, count, domainContext, sourceTypeOverride, url } = payload;

      setLiveGenerations((prev) => ({
        ...prev,
        [runId]: {
          runId,
          groupId,
          total: count,
          completed: 0,
          status: "running",
          url,
        },
      }));

      startAutopilot("Creating personas", "Navigating to personas and starting generation...");
      if (url) router.push(url);

      try {
        const res = await fetch("/api/personas/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            count,
            domainContext,
            sourceTypeOverride,
          }),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `Failed to start generation (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        updateAutopilot({
          title: "Generating personas",
          detail: "Agent is creating personas now...",
          status: "running",
        });

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line) {
              try {
                const evt = JSON.parse(line) as
                  | { type: "progress"; completed: number; total: number; personaName?: string }
                  | { type: "done"; generated: number }
                  | { type: "error"; message?: string };

                if (evt.type === "progress") {
                  updateAutopilot({
                    title: "Generating personas",
                    detail: evt.personaName
                      ? `Created ${evt.personaName}. Continuing...`
                      : "Creating personas...",
                    progress: {
                      completed: evt.completed,
                      total: evt.total ?? count,
                    },
                    status: "running",
                  });
                  setLiveGenerations((prev) => ({
                    ...prev,
                    [runId]: {
                      ...(prev[runId] ?? {
                        runId,
                        groupId,
                        total: evt.total ?? count,
                        completed: 0,
                        status: "running",
                        url,
                      }),
                      total: evt.total ?? prev[runId]?.total ?? count,
                      completed: evt.completed,
                      currentPersona: evt.personaName,
                      status: "running",
                    },
                  }));
                } else if (evt.type === "done") {
                  updateAutopilot({
                    title: "Finalizing",
                    detail: "Wrapping up and syncing the final page...",
                    status: "running",
                  });
                  finishAutopilot(`Done. Generated ${evt.generated} personas.`);
                  setLiveGenerations((prev) => ({
                    ...prev,
                    [runId]: {
                      ...(prev[runId] ?? {
                        runId,
                        groupId,
                        total: count,
                        completed: 0,
                        status: "running",
                        url,
                      }),
                      completed: evt.generated,
                      status: "done",
                    },
                  }));
                  if (url) router.push(url);
                  setTimeout(() => {
                    clearAutopilot();
                  }, 1800);
                } else if (evt.type === "error") {
                  failAutopilot(evt.message || "Persona generation failed.");
                  setLiveGenerations((prev) => ({
                    ...prev,
                    [runId]: {
                      ...(prev[runId] ?? {
                        runId,
                        groupId,
                        total: count,
                        completed: 0,
                        status: "running",
                        url,
                      }),
                      status: "error",
                      error: evt.message || "Generation failed",
                    },
                  }));
                }
              } catch {
                // ignore malformed line
              }
            }

            newlineIndex = buffer.indexOf("\n");
          }
        }
      } catch (error) {
        failAutopilot(error instanceof Error ? error.message : "Generation failed");
        setLiveGenerations((prev) => ({
          ...prev,
          [runId]: {
            ...(prev[runId] ?? {
              runId,
              groupId,
              total: count,
              completed: 0,
              status: "running",
              url,
            }),
            status: "error",
            error: error instanceof Error ? error.message : "Generation failed",
          },
        }));
        setTimeout(() => {
          clearAutopilot();
        }, 2500);
      }
    },
    [
      router,
      startAutopilot,
      updateAutopilot,
      finishAutopilot,
      failAutopilot,
      clearAutopilot,
    ]
  );

  useEffect(() => {
    const message = messages[messages.length - 1];
    if (!message || message.role !== "assistant") return;

    for (let i = 0; i < message.parts.length; i++) {
      const part = message.parts[i];
      if (
        part.type !== "tool-generatePersonas" ||
        !("state" in part) ||
        part.state !== "output-available" ||
        !("output" in part)
      ) {
        continue;
      }

      const output = part.output as {
        runId?: string;
        groupId?: string;
        count?: number;
        domainContext?: string;
        sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
        status?: string;
        url?: string;
      };

      if (
        output?.status !== "started" ||
        !output?.runId ||
        !output?.groupId ||
        !output?.count
      ) {
        continue;
      }

      const dedupeKey = `${message.id}:${i}:${output.runId}`;
      if (startedGenerationIdsRef.current.has(dedupeKey)) continue;
      startedGenerationIdsRef.current.add(dedupeKey);

      void startLivePersonaGeneration({
        runId: output.runId,
        groupId: output.groupId,
        count: output.count,
        domainContext: output.domainContext,
        sourceTypeOverride: output.sourceTypeOverride,
        url: output.url,
      });
    }
  }, [messages, startLivePersonaGeneration]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/assistant/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.conversations ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/assistant/history/${id}`);
        if (res.ok) {
          const data = await res.json();
          conversationIdRef.current = id;
          setConversationId(id);
          // Convert DB messages to UIMessage format
          const uiMessages: UIMessage[] = (data.messages ?? []).map(
            (m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content }],
              createdAt: new Date(),
            })
          );
          setMessages(uiMessages);
          setChatView("chat");
        }
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [setConversationId, setMessages, setChatView]
  );

  function handleSend(text?: string) {
    const msg = text || inputValue.trim();
    if (!msg || isLoading) return;
    sendMessage({ text: msg });
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = "24px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const textarea = e.target;
    setInputValue(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  function getMessageText(message: UIMessage): string {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }

  function getToolParts(message: UIMessage) {
    const parts: { toolName: string; state: string; result?: Record<string, unknown> }[] = [];
    for (const part of message.parts) {
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        part.type !== "tool-navigateTo" &&
        "state" in part
      ) {
        const entry: { toolName: string; state: string; result?: Record<string, unknown> } = {
          toolName: part.type.replace("tool-", ""),
          state: part.state as string,
        };
        if (part.state === "output-available" && "output" in part) {
          entry.result = (part.output as Record<string, unknown>) ?? {};
        }
        parts.push(entry);
      }
    }
    return parts;
  }

  const parsedMessages = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: getMessageText(message),
        toolParts: getToolParts(message),
      })),
    [messages]
  );

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ── Single aside with Chat + History overlay ──
  return (
    <aside
      id="ask-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ask-panel-title"
      className={cn(
      "fixed top-4 bottom-4 right-0 w-[23rem] flex flex-col transition-all duration-300 ease-out",
      isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      )}
    >
      {/* Chat content (always rendered) */}
      <div className={cn(
        "relative flex flex-col h-full transition-all duration-200",
        chatView === "history" ? "scale-[0.98] opacity-20 pointer-events-none" : ""
      )}>
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-stone-200/80 pl-3 pr-3">
          <div className="flex items-center gap-1.5">
            <span id="ask-panel-title" className="text-sm font-semibold text-stone-900">
              {panelTitle}
            </span>
          </div>
          <div className="flex items-center gap-[1px]">
            <button
              type="button"
              onClick={() => {
                conversationIdRef.current = null;
                startNewChat();
                setMessages([]);
              }}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="New chat"
              aria-label="Start new chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setChatView("history");
                loadHistory();
              }}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="Chat history"
              aria-label="Open chat history"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="Close Ask"
              aria-label="Close Ask"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={isLoading}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-32 space-y-3"
        >
          {messages.length === 0 && (
            <p className="my-2 text-[14px] leading-6 text-stone-600">
              I can create personas, set up studies, and summarize results. Try: &quot;Create 5 personas for B2B founders.&quot;
            </p>
          )}

          {parsedMessages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div key={message.id} className="my-2.5 space-y-2">
                {isUser && message.text ? (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl bg-stone-900 px-4 py-3 text-[14px] leading-6 text-white shadow-sm">
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.toolParts.map((tp, i) => (
                      <ToolResultCard
                        key={`${message.id}-tool-${i}`}
                        toolName={tp.toolName}
                        state={tp.state}
                        result={tp.result}
                        liveGeneration={
                          tp.toolName === "generatePersonas" &&
                          tp.result?.runId &&
                          typeof tp.result.runId === "string"
                            ? liveGenerations[tp.result.runId]
                            : undefined
                        }
                        onNavigate={(path) => router.push(path)}
                      />
                    ))}

                    {message.text && (
                      <div className="text-[14px] leading-6 text-stone-900">
                        <AssistantRichText
                          text={message.text}
                          onNavigate={(path) => router.push(path)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-1 py-2">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
              <span className="sr-only">Assistant is typing</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="relative mx-4 mb-0 border-t border-stone-200/80 pt-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to create personas, start a study, or find insights..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-stone-300 bg-white px-3 py-2.5 pb-10 text-[14px] text-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:border-stone-500 transition-colors"
            style={{ minHeight: "2.75rem", maxHeight: "10rem" }}
            aria-label="Ask assistant input"
          />
          <div className="absolute bottom-2.5 right-2.5">
            <button
              type="button"
              disabled={!inputValue.trim() || isLoading}
              onClick={() => handleSend()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-white disabled:opacity-30 transition-colors hover:bg-stone-800"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* History overlay */}
      {chatView === "history" && (
        <div className="absolute inset-0 z-20">
          <div className="flex flex-col h-full bg-background rounded-[1.25rem] shadow-lg ring-1 ring-stone-200 overflow-hidden">
            <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-1.5">
              <span className="text-sm font-semibold text-stone-900">Chat History</span>
              <button
                type="button"
                onClick={() => setChatView("chat")}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                aria-label="Close chat history"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-3 pb-2 space-y-2">
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-stone-400"
                aria-label="Search chat history"
              />
              {history.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadConversation(history[0].id)}
                    className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Continue latest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      conversationIdRef.current = null;
                      startNewChat();
                      setMessages([]);
                      setChatView("chat");
                    }}
                    className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Start new
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-stone-500">
                  {history.length === 0
                    ? "No chats yet. Your conversations will appear here."
                    : "No chats match your search."}
                </p>
              ) : (
                <ul>
                  {filteredHistory.map((conv) => (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => loadConversation(conv.id)}
                        className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                      >
                        <span className="text-[13px] font-medium line-clamp-1 text-stone-900">
                          {conv.title || "Untitled chat"}
                        </span>
                        <span className="text-[12px] text-stone-500">
                          {formatTimeAgo(conv.updatedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

const TOOL_LABELS: Record<string, string> = {
  createPersonaGroup: "Creating persona group",
  createStudy: "Creating study",
  setupStudyFromDescription: "Setting up study",
  listPersonaGroups: "Fetching persona groups",
  listStudies: "Fetching studies",
  runBatchInterviews: "Starting batch interviews",
  getWorkspaceInfo: "Loading workspace info",
  updateProductContext: "Updating product context",
  generatePersonas: "Generating personas",
  getPersonaDetails: "Loading persona details",
  getStudyInsights: "Loading study insights",
  inviteTeamMember: "Sending invitation",
};

const TOOL_ICONS: Record<string, typeof Users> = {
  createPersonaGroup: Users,
  createStudy: FlaskConical,
  setupStudyFromDescription: FlaskConical,
  listPersonaGroups: Users,
  listStudies: FlaskConical,
  runBatchInterviews: MessageSquare,
  getWorkspaceInfo: Settings,
  navigateTo: Compass,
  updateProductContext: Settings,
  generatePersonas: Sparkles,
  getPersonaDetails: Search,
  getStudyInsights: FileText,
  inviteTeamMember: UserPlus,
};

function ToolResultCard({
  toolName,
  state,
  result,
  liveGeneration,
  onNavigate,
}: {
  toolName: string;
  state: string;
  result?: Record<string, unknown>;
  liveGeneration?: LivePersonaGeneration;
  onNavigate: (path: string) => void;
}) {
  const label = TOOL_LABELS[toolName] || toolName;
  const isPending = state === "call" || state === "partial-call";
  const isDone = state === "output-available";

  // Pending state — spinner + label
  if (isPending) {
    if (toolName === "generatePersonas") {
      return (
        <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-stone-100 text-stone-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-900">Persona generation</p>
                <p className="text-[12px] text-stone-600">Preparing generation workflow...</p>
              </div>
            </div>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
              Starting
            </span>
          </div>

          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-stone-700" />
            </div>
            <p className="mt-1 text-[12px] text-stone-600">Creating personas...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[13px] text-stone-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>{label}...</span>
      </div>
    );
  }

  // Completed state — checkmark + label
  if (isDone && result) {
    // Suppress noisy "list/fetch" confirmations that add clutter during flows.
    if (
      toolName === "listPersonaGroups" ||
      toolName === "listStudies" ||
      toolName === "createPersonaGroup"
    ) {
      return null;
    }

    const url = result.url as string | undefined;
    const generationStatus = result.status as string | undefined;

    if (toolName === "generatePersonas" && generationStatus === "started") {
      const completed = liveGeneration?.completed ?? 0;
      const total = liveGeneration?.total ?? ((result.count as number | undefined) ?? 0);
      const progressPercent =
        total > 0 ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;
      const currentPersona = liveGeneration?.currentPersona;
      const isRunning = !liveGeneration || liveGeneration.status === "running";
      const isDoneLive = liveGeneration?.status === "done";
      const isError = liveGeneration?.status === "error";
      const actionLabel = isDoneLive ? "View created personas" : "View live progress";
      return (
        <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full",
                  isError
                    ? "bg-red-100 text-red-700"
                    : isDoneLive
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-600"
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isError ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-stone-900">Persona generation</p>
                <p className="text-[12px] text-stone-600">
                  {isError
                    ? "Stopped with an error"
                    : isDoneLive
                      ? "Completed successfully"
                      : "Running live in this workspace"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                isError
                  ? "bg-red-100 text-red-700"
                  : isDoneLive
                    ? "bg-green-100 text-green-700"
                    : "bg-stone-100 text-stone-600"
              )}
            >
              {isError ? "Error" : isDoneLive ? "Done" : `${completed}/${total || "?"}`}
            </span>
          </div>

          {!isError && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isDoneLive ? "bg-green-600" : "bg-stone-700"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[12px] text-stone-600">
                {isDoneLive
                  ? `Generated ${completed} personas`
                  : `Generating personas... ${progressPercent}%`}
              </p>
            </div>
          )}

          {currentPersona && isRunning && (
            <p className="mt-2 rounded-lg bg-stone-50 px-2 py-1 text-[12px] text-stone-700">
              Created: <span className="font-medium text-stone-800">{currentPersona}</span>
            </p>
          )}

          {isError && (
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[12px] text-red-700">
              {liveGeneration?.error || "Persona generation failed"}
            </p>
          )}

          {url && (
            <button
              onClick={() => onNavigate(url)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[12px] font-medium text-stone-700 transition-colors hover:bg-stone-100"
            >
              {actionLabel}
              <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>
      );
    }

    // List results (persona groups, studies)
    if (Array.isArray(result.items)) {
      const items = result.items as { name: string; id: string; url: string; detail?: string }[];
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.url)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[12px] text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
            >
              <span className="font-medium truncate">{item.name}</span>
              {item.detail && (
                <span className="ml-auto text-stone-400 shrink-0 text-[11px]">{item.detail}</span>
              )}
            </button>
          ))}
        </div>
      );
    }

    // Action with navigatable result
    return (
      <button
        onClick={() => url && onNavigate(url)}
        disabled={!url}
        className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800 transition-colors hover:bg-green-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
      >
        <Check className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">{result.message as string || label}</span>
      </button>
    );
  }

  return null;
}

function AssistantRichText({
  text,
  onNavigate,
}: {
  text: string;
  onNavigate: (path: string) => void;
}) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);
  let key = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap break-words">
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const label = match[1];
    const rawHref = match[2]?.trim() ?? "";
    const href = normalizeAssistantHref(rawHref);

    if (href.type === "internal") {
      nodes.push(
        <button
          key={`l-${key++}`}
          onClick={() => onNavigate(href.value)}
          className="inline-flex items-center gap-1 rounded-md px-1 text-stone-900 underline underline-offset-2 hover:bg-stone-100"
        >
          {label}
          <ArrowUpRight className="h-3 w-3" />
        </button>
      );
    } else if (href.type === "external") {
      nodes.push(
        <a
          key={`l-${key++}`}
          href={href.value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-1 text-stone-900 underline underline-offset-2 hover:bg-stone-100"
        >
          {label}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      );
    } else {
      nodes.push(
        <span key={`l-${key++}`} className="whitespace-pre-wrap break-words">
          {match[0]}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap break-words">
        {text.slice(lastIndex)}
      </span>
    );
  }

  return <p>{nodes}</p>;
}

function normalizeAssistantHref(
  href: string
): { type: "internal" | "external" | "invalid"; value: string } {
  if (!href) return { type: "invalid", value: href };
  if (href.startsWith("#/")) return { type: "internal", value: href.slice(1) };
  if (href.startsWith("/")) return { type: "internal", value: href };
  if (/^https?:\/\//i.test(href)) return { type: "external", value: href };
  return { type: "invalid", value: href };
}
