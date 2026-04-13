"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";
import {
  X,
  Send,
  Plus,
  Loader2,
  Shuffle,
  Copy,
  RotateCcw,
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
  ChevronRight,
} from "lucide-react";
import type { UIMessage } from "ai";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { ASSISTANT_CONVERSATION_ID_HEADER } from "@/lib/assistant/constants";
import { normalizeAssistantHref } from "@/lib/assistant/nav-href";

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

interface PendingPersonaDesign {
  dedupeKey: string;
  runId: string;
  groupId: string;
  count: number;
  domainContext?: string;
  sourceTypeOverride?: "PROMPT_GENERATED" | "DATA_BASED" | "UPLOAD_BASED";
}

const ASK_DRAFT_STORAGE_KEY = "gotofu.ask.draft";

function trackAssistantEvent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("assistant:telemetry", {
      detail: { event, payload, ts: Date.now() },
    })
  );
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
  const [pendingPersonaDesign, setPendingPersonaDesign] = useState<PendingPersonaDesign | null>(null);
  const [personaDesignCount, setPersonaDesignCount] = useState(5);
  const [personaDesignPrompt, setPersonaDesignPrompt] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState("");
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedGenerationIdsRef = useRef<Set<string>>(new Set());
  const dismissedGenerationIdsRef = useRef<Set<string>>(new Set());
  const scrollRafRef = useRef<number | null>(null);
  const hasLoadedDraftRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
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
      const msg = error.message || "Something went wrong";
      setChatError(msg);
      toast.error(msg);
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
  const suggestedPrompts = useMemo(
    () => [
      "Create 5 personas for B2B SaaS founders",
      "Set up a study to understand onboarding friction",
      "Summarize insights from my latest study",
      "Invite a teammate as MEMBER",
    ],
    []
  );
  const latestAssistantMessageId = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null,
    [messages]
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (pendingPersonaDesign) {
          dismissedGenerationIdsRef.current.add(pendingPersonaDesign.dedupeKey);
          setPendingPersonaDesign(null);
          setPersonaDesignCount(5);
          setPersonaDesignPrompt("");
          toast.message("Persona creation canceled.");
          return;
        }
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, pendingPersonaDesign]);

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

  useEffect(() => {
    if (!isOpen || hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    try {
      const saved = window.localStorage.getItem(ASK_DRAFT_STORAGE_KEY);
      if (saved) setInputValue(saved);
    } catch {
      // ignore
    }
  }, [isOpen]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    try {
      if (inputValue.trim()) {
        window.localStorage.setItem(ASK_DRAFT_STORAGE_KEY, inputValue);
      } else {
        window.localStorage.removeItem(ASK_DRAFT_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [inputValue]);

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
            speedMode: "fast",
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
      if (dismissedGenerationIdsRef.current.has(dedupeKey)) continue;
      if (pendingPersonaDesign?.dedupeKey === dedupeKey) continue;

      setPendingPersonaDesign({
        dedupeKey,
        runId: output.runId,
        groupId: output.groupId,
        count: output.count,
        domainContext: output.domainContext,
        sourceTypeOverride: output.sourceTypeOverride,
      });
    }
  }, [messages, pendingPersonaDesign]);

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
    const msg = (text ?? inputValue).trim();
    if (!msg || isLoading) return;
    if (msg.length > 2000) {
      toast.error("Message is too long. Keep it under 2000 characters.");
      return;
    }
    setChatError(null);
    setLastUserPrompt(msg);
    trackAssistantEvent("ask_send", { source: text ? "suggestion_or_action" : "input" });
    sendMessage({ text: msg });
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = "24px";
  }

  function handleRetry() {
    if (!lastUserPrompt || isLoading) return;
    setChatError(null);
    trackAssistantEvent("ask_retry");
    sendMessage({ text: lastUserPrompt });
  }

  function handleRegenerate() {
    if (!lastUserPrompt || isLoading) return;
    setChatError(null);
    trackAssistantEvent("ask_regenerate");
    sendMessage({ text: `Regenerate your previous answer. Keep the same intent, but improve clarity and structure.` });
  }

  function handleImproveAnswer() {
    if (isLoading) return;
    setChatError(null);
    trackAssistantEvent("ask_improve");
    sendMessage({
      text: "Improve your previous answer: make it more actionable, concise, and better structured with clear next steps.",
    });
  }

  function handleContinueAnswer() {
    if (isLoading) return;
    setChatError(null);
    trackAssistantEvent("ask_continue");
    sendMessage({ text: "Continue your previous answer from where you stopped." });
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      trackAssistantEvent("ask_copy_response");
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
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

  useEffect(() => {
    if (!pendingPersonaDesign) return;
    setPersonaDesignCount(pendingPersonaDesign.count);
    // Prefill from the user's latest ask (not injected workspace context).
    const latestUserText = [...messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.parts.filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
    setPersonaDesignPrompt(latestUserText || "");
  }, [pendingPersonaDesign, messages]);

  const personaPromptPresets = useMemo(
    () => [
      "B2B SaaS founders at seed to Series A stage. Include distinct growth, product, and operations mindsets.",
      "Freelancers and solo creators in Europe who juggle client work, admin, and cash-flow uncertainty.",
      "Product managers at mid-size tech companies balancing roadmap pressure, stakeholder alignment, and research gaps.",
      "E-commerce operators focused on repeat purchases, margins, and operational efficiency across small teams.",
      "HR and People Ops leaders in scaling startups navigating hiring velocity, retention, and culture consistency.",
    ],
    []
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

  function handleCancelPersonaDesign() {
    if (pendingPersonaDesign) {
      dismissedGenerationIdsRef.current.add(pendingPersonaDesign.dedupeKey);
    }
    setPendingPersonaDesign(null);
    setPersonaDesignCount(5);
    setPersonaDesignPrompt("");
    toast.message("Persona creation canceled.");
  }

  function handleConfirmPersonaDesign() {
    if (!pendingPersonaDesign) return;
    const finalCount = Math.max(1, Math.min(10, personaDesignCount || pendingPersonaDesign.count));
    if (!finalCount) {
      toast.error("Please choose how many personas to generate.");
      return;
    }

    startedGenerationIdsRef.current.add(pendingPersonaDesign.dedupeKey);
    void startLivePersonaGeneration({
      runId: pendingPersonaDesign.runId,
      groupId: pendingPersonaDesign.groupId,
      count: finalCount,
      domainContext: personaDesignPrompt.trim() || undefined,
      sourceTypeOverride: pendingPersonaDesign.sourceTypeOverride,
      url: `/personas/${pendingPersonaDesign.groupId}`,
    });
    setPendingPersonaDesign(null);
    setPersonaDesignCount(5);
    setPersonaDesignPrompt("");
  }

  function shufflePersonaPrompt() {
    if (personaPromptPresets.length === 0) return;
    const randomPrompt =
      personaPromptPresets[Math.floor(Math.random() * personaPromptPresets.length)];
    setPersonaDesignPrompt(randomPrompt);
  }

  // ── Single aside with Chat + History overlay ──
  const askLayer = (
    <>
      {isOpen && pendingPersonaDesign && (
        <div className="pointer-events-auto fixed inset-y-0 left-0 right-[23rem] z-40 bg-stone-900/20 backdrop-blur-[1px] max-md:hidden" />
      )}

      <aside
        id="ask-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-panel-title"
        className={cn(
        // Solid surface + high z-index so fixed UI under the viewport inset (e.g. insights chat at z-40)
        // cannot show through transparent panel chrome.
        "fixed z-[100] flex flex-col overflow-hidden bg-background shadow-2xl ring-1 ring-border/80 transition-all duration-300 ease-out",
        "inset-0 h-dvh w-screen rounded-none sm:top-2 sm:bottom-2 sm:right-0 sm:left-auto sm:h-auto sm:w-[min(23rem,100vw-0.75rem)] sm:rounded-l-2xl",
        isOpen
          ? "translate-x-0 opacity-100"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 pointer-events-none"
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
            <span id="ask-panel-title" className="text-[13px] font-semibold text-stone-900">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
              title="Chat history"
              aria-label="Open chat history"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
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
            <div className="my-2 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[13px] leading-5 text-stone-700">
                Ask can create personas, set up studies, run interviews, and summarize insights.
              </p>
              <p className="text-[11px] leading-snug text-stone-500">
                Tip: Press <span className="font-medium text-stone-600">{"\u2318K"}</span> (Mac) or{" "}
                <span className="font-medium text-stone-600">Ctrl+K</span> anytime to toggle Ask from anywhere
                in the app.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      trackAssistantEvent("ask_click_suggestion", { prompt });
                      handleSend(prompt);
                    }}
                    className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-700 hover:bg-stone-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <p>{chatError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {parsedMessages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div key={message.id} className="my-2.5 space-y-2">
                {isUser && message.text ? (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl bg-stone-900 px-3.5 py-2.5 text-[13px] leading-5 text-white shadow-sm">
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
                      <div className="text-[13px] leading-5 text-stone-900">
                        <AssistantRichText
                          text={message.text}
                          onNavigate={(path) => router.push(path)}
                          collapsed={!expandedResponses[message.id]}
                        />
                        {message.text.length > 700 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedResponses((prev) => ({
                                ...prev,
                                [message.id]: !prev[message.id],
                              }))
                            }
                            className="mt-1 text-[12px] font-medium text-stone-600 hover:text-stone-900"
                          >
                            {expandedResponses[message.id] ? "Show less" : "Show more"}
                          </button>
                        )}
                        {message.id === latestAssistantMessageId && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.text)}
                            className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                          >
                            <span className="inline-flex items-center gap-1"><Copy className="h-3 w-3" />Copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={isLoading}
                            className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            Regenerate
                          </button>
                          <button
                            type="button"
                            onClick={handleImproveAnswer}
                            disabled={isLoading}
                            className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            Improve
                          </button>
                          <button
                            type="button"
                            onClick={handleContinueAnswer}
                            disabled={isLoading}
                            className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                          >
                            Continue
                          </button>
                          </div>
                        )}
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
        <div className="mx-4 mb-0 border-t border-stone-200/80 pt-3">
          <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about personas, studies, or insights..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-stone-300 bg-white px-3 py-2.5 pb-10 text-[13px] text-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:border-stone-500 transition-colors"
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
          <div className="absolute bottom-2.5 left-3 text-[11px] text-stone-400">
            {inputValue.trim().length}/2000
          </div>
          </div>
          <div className="mt-1 pb-1 text-[11px] text-stone-400">
            Press Enter to send, Shift+Enter for a new line
          </div>
        </div>
      </div>

      {/* History overlay */}
      {chatView === "history" && (
        <div className="absolute inset-0 z-20">
          <div className="flex flex-col h-full bg-background rounded-[1.25rem] shadow-lg ring-1 ring-stone-200 overflow-hidden">
            <div className="flex items-center justify-between pl-4 pr-2.5 pt-3 pb-1.5">
              <span className="text-[13px] font-semibold text-stone-900">Chat History</span>
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
                        <span className="mt-1 inline-flex w-fit rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                          {conv._count.messages} messages
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

      {isOpen && pendingPersonaDesign && (
        <div className="pointer-events-none fixed inset-y-0 left-0 right-[23rem] z-[45] flex items-center justify-center p-6 max-md:inset-x-0 max-md:right-0 max-md:items-end max-md:p-3">
          <div className="pointer-events-auto w-[min(30rem,calc(100vw-26rem))] min-w-[22rem] max-w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl max-md:min-w-0 max-md:w-full">
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-stone-900">Persona Design</p>
                    <p className="mt-1 text-[13px] text-stone-600">
                      Review and tweak your generation setup before we start.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPersonaDesign}
                  className="rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  aria-label="Close persona design"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3.5 px-4 pb-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="persona-design-prompt"
                    className="text-[13px] font-medium text-stone-900"
                  >
                    Prompt
                  </label>
                  <button
                    type="button"
                    onClick={shufflePersonaPrompt}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Shuffle idea
                  </button>
                </div>
                <textarea
                  id="persona-design-prompt"
                  value={personaDesignPrompt}
                  onChange={(e) => setPersonaDesignPrompt(e.target.value)}
                  placeholder="Describe who these personas should represent..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[13px] text-stone-900 placeholder:text-stone-500 focus-visible:outline-none focus-visible:border-stone-500"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {personaPromptPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPersonaDesignPrompt(preset)}
                    className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    {preset.split(".")[0]}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="persona-design-count" className="text-[13px] font-medium text-stone-900">
                  Number of personas
                </label>
                <input
                  id="persona-design-count"
                  type="number"
                  min={1}
                  max={10}
                  value={personaDesignCount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setPersonaDesignCount(Number.isFinite(value) ? value : 1);
                  }}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 focus-visible:outline-none focus-visible:border-stone-500"
                />
                <p className="text-xs text-stone-500">Choose between 1 and 10 personas.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50/60 px-4 py-3">
              <button
                type="button"
                onClick={handleCancelPersonaDesign}
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPersonaDesign}
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-stone-800"
              >
                Start creation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!isClient) return null;
  return createPortal(askLayer, document.body);
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
        className="flex w-full items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-left text-[13px] text-green-800 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
      >
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
          {result.message as string || label}
        </span>
      </button>
    );
  }

  return null;
}

function AssistantRichText({
  text,
  onNavigate,
  collapsed,
}: {
  text: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
}) {
  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h3 className="mb-2 mt-4 font-sans text-[14px] font-semibold tracking-tight text-stone-900 first:mt-0">
          {children}
        </h3>
      ),
      h2: ({ children }) => (
        <h3 className="mb-2 mt-4 font-sans text-[13px] font-semibold tracking-tight text-stone-900 first:mt-0">
          {children}
        </h3>
      ),
      h3: ({ children }) => (
        <h4 className="mb-1.5 mt-3 font-sans text-[13px] font-semibold text-stone-900 first:mt-0">
          {children}
        </h4>
      ),
      h4: ({ children }) => (
        <h5 className="mb-1.5 mt-3 font-sans text-[12px] font-semibold text-stone-900 first:mt-0">
          {children}
        </h5>
      ),
      p: ({ children }) => (
        <p className="mb-2 font-sans text-[13px] leading-snug text-stone-800 last:mb-0">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="mb-2 ml-1 list-disc space-y-1 pl-4 font-sans text-[13px] leading-snug text-stone-800 marker:text-stone-400">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-2 ml-1 list-decimal space-y-1 pl-4 font-sans text-[13px] leading-snug text-stone-800 marker:text-stone-400">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="pl-0.5">{children}</li>,
      strong: ({ children }) => (
        <strong className="font-semibold text-stone-900">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-stone-800">{children}</em>,
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-stone-300 pl-3 font-sans text-[12px] italic text-stone-600">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-stone-200" />,
      a: ({ href, children }) => {
        const raw = (href ?? "").trim();
        const normalized = normalizeAssistantHref(raw);
        if (normalized.type === "internal") {
          return (
            <button
              type="button"
              onClick={() => onNavigate(normalized.value)}
              className="inline-flex max-w-full items-center gap-0.5 rounded px-0.5 font-sans text-[13px] font-medium text-emerald-800 underline decoration-emerald-800/40 underline-offset-2 hover:bg-emerald-50 hover:decoration-emerald-800"
            >
              <span className="min-w-0 break-words text-left">{children}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            </button>
          );
        }
        if (normalized.type === "external") {
          return (
            <a
              href={normalized.value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-0.5 font-sans text-[13px] font-medium text-emerald-800 underline decoration-emerald-800/40 underline-offset-2 hover:bg-emerald-50"
            >
              <span className="min-w-0 break-words text-left">{children}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          );
        }
        return <span className="font-sans text-stone-600">{children}</span>;
      },
      code: ({ className, children, ...props }) => {
        const inline = !className;
        if (inline) {
          return (
            <code
              className="rounded bg-stone-200/80 px-1 py-0.5 font-mono text-[12px] text-stone-900"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={cn("block font-mono text-[11px] text-stone-100", className)} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children }) => (
        <pre className="my-2 overflow-x-auto rounded-lg border border-stone-200 bg-stone-900 p-3 font-mono text-[11px] text-stone-100">
          {children}
        </pre>
      ),
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full min-w-[16rem] border-collapse font-sans text-[12px] text-stone-800">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-stone-100">{children}</thead>,
      th: ({ children }) => (
        <th className="border-b border-stone-200 px-2.5 py-2 text-left font-semibold text-stone-900">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-stone-100 px-2.5 py-2 align-top text-stone-800">{children}</td>
      ),
    }),
    [onNavigate]
  );

  return (
    <div
      className={cn(
        "overflow-hidden transition-all",
        collapsed ? "max-h-40 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]" : ""
      )}
    >
      <div className="assistant-markdown min-w-0 font-sans text-[13px] leading-snug text-stone-800 antialiased [&>*:first-child]:mt-0">
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </Markdown>
      </div>
    </div>
  );
}

