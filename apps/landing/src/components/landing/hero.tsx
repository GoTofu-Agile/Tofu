"use client";

import { cn } from "@/lib/utils";
import { APP_URL } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
            <Sparkles className="size-3" />
            AI-Powered User Research
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Discover what users really think.{" "}
            <span className="text-muted-foreground">At scale.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Generate realistic AI personas from real-world data, run synthetic
            interviews at scale, and get actionable insights — in minutes, not
            months.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={`${APP_URL}/signup`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "gap-2 px-6 text-base"
              )}
            >
              Start for free
              <ArrowRight className="size-4" />
            </a>
            <a
              href="#how-it-works"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "px-6 text-base"
              )}
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
          <div className="rounded-xl border border-border/60 bg-card p-1 shadow-2xl shadow-black/5 ring-1 ring-black/[0.03]">
            <div className="rounded-lg bg-muted/30 p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  SP
                </div>
                <div>
                  <p className="text-sm font-medium">Sarah Park</p>
                  <p className="text-xs text-muted-foreground">
                    Tech-savvy early adopter · Skeptical
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  In Progress
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    What frustrates you most about current project management tools?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-card px-4 py-2.5 text-sm shadow-sm ring-1 ring-border/50">
                    Honestly? Most of them try to do everything and end up doing
                    nothing well. I&apos;ve tried Asana, Monday, and Linear — they all
                    start simple but become bloated within months. What I really
                    need is something that stays out of my way and just lets me
                    ship.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    Can you tell me about a specific moment where the tool got in your way?
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-1">
                  <div className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
                  <div className="animation-delay-150 size-1.5 animate-pulse rounded-full bg-muted-foreground/40" />
                  <div className="animation-delay-300 size-1.5 animate-pulse rounded-full bg-muted-foreground/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
