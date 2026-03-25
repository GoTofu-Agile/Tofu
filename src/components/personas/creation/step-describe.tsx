"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

const EXAMPLES = [
  "ER nurses at a large Berlin hospital",
  "SaaS product managers at Series B startups",
  "Stay-at-home parents who shop online",
  "University students studying computer science",
  "Small business owners running bakeries",
  "UX designers at fintech companies",
  "Freelance graphic designers in their 40s",
  "First-time founders building AI products",
];

interface StepDescribeProps {
  onSubmit: (freetext: string) => void;
  loading: boolean;
  hasOrgContext: boolean;
  initialText?: string;
  /** Hide the bottom Continue button (parent supplies a single CTA). */
  hideContinue?: boolean;
  /** Controlled mode: parent owns the textarea value (use with onTextChange). */
  text?: string;
  onTextChange?: (text: string) => void;
}

export function StepDescribe({
  onSubmit,
  loading,
  hasOrgContext,
  initialText,
  hideContinue = false,
  text: controlledText,
  onTextChange,
}: StepDescribeProps) {
  const isControlled =
    controlledText !== undefined && onTextChange !== undefined;
  const [internalText, setInternalText] = useState(initialText ?? "");

  useEffect(() => {
    if (!isControlled && initialText !== undefined) {
      queueMicrotask(() => setInternalText(initialText));
    }
  }, [initialText, isControlled]);

  const text = isControlled ? controlledText : internalText;
  const setText = isControlled ? onTextChange! : setInternalText;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="describe">
          Describe the personas you need
        </Label>
        <Textarea
          id="describe"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Mid-career nurses working night shifts at large hospitals, frustrated with scheduling software and paperwork..."
          rows={4}
          className="text-base"
          disabled={loading}
        />
      </div>

      {hasOrgContext && (
        <p className="text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 mr-1" />
          Your product context from Settings will be used automatically.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Or try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              disabled={loading}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {!hideContinue && (
        <Button
          onClick={() => onSubmit(text)}
          disabled={loading || text.trim().length < 5}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing your description...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
