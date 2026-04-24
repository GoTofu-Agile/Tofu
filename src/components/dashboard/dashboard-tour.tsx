"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/components/assistant/assistant-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ArcadeEmbed() {
  const [reloadKey, setReloadKey] = useState(0);
  const embedSrc =
    "https://demo.arcade.software/w7LoJ2jI7Ti6KlnBXptv?embed&embed_mobile=inline&embed_desktop=inline&show_copy_link=true";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          If the embed is blocked in-browser, open the tutorial directly.
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://demo.arcade.software/w7LoJ2jI7Ti6KlnBXptv"
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-medium underline underline-offset-2"
          >
            Open tutorial in new tab
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Reload embed
          </Button>
        </div>
      </div>
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
            key={reloadKey}
            src={embedSrc}
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
    </div>
  );
}

interface DashboardTourProps {
  orgId: string;
  defaultOpen?: boolean;
}

export function DashboardTour({ orgId, defaultOpen = false }: DashboardTourProps) {
  const { close, setDisabled } = useAssistant();
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

  useEffect(() => {
    setDisabled(open);
    if (open) close();
    return () => setDisabled(false);
  }, [open, close, setDisabled]);

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
