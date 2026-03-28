import Link from "next/link";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";
import { SOURCE_LABELS } from "@/lib/constants/source-labels";
import { TrackPageView } from "@/components/analytics/track-page-view";

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
  const isPlaceholder = rawName.length === 0 || rawName.toLowerCase() === "persona group";

  const ctx = parseDomainContext(group.domainContext);
  const titleCandidate =
    (!isPlaceholder && rawName) ||
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

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; sort?: string }>;
}) {
  const { activeOrgId } = await requireAuthWithActiveOrg();
  const params = await searchParams;

  const groups = await getPersonaGroupsForOrg(activeOrgId);
  const query = (params.q ?? "").trim().toLowerCase();
  const sourceFilter = (params.source ?? "all").toUpperCase();
  const sort = params.sort ?? "newest";

  const filtered = groups.filter((group) => {
    const { title, subtitle } = computeGroupDisplay(group);
    const matchesQuery =
      !query ||
      title.toLowerCase().includes(query) ||
      subtitle.toLowerCase().includes(query) ||
      (group.name ?? "").toLowerCase().includes(query);
    const matchesSource =
      sourceFilter === "ALL" || group.sourceType === sourceFilter;
    return matchesQuery && matchesSource;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") {
      return (a.name ?? "").localeCompare(b.name ?? "");
    }
    if (sort === "personas") {
      return b._count.personas - a._count.personas;
    }
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  return (
    <div className="space-y-6">
      <TrackPageView page="personas_list" area="personas" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
          <p className="text-muted-foreground">
            Build realistic audiences for studies and decision-making.
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

      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Start here</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Treat personas as directional evidence, not perfect truth. Prioritize groups with high confidence and clear objections/triggers before running studies.
        </p>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
          <p className="rounded-md bg-muted/30 px-2.5 py-2">
            1) Create a focused group around one audience segment.
          </p>
          <p className="rounded-md bg-muted/30 px-2.5 py-2">
            2) Compare objections and triggers across top personas.
          </p>
          <p className="rounded-md bg-muted/30 px-2.5 py-2">
            3) Use study results to validate or adjust assumptions.
          </p>
        </div>
      </section>

      <form className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search groups..."
          className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2"
          aria-label="Search persona groups"
        />
        <select
          name="source"
          defaultValue={params.source ?? "all"}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Filter by source"
        >
          <option value="all">All sources</option>
          <option value="PROMPT_GENERATED">Prompted</option>
          <option value="DATA_BASED">Data backed</option>
          <option value="UPLOAD_BASED">Own data</option>
        </select>
        <div className="flex gap-2">
          <select
            name="sort"
            defaultValue={params.sort ?? "newest"}
            className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
            aria-label="Sort persona groups"
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="personas">Most personas</option>
          </select>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
          >
            Apply
          </button>
        </div>
      </form>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No persona groups yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with one audience-focused group (for example: &ldquo;SMB founders evaluating analytics tools&rdquo;).
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: adding Product Context in Settings improves persona quality.
          </p>
          <Link
            href="/personas/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <Plus className="h-4 w-4" />
            Create persona group
          </Link>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h3 className="text-base font-medium">No matching groups</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search term or source filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((group) => {
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
