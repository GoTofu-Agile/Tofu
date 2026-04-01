"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, GitCompare, Shuffle, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

function prefillUrl(prompt: string): string {
  return `/personas/new?prefill=${encodeURIComponent(prompt)}`;
}

export function PersonaNextActionPanel({
  groupId,
  groupName,
  firstPersonaName,
  personaCount,
  domainHint,
  className,
}: {
  groupId: string;
  groupName: string;
  firstPersonaName?: string | null;
  personaCount: number;
  /** Short snippet from group domain context for richer follow-ups */
  domainHint?: string | null;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const anchor = firstPersonaName?.trim() || "your lead persona";
  const context = domainHint?.trim().slice(0, 160) || groupName;

  const similar = `Generate 3 more personas in the same audience as "${anchor}" for "${context}". Vary geography, seniority, and attitude while staying relevant.`;
  const opposite = `Create a persona with the opposite perspective to "${anchor}" for the same product context (${context}) — someone who would push back or delay adoption.`;
  const competitor = `Create a persona who solves the same job as "${anchor}" but primarily uses competitor tools; same rough budget and region.`;

  const cards = [
    {
      id: "similar",
      title: "Generate similar personas",
      description: "More depth in the same segment — fast volume.",
      icon: Users,
      href: prefillUrl(similar),
    },
    {
      id: "opposite",
      title: "Create an opposite",
      description: "Contrast and tension for better interview coverage.",
      icon: Shuffle,
      href: prefillUrl(opposite),
    },
    {
      id: "competitor",
      title: "Competitor-aligned user",
      description: "Someone loyal to alternatives — great for positioning.",
      icon: GitCompare,
      href: prefillUrl(competitor),
    },
  ] as const;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Keep the loop going</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You have {personaCount} in this group. Most teams add contrasts next.
          </p>
        </div>
        <Link
          href={`/personas/${groupId}`}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          View group
        </Link>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.li
            key={c.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : i * 0.06 }}
          >
            <Link
              href={c.href}
              className="flex h-full flex-col rounded-xl border bg-muted/20 p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <c.icon className="size-4 text-primary" aria-hidden />
              <span className="mt-2 text-sm font-medium leading-snug text-foreground">
                {c.title}
              </span>
              <span className="mt-1 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                {c.description}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                Continue
                <ArrowRight className="size-3" />
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-[11px] text-muted-foreground">
          Curiosity: what would this persona look like in a different country or regulation?
        </p>
        <Link
          href={prefillUrl(
            `Variation: same role as "${anchor}" but based in Japan; emphasize consensus-driven buying and local compliance.`
          )}
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 text-xs" })}
        >
          Try a geography twist
        </Link>
      </div>
    </section>
  );
}
