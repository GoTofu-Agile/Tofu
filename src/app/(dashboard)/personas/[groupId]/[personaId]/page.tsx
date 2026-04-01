import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { appStoreReviewSnippetsFromPersona } from "@/lib/personas/app-store-review-ui";
import { PersonaSquircleIcon } from "@/components/personas/persona-squircle-icon";
import { PersonaQualityStreak } from "@/components/personas/persona-quality-streak";
import { AuthenticityBadge } from "@/components/personas/authenticity-badge";
import { PersonaTrustPanel } from "@/components/personas/persona-trust-panel";
import { PersonaDetailSections } from "@/components/personas/persona-detail-sections";
import { MotionPageEnter } from "@/components/motion/page-motion";

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
  const displayGender = normalizeBinaryGender(persona.gender);
  const latestEval = persona.evaluations[0];

  return (
    <MotionPageEnter className="mx-auto max-w-3xl space-y-8">
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
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {persona.name}
            </h2>
            {persona.archetype && (
              <p className="mt-0.5 text-sm font-medium text-primary">
                {persona.archetype}
              </p>
            )}
            <p className="mt-1 text-muted-foreground">
              {[
                persona.age && `${persona.age} years old`,
                displayGender,
                persona.location,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {persona.domainExpertise ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {persona.domainExpertise}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <PersonaSquircleIcon
              persona={{
                id: persona.id,
                name: persona.name,
                gender: persona.gender,
                occupation: persona.occupation,
                archetype: persona.archetype,
                age: persona.age,
              }}
              size="xl"
            />
            <div className="flex flex-col items-end gap-2">
              {persona.authenticityScore != null ? (
                <AuthenticityBadge
                  score={persona.authenticityScore}
                  band={persona.authenticityBand}
                  summary={persona.evalSummary}
                  celebrate={persona.authenticityBand === "high"}
                />
              ) : null}
              <PersonaQualityStreak qualityScore={persona.qualityScore} />
            </div>
          </div>
        </div>

        {persona.representativeQuote && (
          <blockquote className="mt-4 border-l-2 border-primary/30 pl-4 italic text-muted-foreground">
            &ldquo;{persona.representativeQuote}&rdquo;
          </blockquote>
        )}
      </div>

      <PersonaTrustPanel
        authenticityScore={persona.authenticityScore}
        authenticityBand={persona.authenticityBand}
        evalSummary={persona.evalSummary}
        evalFlags={persona.evalFlags}
        evaluationStatus={persona.evaluationStatus}
        trustScore={latestEval?.trustScore ?? null}
        trustConfidence={latestEval?.confidenceLabel ?? null}
        trustSummary={latestEval?.summary ?? null}
      />

      <p className="rounded-2xl border border-dashed bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Iterate:</span> Open{" "}
        <span className="text-foreground">Ask GoTofu</span> from the sidebar and ask to make
        this persona more realistic, adjust their background, or add constraints — we&apos;ll
        apply changes in context.
      </p>

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
        </div>
      )}

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

      <PersonaDetailSections
        sections={[
          {
            id: "backstory",
            title: "Backstory",
            subtitle: "Formative context and life narrative",
            defaultOpen: true,
            children: (
              <p className="whitespace-pre-line text-muted-foreground">{persona.backstory}</p>
            ),
          },
          ...(persona.dayInTheLife
            ? [
                {
                  id: "day",
                  title: "A day in their life",
                  subtitle: "Routine and environment",
                  defaultOpen: false,
                  children: (
                    <p className="whitespace-pre-line text-muted-foreground">
                      {persona.dayInTheLife}
                    </p>
                  ),
                },
              ]
            : []),
        ]}
      />

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
          </div>
        </>
      )}
    </MotionPageEnter>
  );
}

function normalizeBinaryGender(gender: string | null | undefined): "Male" | "Female" | null {
  const value = (gender ?? "").toLowerCase();
  if (value.includes("female") || value === "f" || value.includes("woman")) return "Female";
  if (value.includes("male") || value === "m" || value.includes("man")) return "Male";
  return null;
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
