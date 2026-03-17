"use client";

import { cn } from "@/lib/utils";
import { APP_URL } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 -z-0">
            <div className="absolute -top-24 -right-24 size-64 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-white/5 blur-2xl" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Stop guessing.
              <br />
              Start understanding.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/70">
              Run synthetic interviews today. No recruitment, no scheduling,
              no waiting — just honest, unfiltered feedback.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`${APP_URL}/signup`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 border-white/20 bg-white px-6 text-base text-primary hover:bg-white/90"
                )}
              >
                Get started for free
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
