"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface KeyQuote {
  quote: string;
  personaName: string;
  context: string;
  theme: string;
}

interface ResultsQuotesProps {
  quotes: KeyQuote[];
  themes: string[];
  personaNames: string[];
}

export function ResultsQuotes({
  quotes,
  themes,
  personaNames,
}: ResultsQuotesProps) {
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [personaFilter, setPersonaFilter] = useState<string>("all");

  const filtered = quotes.filter((q) => {
    if (themeFilter !== "all" && q.theme.toLowerCase() !== themeFilter.toLowerCase())
      return false;
    if (personaFilter !== "all" && q.personaName !== personaFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Key Quotes
        </h3>
        <div className="flex gap-2">
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            <option value="all">All Themes</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={personaFilter}
            onChange={(e) => setPersonaFilter(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            <option value="all">All Personas</option>
            {personaNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No quotes match the selected filters.
          </p>
        ) : (
          filtered.map((q, i) => (
            <div
              key={i}
              className="rounded-lg border-l-2 border-primary/30 bg-muted/10 p-3"
            >
              <p className="text-sm italic">&ldquo;{q.quote}&rdquo;</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{q.personaName}</span>
                <span>&middot;</span>
                <span>{q.context}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {q.theme}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
