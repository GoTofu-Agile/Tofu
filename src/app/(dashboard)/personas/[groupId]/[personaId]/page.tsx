import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/lib/db/queries/personas";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; personaId: string }>;
}) {
  const { groupId, personaId } = await params;
  const persona = await getPersona(personaId);

  if (!persona) {
    notFound();
  }

  const traits = persona.personality;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href={`/personas/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {persona.personaGroup.name}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {persona.name}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {[
                persona.age && `${persona.age} years old`,
                persona.gender,
                persona.location,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {persona.qualityScore !== null && (
            <Badge variant="outline">
              Quality: {Math.round(persona.qualityScore * 100)}%
            </Badge>
          )}
        </div>
      </div>

      {persona.occupation && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Occupation
          </h3>
          <p className="mt-1">{persona.occupation}</p>
        </div>
      )}

      {persona.bio && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
          <p className="mt-1">{persona.bio}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-muted-foreground">
          Backstory
        </h3>
        <p className="mt-1 whitespace-pre-line">{persona.backstory}</p>
      </div>

      <Separator />

      <div className="grid gap-6 sm:grid-cols-3">
        <ListSection
          title="Goals"
          items={persona.goals as string[] | null}
        />
        <ListSection
          title="Frustrations"
          items={persona.frustrations as string[] | null}
        />
        <ListSection
          title="Behaviors"
          items={persona.behaviors as string[] | null}
        />
      </div>

      {traits && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Personality Profile (Big Five)
            </h3>
            <div className="space-y-3">
              <PersonalityBar label="Openness" value={traits.openness} />
              <PersonalityBar
                label="Conscientiousness"
                value={traits.conscientiousness}
              />
              <PersonalityBar
                label="Extraversion"
                value={traits.extraversion}
              />
              <PersonalityBar
                label="Agreeableness"
                value={traits.agreeableness}
              />
              <PersonalityBar label="Neuroticism" value={traits.neuroticism} />
            </div>
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              {traits.communicationStyle && (
                <span>
                  Communication:{" "}
                  <span className="text-foreground">
                    {traits.communicationStyle}
                  </span>
                </span>
              )}
              {traits.responseLengthTendency && (
                <span>
                  Response length:{" "}
                  <span className="text-foreground">
                    {traits.responseLengthTendency}
                  </span>
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ListSection({
  title,
  items,
}: {
  title: string;
  items: string[] | null;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonalityBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-sm">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/30"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm text-muted-foreground">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
