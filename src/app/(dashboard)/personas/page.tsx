import Link from "next/link";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import { resolvePersonaGroupDisplayName } from "@/lib/personas/legacy-group-display-name";

function parseDomainContext(domainContext?: string | null) {
  const ctx = domainContext ?? "";
  const lines = ctx
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const get = (prefix: string) =>
    lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()))?.slice(prefix.length).trim();

  return {
    product: get("Product:"),
    industry: get("Industry:"),
    audience: get("Target audience:"),
    userDesc: get("User description:"),
  };
}

function computeGroupDisplay(group: {
  name: string | null;
  description: string | null;
  domainContext?: string | null;
}) {
  const rawName = (group.name ?? "").trim();
  const displayName = resolvePersonaGroupDisplayName(group.name);
  const isPlaceholder = rawName.length === 0 || rawName.toLowerCase() === "persona group";

  const ctx = parseDomainContext(group.domainContext);
  const titleCandidate =
    (!isPlaceholder && displayName) ||
    ctx.audience ||
    ctx.userDesc ||
    (group.description ?? "").trim();

  const title = (titleCandidate || "Persona audience").slice(0, 80);

  const parts = [ctx.product && `Product: ${ctx.product}`, ctx.industry && `Industry: ${ctx.industry}`].filter(
    Boolean
  ) as string[];
  const subtitleCandidate =
    parts.join(" • ") ||
    (ctx.audience && `Audience: ${ctx.audience}`) ||
    (ctx.userDesc && `Brief: ${ctx.userDesc}`) ||
    (!isPlaceholder && (group.description ?? "").trim()) ||
    "";

  return {
    title,
    subtitle: subtitleCandidate.slice(0, 140),
  };
}

export default async function PersonasPage() {
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const groups = await getPersonaGroupsForOrg(activeOrgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
          <p className="text-muted-foreground">
            Manage your persona groups and individual personas.
          </p>
        </div>
        <Link
          href="/personas/new"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Create Personas
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No persona groups yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first persona group to get started.
          </p>
          <Link
            href="/personas/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <Plus className="h-4 w-4" />
            Get Started
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const { title, subtitle } = computeGroupDisplay(group);
            return (
              <Link
                key={group.id}
                href={`/personas/${group.id}`}
                className="group rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium group-hover:underline truncate">{title}</h3>
                    {subtitle ? (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
                    ) : null}
                  </div>
                  {group.sourceType !== "PROMPT_GENERATED" ? (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${SOURCE_LABELS[group.sourceType].className}`}
                    >
                      {SOURCE_LABELS[group.sourceType].label}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{group._count.personas} personas</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
