"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PersonaNextActionPanel } from "@/components/personas/persona-next-action-panel";
import { PersonaProgressTracker } from "@/components/personas/persona-progress-tracker";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function PersonaGroupEngagement({
  groupId,
  groupName,
  personaCount,
  firstPersonaName,
  domainContext,
  welcomeIntent,
  platformPersonasToday,
  workspacePersonaCount,
  workspaceTierLabel,
}: {
  groupId: string;
  groupName: string;
  personaCount: number;
  firstPersonaName?: string | null;
  domainContext?: string | null;
  /** From URL: first landing after a successful generation */
  welcomeIntent?: boolean;
  /** Global social proof (all workspaces, UTC day). */
  platformPersonasToday?: number;
  workspacePersonaCount?: number;
  workspaceTierLabel?: string;
}) {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!welcomeIntent) return;
    const dismissed = sessionStorage.getItem(`gotofu-welcome-${groupId}`);
    if (!dismissed) setShowWelcome(true);
  }, [welcomeIntent, groupId]);

  function dismissWelcome() {
    sessionStorage.setItem(`gotofu-welcome-${groupId}`, "1");
    setShowWelcome(false);
  }

  if (personaCount === 0) return null;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {showWelcome ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-emerald-950 dark:text-emerald-100">
                <span className="font-semibold">Nice work.</span> Add contrasting personas while
                context is fresh — it makes interviews and studies much stronger.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={dismissWelcome}
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PersonaProgressTracker
        variant="full"
        workspacePersonaCount={workspacePersonaCount}
        workspaceTierLabel={workspaceTierLabel}
      />

      {typeof platformPersonasToday === "number" && platformPersonasToday > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Today on GoTofu:{" "}
          <span className="font-medium text-foreground">{platformPersonasToday}</span> personas
          generated across teams.
        </p>
      ) : null}

      <p className="text-center text-[11px] text-muted-foreground">
        Teams typically run <span className="font-medium text-foreground">5–15</span> personas per
        study — you&apos;re building a library, not a one-off.
      </p>

      <PersonaNextActionPanel
        groupId={groupId}
        groupName={groupName}
        firstPersonaName={firstPersonaName}
        personaCount={personaCount}
        domainHint={domainContext}
      />
    </div>
  );
}
