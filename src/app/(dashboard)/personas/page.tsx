import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { PersonaGroupsHeader, PersonaGroupsList } from "@/components/personas/persona-groups-list";
import type { PersonaGroupListItem } from "@/components/personas/persona-groups-list";
import { MotionPageEnter } from "@/components/motion/page-motion";

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

export default async function PersonasPage() {
  const { activeOrgId } = await requireAuthWithActiveOrg();

  const groups = await getPersonaGroupsForOrg(activeOrgId);

  const items: PersonaGroupListItem[] = groups.map((g) => {
    const { title, subtitle } = computeGroupDisplay(g);
    return {
      id: g.id,
      title,
      subtitle,
      sourceType: g.sourceType,
      personaCount: g._count.personas,
    };
  });

  return (
    <MotionPageEnter className="space-y-6">
      <PersonaGroupsHeader />
      <PersonaGroupsList items={items} />
    </MotionPageEnter>
  );
}
