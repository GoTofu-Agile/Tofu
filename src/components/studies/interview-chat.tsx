"use client";

import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { endSession } from "@/app/(dashboard)/studies/actions";
import {
  Send,
  Square,
  ArrowLeft,
  User,
  Bot,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import type { UIMessage } from "ai";

interface InterviewChatProps {
  sessionId: string;
  studyId: string;
  studyTitle: string;
  persona: {
    name: string;
    archetype: string | null;
    occupation: string | null;
    age: number | null;
  };
  interviewGuide: string | null;
  initialMessages: { id: string; role: "user" | "assistant"; content: string }[];
  isCompleted: boolean;
}

export function InterviewChat({
  sessionId,
  studyId,
  studyTitle,
  persona,
  interviewGuide,
  initialMessages,
  isCompleted: initialCompleted,
}: InterviewChatProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [ending, setEnding] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { sessionId },
      }),
    [sessionId]
  );

  // Convert initial messages to UIMessage format
  const uiInitialMessages: UIMessage[] = useMemo(
    () =>
      initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
        createdAt: new Date(),
      })),
    [initialMessages]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: uiInitialMessages,
    onError(error) {
      toast.error(error.message || "Failed to send message");
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (!completed) inputRef.current?.focus();
  }, [completed]);

  async function handleEndSession() {
    setEnding(true);
    try {
      await endSession(sessionId);
      setCompleted(true);
      toast.success("Interview completed");
      router.refresh();
    } catch {
      toast.error("Failed to end session");
    } finally {
      setEnding(false);
    }
  }

  function handleSend() {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
    // Reset textarea height
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/studies/${studyId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{persona.name}</h3>
                {persona.archetype && (
                  <Badge variant="secondary" className="text-[10px]">
                    {persona.archetype}
                  </Badge>
                )}
                {completed && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  >
                    completed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {studyTitle}
                {persona.occupation && ` · ${persona.occupation}`}
                {persona.age && `, ${persona.age}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {interviewGuide && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs"
              >
                Guide
                <ChevronDown
                  className={`ml-1 h-3 w-3 transition-transform ${showGuide ? "rotate-180" : ""}`}
                />
              </Button>
            )}
            {!completed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
                disabled={ending}
                className="text-xs"
              >
                {ending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Square className="mr-1 h-3 w-3" />
                )}
                End Interview
              </Button>
            )}
          </div>
        </div>
        {showGuide && interviewGuide && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">
            {interviewGuide}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !completed && (
          <div className="text-center py-12">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Start the interview by asking {persona.name} a question.
            </p>
            {interviewGuide && (
              <p className="mt-1 text-xs text-muted-foreground">
                Check the interview guide for suggested topics.
              </p>
            )}
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          if (!text) return null;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="shrink-0 mt-0.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
              {message.role === "user" && (
                <div className="shrink-0 mt-0.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <div className="rounded-2xl bg-muted px-4 py-2.5">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!completed ? (
        <div className="shrink-0 border-t p-4">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${persona.name} a question...`}
                rows={1}
                className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                style={{
                  minHeight: "44px",
                  maxHeight: "120px",
                  height: "auto",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              disabled={!inputValue.trim() || isLoading}
              onClick={handleSend}
              className="h-[44px] w-[44px] shrink-0 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t p-4 text-center">
          <p className="text-sm text-muted-foreground">
            This interview has been completed.
          </p>
          <Link
            href={`/studies/${studyId}`}
            className="mt-1 text-sm text-primary hover:underline"
          >
            Back to study
          </Link>
        </div>
      )}
    </div>
  );
}
