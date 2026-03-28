"use client";

import { PersonaCard } from "@/components/personas/persona-card";
import type { AppStoreReviewSnippet } from "@/lib/personas/app-store-review-ui";
import { MotionStaggerCard } from "@/components/motion/page-motion";

type PersonaListShape = Parameters<typeof PersonaCard>[0]["persona"];

export function AnimatedPersonaCards({
  groupId,
  rows,
}: {
  groupId: string;
  rows: Array<{
    persona: PersonaListShape;
    appStoreReviews: AppStoreReviewSnippet[];
  }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ persona, appStoreReviews }, i) => (
        <MotionStaggerCard key={persona.id} index={i} className="min-h-0" hoverScale={false}>
          <PersonaCard persona={persona} groupId={groupId} appStoreReviews={appStoreReviews} />
        </MotionStaggerCard>
      ))}
    </div>
  );
}
