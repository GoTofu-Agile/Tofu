"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setupStepLabel } from "@/lib/onboarding/dashboard-copy";

const STORAGE_PREFIX = "tofu:onboarding:post-personas-step3:";

function storageKey(orgId: string) {
  return `${STORAGE_PREFIX}${orgId}`;
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

function stripWelcomeQueryParam() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") !== "1") return;
    url.searchParams.delete("welcome");
    const q = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${q ? `?${q}` : ""}${url.hash}`);
  } catch {
    // ignore
  }
}

/**
 * After persona generation completes, users land on the group with ?welcome=1.
 * Show the next onboarding walkthrough step (create a study) once per workspace.
 */
export function PostPersonaCreationNextStepDialog({
  orgId,
  welcome,
}: {
  orgId: string;
  welcome: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navigatingToStudiesRef = useRef(false);

  useEffect(() => {
    if (!welcome) return;
    if (hasSeen(orgId)) return;
    requestAnimationFrame(() => setOpen(true));
  }, [welcome, orgId]);

  function finish() {
    markSeen(orgId);
    stripWelcomeQueryParam();
    setOpen(false);
  }

  function goToNewStudy() {
    navigatingToStudiesRef.current = true;
    markSeen(orgId);
    stripWelcomeQueryParam();
    setOpen(false);
    router.push("/studies/new");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          return;
        }
        if (navigatingToStudiesRef.current) {
          navigatingToStudiesRef.current = false;
          return;
        }
        finish();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {setupStepLabel(2)}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50">
              <FlaskConical className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <DialogTitle className="text-left">Run your first study</DialogTitle>
          </div>
          <DialogDescription className="text-left text-sm leading-relaxed">
            You&apos;ve finished creating personas. Next, start a <span className="font-medium text-foreground">study</span>
            : pick this group (and others if you like), write a short interview goal, then run AI interviews. When sessions
            finish, you can generate insights—themes, quotes, and recommendations.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-stretch sm:space-x-0">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="w-full shrink-0 gap-2"
            onClick={goToNewStudy}
          >
            Start a study
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full shrink-0" onClick={finish}>
            I&apos;ll do this later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
