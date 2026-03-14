import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
}

export function PersonaCard({ persona, groupId }: PersonaCardProps) {
  const traits = persona.personality;
  const feedbackTendency = traits?.criticalFeedbackTendency ?? null;

  return (
    <Link
      href={`/personas/${groupId}/${persona.id}`}
      className="group rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium group-hover:underline">{persona.name}</h4>
          <p className="text-sm text-muted-foreground">
            {[persona.age && `${persona.age}y`, persona.gender, persona.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
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
