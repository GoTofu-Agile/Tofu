import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AppStoreReviewSnippet } from "@/lib/personas/app-store-review-ui";
import { SOURCE_LABELS, type SourceTypeKey } from "@/lib/constants/source-labels";
import { Sparkles, Database, FileUp } from "lucide-react";
import { PersonaQualityAvatar } from "@/components/personas/persona-quality-avatar";

interface PersonaCardProps {
  persona: {
    id: string;
    name: string;
    sourceType: SourceTypeKey;
    age: number | null;
    gender: string | null;
    location: string | null;
    occupation: string | null;
    bio: string | null;
    archetype: string | null;
    representativeQuote: string | null;
    goals?: unknown;
    frustrations?: unknown;
    behaviors?: unknown;
    qualityScore?: number | null;
    personality: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
      communicationStyle: string | null;
      criticalFeedbackTendency: number | null;
    } | null;
  };
  groupId: string;
  /** Verbatim Outscraper-linked App Store reviews (optional). */
  appStoreReviews?: AppStoreReviewSnippet[];
}

export function PersonaCard({
  persona,
  groupId,
  appStoreReviews = [],
}: PersonaCardProps) {
  const traits = persona.personality;
  const feedbackTendency = traits?.criticalFeedbackTendency ?? null;
  const SourceIcon =
    persona.sourceType === "DATA_BASED"
      ? Database
      : persona.sourceType === "UPLOAD_BASED"
        ? FileUp
        : Sparkles;

  const primaryGoal = getFirstText(persona.goals);
  const likelyObjection = getSignal(
    persona.frustrations,
    /(hesitat|risk|uncertain|cost|time|complex|delay|trust|skeptic)/i
  );
  const likelyTrigger = getSignal(
    persona.behaviors,
    /(trigger|when|if|after|once|proof|evidence|recommend|deadline|pilot)/i
  );
  const qualityLabel = getQualityLabel(persona.qualityScore ?? null);

  return (
    <Link
      href={`/personas/${groupId}/${persona.id}`}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h4 className="font-medium group-hover:underline">{persona.name}</h4>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <SourceIcon className="h-3 w-3" aria-hidden="true" />
            <span>
              Generated from {SOURCE_LABELS[persona.sourceType].label.toLowerCase()} source
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {[persona.age && `${persona.age}y`, persona.gender, persona.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="ml-3 flex items-start gap-2">
          <PersonaQualityAvatar
            name={persona.name}
            qualityScore={persona.qualityScore ?? null}
            size="sm"
            showPercent
          />
          <div className="flex items-center gap-1.5">
          {feedbackTendency !== null && (
            <span
              className={`h-2 w-2 rounded-full ${
                feedbackTendency > 0.6
                  ? "bg-red-400"
                  : feedbackTendency < 0.3
                    ? "bg-green-400"
                    : "bg-yellow-400"
              }`}
              role="img"
              aria-label={
                feedbackTendency > 0.6
                  ? "Critical feedback tendency: high"
                  : feedbackTendency < 0.3
                    ? "Critical feedback tendency: low"
                    : "Critical feedback tendency: medium"
              }
              title={
                feedbackTendency > 0.6
                  ? "Gives tough, critical feedback"
                  : feedbackTendency < 0.3
                    ? "Tends to be agreeable"
                    : "Balanced feedback style"
              }
            />
          )}
          {persona.archetype ? (
            <Badge variant="outline" className="text-xs">
              {persona.archetype}
            </Badge>
          ) : traits ? (
            <Badge variant="outline" className="text-xs">
              {getTopTrait(traits)}
            </Badge>
          ) : null}
          </div>
        </div>
      </div>
      {persona.occupation && (
        <p className="mt-2 text-sm">{persona.occupation}</p>
      )}
      {persona.bio && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {persona.bio}
        </p>
      )}
      {persona.representativeQuote && (
        <p className="mt-2 text-sm italic text-muted-foreground line-clamp-1">
          &ldquo;{persona.representativeQuote}&rdquo;
        </p>
      )}
      <div className="mt-3 space-y-2 rounded-lg border bg-muted/20 p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Quick read
        </p>
        <div className="space-y-1 text-xs">
          <p className="line-clamp-1">
            <span className="font-medium text-foreground">Primary goal:</span>{" "}
            <span className="text-muted-foreground">
              {primaryGoal ?? "Clarify priorities and reduce avoidable risk"}
            </span>
          </p>
          <p className="line-clamp-1">
            <span className="font-medium text-foreground">Likely objection:</span>{" "}
            <span className="text-muted-foreground">
              {likelyObjection ?? "Will push back if value is vague or unproven"}
            </span>
          </p>
          <p className="line-clamp-1">
            <span className="font-medium text-foreground">Likely trigger:</span>{" "}
            <span className="text-muted-foreground">
              {likelyTrigger ?? "Acts when evidence shows clear impact"}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Confidence: {qualityLabel}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
          Open profile
        </span>
      </div>
      {appStoreReviews.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            App Store reviews
          </p>
          {appStoreReviews.slice(0, 2).map((r) => (
            <div key={r.id} className="rounded-md bg-muted/40 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                {r.rating != null ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-500">
                    ★ {r.rating}/5
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Review</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                &ldquo;{r.content}&rdquo;
              </p>
            </div>
          ))}
          {appStoreReviews.length > 2 && (
            <p className="text-[10px] text-muted-foreground">
              +{appStoreReviews.length - 2} more on detail page
            </p>
          )}
        </div>
      )}
      {traits && (
        <div className="mt-3 flex gap-1">
          <TraitBar label="O" value={traits.openness} />
          <TraitBar label="C" value={traits.conscientiousness} />
          <TraitBar label="E" value={traits.extraversion} />
          <TraitBar label="A" value={traits.agreeableness} />
          <TraitBar label="N" value={traits.neuroticism} />
        </div>
      )}
    </Link>
  );
}

function getFirstText(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof first === "string" ? first.trim() : null;
}

function getSignal(value: unknown, regex: RegExp): string | null {
  if (!Array.isArray(value)) return null;
  const stringItems = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const matched = stringItems.find((item) => regex.test(item));
  return matched ?? stringItems[0] ?? null;
}

function getQualityLabel(score: number | null): string {
  if (score === null || Number.isNaN(score)) return "Unknown";
  if (score >= 0.85) return "High";
  if (score >= 0.7) return "Strong";
  if (score >= 0.55) return "Medium";
  return "Low";
}

function TraitBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <div className="h-8 w-full rounded-sm bg-muted overflow-hidden flex flex-col justify-end">
        <div
          className="bg-foreground/20 rounded-sm transition-all"
          style={{ height: `${value * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function getTopTrait(traits: {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}): string {
  const entries = [
    ["Open", traits.openness],
    ["Conscientious", traits.conscientiousness],
    ["Extraverted", traits.extraversion],
    ["Agreeable", traits.agreeableness],
    ["Neurotic", traits.neuroticism],
  ] as const;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
