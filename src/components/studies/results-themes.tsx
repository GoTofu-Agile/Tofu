"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface Theme {
  name: string;
  description: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  personaNames?: string[];
}

interface KeyQuote {
  quote: string;
  personaName: string;
  context: string;
  theme: string;
}

interface ResultsThemesProps {
  themes: Theme[];
  quotes: KeyQuote[];
}

const sentimentStyles: Record<string, string> = {
  positive: "bg-green-50 text-green-700 border-green-200",
  negative: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
  mixed: "bg-amber-50 text-amber-700 border-amber-200",
};

const sentimentDot: Record<string, string> = {
  positive: "bg-green-500",
  negative: "bg-red-500",
  neutral: "bg-gray-400",
  mixed: "bg-amber-500",
};

export function ResultsThemes({ themes, quotes }: ResultsThemesProps) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  function toggleTheme(name: string) {
    setExpandedTheme(expandedTheme === name ? null : name);
  }

  function getQuotesForTheme(themeName: string) {
    return quotes.filter(
      (q) => q.theme.toLowerCase() === themeName.toLowerCase()
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Themes
      </h3>
      <div className="space-y-2">
        {themes.map((theme) => {
          const isExpanded = expandedTheme === theme.name;
          const themeQuotes = getQuotesForTheme(theme.name);

          return (
            <div
              key={theme.name}
              className="rounded-lg border transition-colors"
            >
              <button
                onClick={() => toggleTheme(theme.name)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className={`size-2.5 shrink-0 rounded-full ${sentimentDot[theme.sentiment]}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{theme.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${sentimentStyles[theme.sentiment]}`}
                    >
                      {theme.sentiment}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {theme.frequency} mentions
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {theme.description}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {theme.description}
                  </p>

                  {theme.personaNames && theme.personaNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {theme.personaNames.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {themeQuotes.length > 0 && (
                    <div className="space-y-2">
                      {themeQuotes.map((q, i) => (
                        <div
                          key={i}
                          className="rounded-lg border-l-2 border-primary/30 bg-muted/10 p-3"
                        >
                          <p className="text-sm italic">
                            &ldquo;{q.quote}&rdquo;
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{q.personaName}</span>
                            <span>&middot;</span>
                            <span>{q.context}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
