"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics/track";

interface PersonaSectionRefinerProps {
  personaId: string;
  section: "bio" | "backstory" | "representativeQuote" | "dayInTheLife" | "communicationSample";
  label: string;
}

export function PersonaSectionRefiner({
  personaId,
  section,
  label,
}: PersonaSectionRefinerProps) {
  const [tone, setTone] = useState<"balanced" | "conversational" | "analytical" | "direct">(
    "balanced"
  );
  const [depth, setDepth] = useState<"concise" | "standard" | "detailed">("standard");
  const [loading, setLoading] = useState(false);

  async function regenerate(instruction: "make_more_realistic" | "make_more_specific" | "make_more_distinct") {
    setLoading(true);
    trackEvent("persona_section_regenerate_started", {
      personaId,
      section,
      instruction,
      tone,
      depth,
    });
    try {
      const res = await fetch("/api/personas/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          section,
          tone,
          depth,
          instruction,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to regenerate section");
      trackEvent("persona_section_regenerate_completed", { personaId, section, instruction });
      toast.success(`${label} regenerated.`);
      window.location.reload();
    } catch (error) {
      trackEvent("persona_section_regenerate_failed", { personaId, section, instruction });
      toast.error(error instanceof Error ? error.message : "Failed to regenerate section");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={tone}
        onChange={(e) => setTone(e.target.value as typeof tone)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label={`${label} tone`}
      >
        <option value="balanced">Tone: Balanced</option>
        <option value="conversational">Tone: Conversational</option>
        <option value="analytical">Tone: Analytical</option>
        <option value="direct">Tone: Direct</option>
      </select>
      <select
        value={depth}
        onChange={(e) => setDepth(e.target.value as typeof depth)}
        className="h-8 rounded-md border bg-background px-2 text-xs"
        aria-label={`${label} depth`}
      >
        <option value="concise">Depth: Concise</option>
        <option value="standard">Depth: Standard</option>
        <option value="detailed">Depth: Detailed</option>
      </select>
      <button
        type="button"
        disabled={loading}
        onClick={() => regenerate("make_more_realistic")}
        className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        More realistic
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => regenerate("make_more_specific")}
        className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted disabled:opacity-60"
      >
        More specific
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => regenerate("make_more_distinct")}
        className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted disabled:opacity-60"
      >
        More distinct
      </button>
    </div>
  );
}
