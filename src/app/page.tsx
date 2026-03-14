"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          GoTofu
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Synthetic user interviews at scale. Generate realistic personas,
          run studies, and get actionable insights — without recruiting a
          single participant.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
