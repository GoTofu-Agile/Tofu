"use client";

import { useEffect, useState } from "react";
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

function ArcadeEmbed() {
  return (
    <div className="overflow-hidden rounded-xl">
      <div
        style={{
          position: "relative",
          // Keep extra vertical space so Arcade's bottom navigation (blue arrows) stays visible.
          paddingBottom: "calc(49.941520467836256% + 64px)",
          height: 0,
          width: "100%",
        }}
      >
        <iframe
          src="https://demo.arcade.software/w7LoJ2jI7Ti6KlnBXptv?embed&embed_mobile=inline&embed_desktop=inline&show_copy_link=true"
          title="Generate and Analyze Insights from User Research Interviews"
          frameBorder="0"
          loading="lazy"
          allowFullScreen
          allow="clipboard-write"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            colorScheme: "light",
          }}
        />
      </div>
    </div>
  );
}

interface DashboardTourProps {
  orgId: string;
  defaultOpen?: boolean;
}

export function DashboardTour({ orgId, defaultOpen = false }: DashboardTourProps) {
  const storageKey = `tofu:dashboard-tour:dismissed:${orgId}`;
  const [open, setOpen] = useState(false);

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
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Quick walkthrough</DialogTitle>
            <DialogDescription>
              A short interactive tutorial to get you started.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="mx-auto w-full max-w-4xl">
              <ArcadeEmbed />
            </div>
            <div className="mx-auto w-full max-w-4xl">
              <a
                href="https://demo.arcade.software/w7LoJ2jI7Ti6KlnBXptv"
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-medium underline underline-offset-2"
              >
                Open tutorial in new tab
              </a>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  dismissTour();
                }}
              >
                Skip tour
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  dismissTour();
                }}
              >
                Finish
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

