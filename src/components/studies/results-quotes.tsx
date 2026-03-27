"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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
  const normalizedThemeFilter = themeFilter.toLowerCase();

  const filtered = useMemo(
    () =>
      quotes.filter((q) => {
        if (themeFilter !== "all" && q.theme.toLowerCase() !== normalizedThemeFilter)
          return false;
        if (personaFilter !== "all" && q.personaName !== personaFilter) return false;
        return true;
      }),
    [quotes, themeFilter, normalizedThemeFilter, personaFilter]
  );

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
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 text-center text-sm text-muted-foreground"
            >
              No quotes match the selected filters.
            </motion.p>
          ) : (
            filtered.map((q, i) => (
              <motion.div
                key={`${q.personaName}-${q.context}-${q.quote.slice(0, 24)}`}
                initial={{ opacity: 0, y: 12, x: -4 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                layout
                className="rounded-lg border-l-2 border-primary/30 bg-muted/10 p-3"
              >
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30 origin-top"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.04 + 0.1, duration: 0.3 }}
                />
                <p className="text-sm italic">&ldquo;{q.quote}&rdquo;</p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 + 0.15 }}
                  className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <span className="font-medium">{q.personaName}</span>
                  <span>&middot;</span>
                  <span>{q.context}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {q.theme}
                  </Badge>
                </motion.div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
