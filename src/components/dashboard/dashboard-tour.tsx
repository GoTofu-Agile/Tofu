"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TourStep = {
  title: string;
  description: string;
  whyItMatters: string;
  href: string;
  cta: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Set Product Context",
    description: "Tell GoTofu what you build and who you serve.",
    whyItMatters: "This makes persona generation and interview insights far more relevant.",
    href: "/settings",
    cta: "Open Settings",
  },
  {
    title: "Create Personas",
    description: "Generate your first audience as a persona group.",
    whyItMatters: "Personas are the participants for studies and interviews.",
    href: "/personas/new",
    cta: "Create Personas",
  },
  {
    title: "Run a Study",
    description: "Create an interview study and run sessions with your personas.",
    whyItMatters: "This creates transcripts you can analyze for decisions.",
    href: "/studies/new",
    cta: "Start Study",
  },
  {
    title: "Review Insights",
    description: "Turn interview transcripts into themes, quotes, and recommendations.",
    whyItMatters: "Insights help you prioritize product decisions with confidence.",
    href: "/studies",
    cta: "View Studies",
  },
];

interface DashboardTourProps {
  orgId: string;
  defaultOpen?: boolean;
}

export function DashboardTour({ orgId, defaultOpen = false }: DashboardTourProps) {
  const storageKey = `tofu:dashboard-tour:dismissed:${orgId}`;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / TOUR_STEPS.length) * 100),
    [stepIndex]
  );

  useEffect(() => {
    if (!defaultOpen) return;
    // Only auto-open once per workspace.
    try {
      const dismissed = window.localStorage.getItem(storageKey) === "1";
      if (dismissed) return;
      // Avoid state updates synchronously in effect body.
      requestAnimationFrame(() => setOpen(true));
    } catch {
      // If localStorage fails, fall back to auto-open.
      requestAnimationFrame(() => setOpen(true));
    }
  }, [defaultOpen, storageKey]);

  function dismissTour() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Product tour
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) dismissTour();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Quick walkthrough ({stepIndex + 1}/{TOUR_STEPS.length})
            </DialogTitle>
            <DialogDescription>
              Understand how each part of the dashboard connects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{step.whyItMatters}</p>
              <Link
                href={step.href}
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex text-sm font-medium underline underline-offset-2"
              >
                {step.cta}
              </Link>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isFirst}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
              {!isLast ? (
                <Button
                  type="button"
                  onClick={() =>
                    setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1))
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    dismissTour();
                  }}
                >
                  Finish
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

