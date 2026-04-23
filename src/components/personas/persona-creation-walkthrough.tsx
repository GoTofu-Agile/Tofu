"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setupStepLabel } from "@/lib/onboarding/dashboard-copy";

const STEPS = [
  {
    title: "What you’re creating",
    body: "A persona group is one audience slice—like “ER nurses” or “B2B finance admins.” Those synthetic people become the participants in your studies and interviews.",
  },
  {
    title: "How to start",
    body: "Use the main box to describe who you need, pick a quick starter, or open other tabs for templates, a company URL, manual fields, app reviews, and more.",
  },
  {
    title: "What happens next",
    body: "Depending on the path you choose, GoTofu may research public signals, then generates your personas. You set how many to create before you run it.",
  },
] as const;

function storageKey(orgId: string) {
  return `tofu:personas-creation-tour:${orgId}`;
}

function markSeen(orgId: string) {
  try {
    window.localStorage.setItem(storageKey(orgId), "1");
  } catch {
    // ignore
  }
}

function hasSeen(orgId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(orgId)) === "1";
  } catch {
    return false;
  }
}

interface PersonaCreationWalkthroughProps {
  orgId: string;
  /** First persona group in this workspace — auto-open walkthrough once. */
  autoOpen: boolean;
}

export function PersonaCreationWalkthrough({ orgId, autoOpen }: PersonaCreationWalkthroughProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / STEPS.length) * 100),
    [stepIndex]
  );

  useEffect(() => {
    if (!autoOpen) return;
    if (hasSeen(orgId)) return;
    requestAnimationFrame(() => setOpen(true));
  }, [autoOpen, orgId]);

  function closeAndRemember() {
    markSeen(orgId);
    setOpen(false);
    setStepIndex(0);
  }

  function finishTourWithCelebration() {
    markSeen(orgId);
    setOpen(false);
    setStepIndex(0);
    toast.success("Nice work — you’re ready to create your personas below.");
    if (!reduced) {
      confetti({
        particleCount: 75,
        spread: 85,
        startVelocity: 30,
        origin: { y: 0.55 },
      });
      window.setTimeout(() => {
        confetti({
          particleCount: 45,
          spread: 100,
          origin: { y: 0.62 },
          scalar: 0.85,
        });
      }, 200);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      markSeen(orgId);
      setStepIndex(0);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => {
            setStepIndex(0);
            setOpen(true);
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          How this page works
        </Button>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to Home
        </Link>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {setupStepLabel(1)}
            </p>
            <DialogTitle>Create personas — quick tour</DialogTitle>
            <DialogDescription>
              {stepIndex + 1} of {STEPS.length}. You’ll do this before the &quot;Create Personas&quot; tools below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={closeAndRemember}
            >
              Skip
            </Button>
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={isFirst}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
              {!isLast ? (
                <Button type="button" onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={finishTourWithCelebration}>
                  Start creating personas
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
