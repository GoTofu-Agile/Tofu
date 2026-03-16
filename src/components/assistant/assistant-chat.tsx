"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAssistant } from "./assistant-provider";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  Users,
  FlaskConical,
  Settings,
  MessageSquare,
} from "lucide-react";
import type { UIMessage } from "ai";

const quickActions = [
  {
    label: "Create personas for my product",
    icon: Users,
  },
  {
    label: "Set up a new study",
    icon: FlaskConical,
  },
  {
    label: "Show my persona groups",
    icon: Users,
  },
  {
    label: "Help me with product context",
    icon: Settings,
  },
];

export function AssistantChat() {
  const router = useRouter();
  const { isOpen, close } = useAssistant();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/assistant",
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError(error) {
      toast.error(error.message || "Something went wrong");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle navigation from tool results
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

  function handleSend(text?: string) {
    const msg = text || inputValue.trim();
    if (!msg || isLoading) return;
    sendMessage({ text: msg });
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
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

  // Extract tool results from message parts (AI SDK v6 format)
  function getToolResults(
    message: UIMessage
  ): { toolName: string; result: Record<string, unknown> }[] {
    const results: { toolName: string; result: Record<string, unknown> }[] = [];
    for (const part of message.parts) {
      // In AI SDK v6, tool parts have type "tool-{name}" with state/output
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        part.type !== "tool-navigateTo" &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        const toolName = part.type.replace("tool-", "");
        results.push({
          toolName,
          result: (part.output as Record<string, unknown>) ?? {},
        });
      }
    }
    return results;
  }

  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">GoTofu Assistant</span>
        </div>
        <button
          onClick={close}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-6 pt-8">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                Hi! How can I help?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                I can create personas, set up studies, and help you navigate
                GoTofu.
              </p>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.label)}
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          const toolResults = getToolResults(message);

          return (
            <div key={message.id} className="space-y-2">
              {text && (
                <div
                  className={`flex gap-2.5 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="shrink-0 mt-0.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="shrink-0 mt-0.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <User className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tool result cards */}
              {toolResults.map((tr, i) => (
                <ToolResultCard
                  key={`${message.id}-tool-${i}`}
                  toolName={tr.toolName}
                  result={tr.result}
                  onNavigate={(path) => router.push(path)}
                />
              ))}
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5">
            <div className="shrink-0 mt-0.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            </div>
            <div className="rounded-2xl bg-muted px-3.5 py-2">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ minHeight: "40px", maxHeight: "100px", height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={!inputValue.trim() || isLoading}
            onClick={() => handleSend()}
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ToolResultCard({
  toolName,
  result,
  onNavigate,
}: {
  toolName: string;
  result: Record<string, unknown>;
  onNavigate: (path: string) => void;
}) {
  const url = result.url as string | undefined;

  const icons: Record<string, typeof Users> = {
    createPersonaGroup: Users,
    createStudy: FlaskConical,
    setupStudyFromDescription: FlaskConical,
    listPersonaGroups: Users,
    listStudies: FlaskConical,
    runBatchInterviews: MessageSquare,
    getWorkspaceInfo: Settings,
  };

  const Icon = icons[toolName] || Sparkles;

  // List results
  if (
    (toolName === "listPersonaGroups" || toolName === "listStudies") &&
    Array.isArray(result.items)
  ) {
    const items = result.items as {
      name: string;
      id: string;
      url: string;
      detail?: string;
    }[];
    if (items.length === 0) return null;

    return (
      <div className="ml-8 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.url)}
            className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
          >
            <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{item.name}</span>
            {item.detail && (
              <span className="ml-auto text-muted-foreground shrink-0">
                {item.detail}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Created item result
  if (result.name && url) {
    return (
      <div className="ml-8">
        <button
          onClick={() => onNavigate(url)}
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs transition-colors hover:bg-primary/10"
        >
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">{result.name as string}</span>
          <span className="text-muted-foreground ml-auto">Open</span>
        </button>
      </div>
    );
  }

  return null;
}
