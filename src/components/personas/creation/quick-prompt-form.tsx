"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

const EXAMPLES = [
  "ER nurse at Charité Berlin",
  "SaaS product manager at a Series B startup",
  "Stay-at-home parent who shops online",
  "University student studying computer science",
  "Small business owner running a bakery",
  "UX designer at a fintech company",
  "Freelance graphic designer in their 40s",
  "High school teacher in a rural area",
];

interface QuickPromptFormProps {
  onSubmit: (prompt: string) => void;
  onBack: () => void;
  loading: boolean;
  loadingMessage?: string;
}

export function QuickPromptForm({
  onSubmit,
  onBack,
  loading,
  loadingMessage,
}: QuickPromptFormProps) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="quickPrompt">Describe your target user</Label>
        <Textarea
          id="quickPrompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A mid-career nurse working night shifts at a large hospital, frustrated with scheduling software..."
          rows={3}
          className="text-base"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={loading}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => onSubmit(prompt)}
          disabled={loading || prompt.trim().length < 5}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingMessage || "Researching..."}
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
