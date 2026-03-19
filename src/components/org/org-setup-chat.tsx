"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  CheckCircle2,
  Bot,
  User as UserIcon,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedData {
  productName?: string | null;
  productDescription?: string | null;
  targetAudience?: string | null;
  industry?: string | null;
  competitors?: string | null;
}

interface OrgSetupChatProps {
  orgId: string;
  orgName: string;
  existingData?: ExtractedData;
  onComplete?: () => void;
}

const INITIAL_MESSAGE =
  "Tell me about your product! You can describe it in your own words — what it does, who it's for, and any competitors. I'll figure out the rest.";

const EXAMPLES = [
  "We're building a period tracking app for women 18-45, competing with Flo and Clue",
  "B2B SaaS tool for developer teams to manage API documentation",
  "Online marketplace connecting local farmers with urban consumers in Germany",
];

export function OrgSetupChat({
  orgId,
  orgName,
  existingData,
  onComplete,
}: OrgSetupChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData>(
    existingData || {}
  );
  const [complete, setComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/org/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          messages: newMessages.filter((m) => m.content !== INITIAL_MESSAGE),
        }),
      });

      if (!response.ok) throw new Error("Failed to process");

      const data = await response.json();

      setExtracted((prev) => ({ ...prev, ...data.extracted }));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);

      if (data.type === "complete") {
        setComplete(true);
        toast.success("Product info saved!");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDone() {
    onComplete?.();
    router.refresh();
  }

  const filledFields = Object.entries(extracted).filter(
    ([, v]) => v != null && v !== ""
  );

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="font-medium">
          Set up {orgName === "Personal" ? "your workspace" : orgName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tell us about your product so we can create better personas
        </p>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 rounded-full bg-primary/10 p-1.5 h-7 w-7 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 rounded-full bg-muted p-1.5 h-7 w-7 flex items-center justify-center">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 rounded-full bg-primary/10 p-1.5 h-7 w-7 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Extracted fields preview */}
      {filledFields.length > 0 && (
        <div className="border-t px-4 py-2 flex flex-wrap gap-1.5">
          {filledFields.map(([key, value]) => (
            <Badge
              key={key}
              variant="secondary"
              className="text-[10px] font-normal"
            >
              {key.replace(/([A-Z])/g, " $1").trim()}: {String(value).slice(0, 30)}
              {String(value).length > 30 ? "..." : ""}
            </Badge>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-3">
        {complete ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Product info saved!
            </span>
            <Button size="sm" onClick={handleDone}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Quick examples (only show at start) */}
            {messages.length <= 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                  >
                    {ex.length > 50 ? ex.slice(0, 47) + "..." : ex}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your product..."
                rows={1}
                className="min-h-9 resize-none"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
