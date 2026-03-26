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
} from "lucide-react";
import type { UIMessage } from "ai";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  _count: { messages: number };
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
  } = useAssistant();
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<ConversationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        body: { conversationId },
      }),
    [conversationId]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onError(error) {
      toast.error(error.message || "Something went wrong");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <aside className={cn(
      "fixed top-4 bottom-4 right-0 w-[21rem] flex flex-col transition-all duration-300 ease-out",
      isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
    )}>
      {/* Chat content (always rendered) */}
      <div className={cn(
        "relative flex flex-col h-full transition-all duration-200",
        chatView === "history" ? "scale-[0.98] opacity-20 pointer-events-none" : ""
      )}>
        {/* Header */}
        <div className="flex h-12 items-center justify-between pl-3 pr-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-stone-900">New chat</span>
          </div>
          <div className="flex items-center gap-[1px]">
            <button
              onClick={() => {
                startNewChat();
                setMessages([]);
              }}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setChatView("history");
                loadHistory();
              }}
              className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="Chat history"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-1.5 pb-32 space-y-1.5">
          {messages.length === 0 && (
            <p className="my-2 text-[14px] leading-6 text-stone-600">
              I can create personas, set up studies, and summarize results. Try: &quot;Create 5
              personas for B2B founders.&quot;
            </p>
          )}

          {messages.map((message) => {
            const text = getMessageText(message);
            const toolParts = getToolParts(message);
            const isUser = message.role === "user";

            return (
              <div key={message.id} className="my-1.5 space-y-1.5">
                {isUser && text ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-stone-200 px-4 py-3 text-[13px] leading-5 text-stone-900">
                      <p className="whitespace-pre-wrap break-words">{text}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {toolParts.map((tp, i) => (
                      <ToolResultCard
                        key={`${message.id}-tool-${i}`}
                        toolName={tp.toolName}
                        state={tp.state}
                        result={tp.result}
                        onNavigate={(path) => router.push(path)}
                      />
                    ))}

                    {text && (
                      <div className="text-[13px] leading-5 text-stone-900">
                        <p className="whitespace-pre-wrap break-words">{text}</p>
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
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="relative mx-4 mb-0">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-3 py-2.5 pb-10 text-[13px] text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-stone-400 transition-colors"
            style={{ minHeight: "7.5rem" }}
          />
          <div className="absolute bottom-2.5 right-2.5">
            <button
              disabled={!inputValue.trim() || isLoading}
              onClick={() => handleSend()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white disabled:opacity-30 transition-colors hover:bg-stone-800"
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
                onClick={() => setChatView("chat")}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-stone-400">
                  No previous chats
                </p>
              ) : (
                <ul>
                  {history.map((conv) => (
                    <li key={conv.id}>
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-50"
                      >
                        <span className="text-[13px] font-medium line-clamp-1 text-stone-900">
                          {conv.title || "Untitled chat"}
                        </span>
                        <span className="text-[13px] text-stone-400">
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
  onNavigate,
}: {
  toolName: string;
  state: string;
  result?: Record<string, unknown>;
  onNavigate: (path: string) => void;
}) {
  const label = TOOL_LABELS[toolName] || toolName;
  const isPending = state === "call" || state === "partial-call";
  const isDone = state === "output-available";

  // Pending state — spinner + label
  if (isPending) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-[13px] text-stone-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>{label}...</span>
      </div>
    );
  }

  // Completed state — checkmark + label
  if (isDone && result) {
    const url = result.url as string | undefined;

    // List results (persona groups, studies)
    if (Array.isArray(result.items)) {
      const items = result.items as { name: string; id: string; url: string; detail?: string }[];
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-[13px] text-green-700">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.url)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[12px] text-stone-700 transition-colors hover:bg-stone-100"
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
        className="flex w-full items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-[13px] text-green-700 transition-colors hover:bg-stone-200 text-left"
      >
        <Check className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">{result.message as string || label}</span>
      </button>
    );
  }

  return null;
}
