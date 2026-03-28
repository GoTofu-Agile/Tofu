import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink, Sparkles, Database, FileUp } from "lucide-react";
import { appStoreReviewSnippetsFromPersona } from "@/lib/personas/app-store-review-ui";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import { PersonaDetailActions } from "@/components/personas/persona-detail-actions";
import { TrackPageView } from "@/components/analytics/track-page-view";
import { PersonaSectionRefiner } from "@/components/personas/persona-section-refiner";
import { PersonaQualityAvatar } from "@/components/personas/persona-quality-avatar";

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

  // Access control: verify user is member of the group's org
  const user = await requireAuth();
  const role = await getUserRole(persona.personaGroup.organizationId, user.id);
  if (!role) {
    notFound();
  }

  const traits = persona.personality;
  const appReviews = appStoreReviewSnippetsFromPersona(persona.dataSources);
  const SourceIcon =
    persona.sourceType === "DATA_BASED"
      ? Database
      : persona.sourceType === "UPLOAD_BASED"
        ? FileUp
        : Sparkles;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <TrackPageView page="persona_detail" area="personas" />
      {/* Hero Section */}
      <div>
        <Link
          href={`/personas/${groupId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {persona.personaGroup.name}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <PersonaQualityAvatar
              name={persona.name}
              qualityScore={persona.qualityScore}
              size="lg"
              showPercent
            />
            <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {persona.name}
            </h2>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <SourceIcon className="h-3 w-3" aria-hidden="true" />
              <span>
                Generated from{" "}
                {SOURCE_LABELS[persona.sourceType]?.label.toLowerCase() ?? "prompted"}{" "}
                source
              </span>
            </p>
            {persona.archetype && (
              <p className="mt-0.5 text-sm font-medium text-primary">
                {persona.archetype}
              </p>
            )}
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
          </div>
          <div className="flex items-center gap-2">
            <PersonaDetailActions personaId={persona.id} />
            {persona.qualityScore !== null && (
              <Badge variant="outline">
                Quality: {Math.round(persona.qualityScore * 100)}%
              </Badge>
            )}
            {persona.domainExpertise && (
              <Badge variant="secondary">{persona.domainExpertise}</Badge>
            )}
          </div>
        </div>

        {persona.representativeQuote && (
          <div className="mt-4">
            <blockquote className="border-l-2 border-primary/30 pl-4 italic text-muted-foreground">
              &ldquo;{persona.representativeQuote}&rdquo;
            </blockquote>
            <PersonaSectionRefiner
              personaId={persona.id}
              section="representativeQuote"
              label="Quote"
            />
          </div>
        )}
      </div>

      {/* Occupation & Bio */}
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
          <PersonaSectionRefiner
            personaId={persona.id}
            section="bio"
            label="Bio"
          />
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Key signals</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Likely trigger</p>
            <p className="mt-1 text-sm">
              {extractSignal((persona.behaviors as string[] | null) ?? [], /(trigger|when|if|after|once)/i) ??
                "Looks for concrete evidence before acting."}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Likely objection</p>
            <p className="mt-1 text-sm">
              {extractSignal((persona.frustrations as string[] | null) ?? [], /(hesitat|risk|concern|avoid|delay|cost)/i) ??
                "Hesitates when outcomes feel unclear or unproven."}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use these as hypotheses for interview design: test objections first, then validate triggers.
        </p>
      </div>

      {appReviews.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              App Store review voices
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Verbatim reviews from your crawl, matched to this persona. Same
              review may appear on other personas when it fits multiple
              profiles.
            </p>
            <ul className="mt-4 space-y-4">
              {appReviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/80 bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {r.title}
                    </span>
                    {r.rating != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        ★ {r.rating}/5
                      </Badge>
                    )}
                  </div>
                  {r.sourceUrl && (
                    <p className="mt-1 break-all text-[11px] text-muted-foreground">
                      {r.sourceUrl.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                  <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                    &ldquo;{r.content}&rdquo;
                  </blockquote>
                  {r.reviewUrl && (
                    <a
                      href={r.reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open review
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Story Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">
          Backstory
        </h3>
        <p className="mt-1 whitespace-pre-line">{persona.backstory}</p>
        <PersonaSectionRefiner
          personaId={persona.id}
          section="backstory"
          label="Backstory"
        />
      </div>

      {persona.dayInTheLife && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            A Day in Their Life
          </h3>
          <p className="mt-1 whitespace-pre-line">{persona.dayInTheLife}</p>
          <PersonaSectionRefiner
            personaId={persona.id}
            section="dayInTheLife"
            label="Day in life"
          />
        </div>
      )}

      {/* Core Values */}
      {persona.coreValues &&
        Array.isArray(persona.coreValues) &&
        (persona.coreValues as string[]).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Core Values
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(persona.coreValues as string[]).map((value, i) => (
                <Badge key={i} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          </div>
        )}

      <Separator />

      {/* Goals, Frustrations, Behaviors */}
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

      {/* Personality Profile */}
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

            {/* Extended Personality Traits */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Interview Behavior
              </h4>
              {traits.directness !== null && (
                <PersonalityBar label="Directness" value={traits.directness} />
              )}
              {traits.criticalFeedbackTendency !== null && (
                <PersonalityBar
                  label="Critical Feedback"
                  value={traits.criticalFeedbackTendency}
                />
              )}
              {traits.emotionalExpressiveness !== null && (
                <PersonalityBar
                  label="Emotional Expression"
                  value={traits.emotionalExpressiveness}
                />
              )}
              {traits.riskTolerance !== null && (
                <PersonalityBar
                  label="Risk Tolerance"
                  value={traits.riskTolerance}
                />
              )}
              {traits.trustPropensity !== null && (
                <PersonalityBar
                  label="Trust Propensity"
                  value={traits.trustPropensity}
                />
              )}
              {traits.tangentTendency !== null && (
                <PersonalityBar
                  label="Tangent Tendency"
                  value={traits.tangentTendency}
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
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
              {traits.decisionMakingStyle && (
                <span>
                  Decisions:{" "}
                  <span className="text-foreground">
                    {traits.decisionMakingStyle}
                  </span>
                </span>
              )}
              {traits.vocabularyLevel && (
                <span>
                  Vocabulary:{" "}
                  <span className="text-foreground">
                    {traits.vocabularyLevel}
                  </span>
                </span>
              )}
            </div>
            {persona.techLiteracy !== null && (
              <div className="mt-2 text-sm text-muted-foreground">
                Tech literacy:{" "}
                <span className="text-foreground">
                  {persona.techLiteracy}/5
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Interview Preview */}
      {persona.communicationSample && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Interview Preview
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              How this persona might respond to: &ldquo;What do you think about
              trying new technology?&rdquo;
            </p>
            <div className="rounded-lg bg-muted/50 p-4 text-sm italic">
              {persona.communicationSample}
            </div>
            <PersonaSectionRefiner
              personaId={persona.id}
              section="communicationSample"
              label="Interview preview"
            />
          </div>
        </>
      )}
    </div>
  );
}

function extractSignal(items: string[], regex: RegExp): string | null {
  const match = items.find((item) => regex.test(item));
  if (match) return match;
  return items.length > 0 ? items[0]! : null;
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
