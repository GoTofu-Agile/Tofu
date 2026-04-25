"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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
  "We're building a period tracking app called CycleFlow for women 18-45, competing with Flo and Clue.",
  "B2B SaaS tool for developer teams to manage API documentation called SpecPilot.",
  "Online marketplace called FarmCircle connecting local farmers with urban consumers in Germany.",
];

export function OrgSetupChat({
  orgId,
  orgName,
  existingData,
  onComplete,
}: OrgSetupChatProps) {
  const router = useRouter();
  const [input, setInput] = useState(
    existingData?.productDescription
      ? [
          existingData.productName ? `Product: ${existingData.productName}` : null,
          existingData.productDescription
            ? `Description: ${existingData.productDescription}`
            : null,
          existingData.targetAudience ? `Audience: ${existingData.targetAudience}` : null,
          existingData.industry ? `Industry: ${existingData.industry}` : null,
          existingData.competitors ? `Competitors: ${existingData.competitors}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData>(
    existingData || {}
  );
  const [complete, setComplete] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/org/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          messages: [{ role: "user", content: text }],
        }),
      });

      if (!response.ok) throw new Error("Failed to process");

      const data = await response.json();

      setExtracted((prev) => ({ ...prev, ...data.extracted }));
      setFollowUpQuestion(data.type === "follow_up" ? data.message : null);

      if (data.type === "complete") {
        setComplete(true);
        toast.success("Product info saved!");
      } else {
        toast.message("Saved what we could. Add a bit more detail to complete setup.");
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
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="font-medium text-base">
          Set up {orgName === "Personal" ? "your workspace" : orgName}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Share a short product brief. We will structure it into product context automatically.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Include these points</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[11px] font-normal">What the product does</Badge>
            <Badge variant="secondary" className="text-[11px] font-normal">Who it is for</Badge>
            <Badge variant="secondary" className="text-[11px] font-normal">Industry</Badge>
            <Badge variant="secondary" className="text-[11px] font-normal">Main competitors</Badge>
          </div>
        </div>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={INITIAL_MESSAGE}
          rows={6}
          className="resize-y"
          disabled={loading}
        />

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              {ex.length > 58 ? ex.slice(0, 55) + "..." : ex}
            </button>
          ))}
        </div>

        {followUpQuestion && !complete && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{followUpQuestion}</span>
            </div>
          </div>
        )}

        {filledFields.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Detected product context</p>
            <div className="flex flex-wrap gap-1.5">
              {filledFields.map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="text-[10px] font-normal"
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}: {String(value).slice(0, 36)}
                  {String(value).length > 36 ? "..." : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {complete ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Product info saved!
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Tip: one short paragraph is enough.
            </span>
          )}
          {complete ? (
            <Button size="sm" onClick={handleDone}>
              Done
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                <>
                  Save context
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
