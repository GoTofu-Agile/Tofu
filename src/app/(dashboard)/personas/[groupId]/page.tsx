import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersonaGroup, getPersonasForGroupList } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { requireAuth } from "@/lib/auth";
import { PersonaCard } from "@/components/personas/persona-card";
import { appStoreReviewSnippetsFromPersona } from "@/lib/personas/app-store-review-ui";
import { GeneratePersonasButton } from "@/components/personas/generate-personas-button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import { resolvePersonaGroupDisplayName } from "@/lib/personas/legacy-group-display-name";
import { HANDLY_TRACK_ORG_SLUGS } from "@/lib/seed/handlyTracks";

export default async function PersonaGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ count?: string; domainContext?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const group = await getPersonaGroup(groupId);

  if (!group) {
    notFound();
  }

  // Access control: verify user is member of the group's org
  const user = await requireAuth();
  const role = await getUserRole(group.organizationId, user.id);
  if (!role) {
    notFound();
  }

  const personas = await getPersonasForGroupList(groupId);
  const count = query.count ? parseInt(query.count, 10) : 5;
  const domainContext = query.domainContext || group.domainContext || undefined;

  const orgSlug = group.organization?.slug;
  const showGroupDescription =
    Boolean(group.description) &&
    (!orgSlug || !HANDLY_TRACK_ORG_SLUGS.includes(orgSlug));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/personas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Personas
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {resolvePersonaGroupDisplayName(group.name)}
            </h2>
            {showGroupDescription ? (
              <p className="mt-1 text-muted-foreground">{group.description}</p>
            ) : null}
            <div className="mt-2 flex items-center gap-3">
              {group.sourceType !== "PROMPT_GENERATED" ? (
                <Badge
                  variant="secondary"
                  className={SOURCE_LABELS[group.sourceType].className}
                >
                  {SOURCE_LABELS[group.sourceType].label}
                </Badge>
              ) : null}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {group._count.personas} personas
              </span>
            </div>
          </div>
        </div>
      </div>

      {personas.length === 0 ? (
        <GeneratePersonasButton
          groupId={groupId}
          defaultCount={count}
          domainContext={domainContext}
          autoStart={!!query.count}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              groupId={groupId}
              appStoreReviews={appStoreReviewSnippetsFromPersona(
                persona.dataSources
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
