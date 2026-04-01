"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { loadPersonaEngagement, PERSONA_ENGAGEMENT_STORAGE_KEY } from "@/lib/personas/persona-engagement";

export function PersonaPromptHistory() {
  const [prompts, setPrompts] = useState<string[]>([]);

  useEffect(() => {
    function refresh() {
      setPrompts(loadPersonaEngagement().promptHistory.slice(0, 4));
    }
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === PERSONA_ENGAGEMENT_STORAGE_KEY) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (prompts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <History className="size-3" aria-hidden />
        Recent prompts — tap to reuse
      </div>
      <div className="flex flex-wrap gap-1.5">
        {prompts.map((p, i) => (
          <Link
            key={`${i}-${p.slice(0, 24)}`}
            href={`/personas/new?prefill=${encodeURIComponent(p)}`}
            className="max-w-[200px] truncate rounded-full bg-background px-2.5 py-1 text-[11px] text-primary underline-offset-2 hover:underline"
            title={p}
          >
            {p.slice(0, 42)}
            {p.length > 42 ? "…" : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}
