import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AppStoreReviewSnippet } from "@/lib/personas/app-store-review-ui";
import { PersonaSquircleIcon } from "@/components/personas/persona-squircle-icon";
import { AuthenticityBadge } from "@/components/personas/authenticity-badge";

interface PersonaCardProps {
  persona: {
    id: string;
    name: string;
    age: number | null;
    gender: string | null;
    location: string | null;
    occupation: string | null;
    bio: string | null;
    archetype: string | null;
    representativeQuote: string | null;
    authenticityScore?: number | null;
    authenticityBand?: "low" | "medium" | "high" | null;
    evalSummary?: string | null;
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
  const archetypeOrTrait =
    persona.archetype ?? (traits ? getTopTrait(traits) : null);
  const displayGender = normalizeBinaryGender(persona.gender);

  return (
    <Link
      href={`/personas/${groupId}/${persona.id}`}
      className="group flex h-full min-h-0 flex-col rounded-2xl border bg-card p-4 shadow-sm transition-[box-shadow,transform,border-color] duration-300 ease-out will-change-transform hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium group-hover:underline">{persona.name}</h4>
          {(archetypeOrTrait || feedbackTendency !== null) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {feedbackTendency !== null && (
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    feedbackTendency > 0.6
                      ? "bg-red-400"
                      : feedbackTendency < 0.3
                        ? "bg-green-400"
                        : "bg-yellow-400"
                  }`}
                  title={
                    feedbackTendency > 0.6
                      ? "Gives tough, critical feedback"
                      : feedbackTendency < 0.3
                        ? "Tends to be agreeable"
                        : "Balanced feedback style"
                  }
                />
              )}
              {archetypeOrTrait ? (
                <Badge variant="outline" className="text-xs">
                  {archetypeOrTrait}
                </Badge>
              ) : null}
              {persona.authenticityScore != null ? (
                <AuthenticityBadge
                  score={persona.authenticityScore}
                  band={persona.authenticityBand}
                  summary={persona.evalSummary}
                  className="max-w-[min(100%,12rem)] truncate"
                />
              ) : null}
            </div>
          )}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[persona.age && `${persona.age}y`, displayGender, persona.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <PersonaSquircleIcon
          persona={{
            id: persona.id,
            name: persona.name,
            gender: persona.gender,
            occupation: persona.occupation,
            archetype: persona.archetype,
            age: persona.age,
          }}
          size="lg"
          className="shrink-0"
        />
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

function normalizeBinaryGender(gender: string | null | undefined): "Male" | "Female" | null {
  const value = (gender ?? "").toLowerCase();
  if (value.includes("female") || value === "f" || value.includes("woman")) return "Female";
  if (value.includes("male") || value === "m" || value.includes("man")) return "Male";
  return null;
}

function TraitBar({ label, value }: { label: string; value: number }) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const pct = Math.round(v * 100);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
      <div
        className="flex h-8 w-full min-h-8 flex-col justify-end overflow-hidden rounded-sm border border-border/60 bg-muted/80"
        title={`${label}: ${pct}%`}
      >
        <div
          className="w-full min-w-0 rounded-sm bg-primary/70 transition-all dark:bg-primary/60"
          style={{
            height: `${pct}%`,
            minHeight: v > 0 ? "3px" : 0,
          }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{label}</span>
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
