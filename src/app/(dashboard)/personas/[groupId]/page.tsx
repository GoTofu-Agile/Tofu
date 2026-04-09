import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersonaGroup, getPersonasForGroupList } from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { requireAuth } from "@/lib/auth";
import { appStoreReviewSnippetsFromPersona } from "@/lib/personas/app-store-review-ui";
import { GeneratePersonasButton } from "@/components/personas/generate-personas-button";
import { AnimatedPersonaCards } from "@/components/personas/animated-persona-cards";
import { MotionPageEnter } from "@/components/motion/page-motion";
import { PersonaGroupEngagement } from "@/components/personas/persona-group-engagement";
import { getPersonaCreationContext } from "@/lib/personas/persona-creation-context";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft, Users } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import { PersonaGroupActions } from "@/components/personas/persona-group-actions";

export default async function PersonaGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ count?: string; domainContext?: string; welcome?: string }>;
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
  const canManage = role !== "VIEWER";

  const personas = await getPersonasForGroupList(groupId);
  const count = query.count ? parseInt(query.count, 10) : 5;
  const domainContext = query.domainContext || group.domainContext || undefined;

  const personaRows = personas.map((persona) => ({
    persona,
    appStoreReviews: appStoreReviewSnippetsFromPersona(persona.dataSources),
  }));

  const creationContext = await getPersonaCreationContext(group.organizationId);

  return (
    <MotionPageEnter className="space-y-6">
      <div>
        <Link
          href="/personas"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Personas
        </Link>
        <PageHeader
          className="mb-3 sm:mb-3"
          title={group.name}
          description={group.description ?? undefined}
          actions={
            canManage ? (
              <PersonaGroupActions
                groupId={groupId}
                initialName={group.name}
                initialDescription={group.description}
              />
            ) : null
          }
        />
        <div className="mb-8 flex flex-wrap items-center gap-3">
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

      {personas.length === 0 ? (
        <GeneratePersonasButton
          groupId={groupId}
          defaultCount={count}
          domainContext={domainContext}
          autoStart={!!query.count}
        />
      ) : (
        <>
          <PersonaGroupEngagement
            groupId={groupId}
            groupName={group.name}
            personaCount={personas.length}
            firstPersonaName={personas[0]?.name ?? null}
            domainContext={group.domainContext}
            welcomeIntent={query.welcome === "1"}
            platformPersonasToday={creationContext.platformPersonasToday}
            workspacePersonaCount={creationContext.organizationPersonaCount}
            workspaceTierLabel={creationContext.qualityTierLabel}
          />
          <AnimatedPersonaCards groupId={groupId} rows={personaRows} />
        </>
      )}
    </MotionPageEnter>
  );
}
