"use client";

import { useMemo, useState } from "react";
import type { DomainKnowledge } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  appStoreReviewSnippetsFromPersona,
  type AppStoreReviewSnippet,
  type DataSourceWithKnowledge,
  playStoreReviewSnippetsFromPersona,
} from "@/lib/personas/app-store-review-ui";
import {
  excerptText,
  labelForDataSourceType,
  provenanceHintFromMetadata,
  researchKnowledgeFromDataSources,
} from "@/lib/personas/persona-provenance-display";
import { PersonaDisclosure } from "@/components/personas/persona-detail-sections";

const INITIAL_VISIBLE = 3;

function ResearchCard({ dk }: { dk: DomainKnowledge }) {
  const hint = provenanceHintFromMetadata(dk.metadata);
  const dateStr = dk.publishedAt
    ? dk.publishedAt.toISOString().slice(0, 10)
    : null;
  const href = dk.sourceUrl?.trim() || null;

  return (
    <li className="rounded-xl border border-border/80 bg-muted/15 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge variant="secondary" className="shrink-0 text-[10px] font-medium">
          {labelForDataSourceType(dk.sourceType)}
        </Badge>
        {dateStr ? (
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground leading-snug">{dk.title}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {dk.sourceDomain ?? "—"}
        {hint ? <span className="text-muted-foreground/80"> · {hint}</span> : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {excerptText(dk.content, 360)}
      </p>
      {dk.searchQuery ? (
        <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground/90" title={dk.searchQuery}>
          Query: {dk.searchQuery}
        </p>
      ) : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open source
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </li>
  );
}

function StoreReviewCard({
  sourceType,
  review,
}: {
  sourceType: "APP_REVIEW" | "PLAY_STORE_REVIEW";
  review: AppStoreReviewSnippet;
}) {
  const dateStr = review.publishedAt
    ? review.publishedAt.toISOString().slice(0, 10)
    : null;

  return (
    <li className="rounded-xl border border-border/80 bg-muted/15 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge variant="secondary" className="shrink-0 text-[10px] font-medium">
          {labelForDataSourceType(sourceType)}
        </Badge>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dateStr ? <span className="text-[10px] text-muted-foreground">{dateStr}</span> : null}
          {review.rating != null ? (
            <Badge variant="outline" className="text-[10px]">
              ★ {review.rating}/5
            </Badge>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground leading-snug">{review.title}</p>
      {review.sourceUrl ? (
        <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
          {review.sourceUrl.replace(/^https?:\/\//, "")}
        </p>
      ) : null}
      <blockquote className="mt-2 text-xs leading-relaxed text-muted-foreground">
        &ldquo;{excerptText(review.content, 360)}&rdquo;
      </blockquote>
      {review.reviewUrl ? (
        <a
          href={review.reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open review
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </li>
  );
}

type UnifiedRow =
  | { kind: "research"; id: string; at: number; dk: DomainKnowledge }
  | {
      kind: "store";
      id: string;
      at: number;
      sourceType: "APP_REVIEW" | "PLAY_STORE_REVIEW";
      review: AppStoreReviewSnippet;
    };

function buildUnifiedRows(
  research: DomainKnowledge[],
  appReviews: AppStoreReviewSnippet[],
  playReviews: AppStoreReviewSnippet[]
): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  for (const dk of research) {
    rows.push({
      kind: "research",
      id: dk.id,
      at: dk.publishedAt?.getTime() ?? 0,
      dk,
    });
  }
  for (const r of appReviews) {
    rows.push({
      kind: "store",
      id: r.id,
      at: r.publishedAt?.getTime() ?? 0,
      sourceType: "APP_REVIEW",
      review: r,
    });
  }
  for (const r of playReviews) {
    rows.push({
      kind: "store",
      id: r.id,
      at: r.publishedAt?.getTime() ?? 0,
      sourceType: "PLAY_STORE_REVIEW",
      review: r,
    });
  }
  rows.sort((a, b) => {
    if (b.at !== a.at) return b.at - a.at;
    return a.id.localeCompare(b.id);
  });
  return rows;
}

export function PersonaSourcesPanel({ dataSources }: { dataSources: DataSourceWithKnowledge[] }) {
  const research = useMemo(() => researchKnowledgeFromDataSources(dataSources), [dataSources]);
  const appReviews = useMemo(
    () => appStoreReviewSnippetsFromPersona(dataSources),
    [dataSources]
  );
  const playReviews = useMemo(
    () => playStoreReviewSnippetsFromPersona(dataSources),
    [dataSources]
  );

  const rows = useMemo(
    () => buildUnifiedRows(research, appReviews, playReviews),
    [research, appReviews, playReviews]
  );

  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);

  if (rows.length === 0) {
    return (
      <PersonaDisclosure
        title="Sources & evidence"
        subtitle="Research snippets and store reviews linked to this persona appear here."
        defaultOpen
      >
        <p className="px-1 text-sm text-muted-foreground">
          No source links are stored for this persona yet. Regenerate with web research or
          attach reviews to populate this section.
        </p>
      </PersonaDisclosure>
    );
  }

  const subtitleParts: string[] = [];
  if (research.length) subtitleParts.push(`${research.length} research`);
  if (appReviews.length) subtitleParts.push(`${appReviews.length} App Store`);
  if (playReviews.length) subtitleParts.push(`${playReviews.length} Play Store`);

  const visible = rows.slice(0, visibleLimit);
  const remaining = rows.length - visible.length;

  return (
    <PersonaDisclosure
      title="Sources & evidence"
      subtitle={`${subtitleParts.join(" · ")} — one list, newest first.`}
      defaultOpen
    >
      <div className="px-0.5">
        <p className="mb-3 text-xs text-muted-foreground">
          News, forums, web crawls, and store reviews are grouped here. The badge on each card
          shows the source type.
        </p>
        <ul className="space-y-3">
          {visible.map((row) =>
            row.kind === "research" ? (
              <ResearchCard key={row.id} dk={row.dk} />
            ) : (
              <StoreReviewCard key={row.id} sourceType={row.sourceType} review={row.review} />
            )
          )}
        </ul>
        {remaining > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setVisibleLimit(rows.length)}
          >
            Load more ({remaining} more)
          </Button>
        ) : null}
      </div>
    </PersonaDisclosure>
  );
}
