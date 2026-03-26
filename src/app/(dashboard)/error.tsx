"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold">Dashboard failed to load</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Something unexpected happened while loading your workspace."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try refreshing the dashboard. If this keeps happening, contact support.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = "/dashboard")}
            variant="outline"
          >
            Reload page
          </Button>
          <Link
            href="/studies"
            className={buttonVariants({ variant: "outline" })}
          >
            Open studies
          </Link>
        </div>
      </div>
    </div>
  );
}
