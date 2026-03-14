import { notFound } from "next/navigation";
import Link from "next/link";
import { getPersonaGroup, getPersonasForGroup } from "@/lib/db/queries/personas";
import { PersonaCard } from "@/components/personas/persona-card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";

export default async function PersonaGroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await getPersonaGroup(groupId);

  if (!group) {
    notFound();
  }

  const personas = await getPersonasForGroup(groupId);

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
              {group.name}
            </h2>
            {group.description && (
              <p className="mt-1 text-muted-foreground">{group.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <Badge variant="secondary">
                {group.sourceType.replace("_", " ").toLowerCase()}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {group._count.personas} personas
              </span>
            </div>
          </div>
        </div>
      </div>

      {personas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Generating personas...</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your personas are being generated. Refresh the page to check progress.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              groupId={groupId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
