"use client";

import { Badge } from "@/components/ui/badge";
import {
  UsersRound,
  ClipboardCheck,
  MousePointerClick,
  BarChart3,
  Share2,
  Layers,
} from "lucide-react";

const upcoming = [
  {
    icon: UsersRound,
    title: "Focus Groups",
    description: "Simulate group discussions with multiple personas interacting in real time.",
    status: "In development",
  },
  {
    icon: ClipboardCheck,
    title: "Surveys at Scale",
    description: "Deploy structured surveys to hundreds of synthetic respondents simultaneously.",
    status: "In development",
  },
  {
    icon: MousePointerClick,
    title: "Usability Testing",
    description: "Let AI personas walk through your prototype and surface friction points.",
    status: "Planned",
  },
  {
    icon: BarChart3,
    title: "Analysis Dashboards",
    description: "Interactive dashboards to visualize patterns across studies and sessions.",
    status: "Planned",
  },
  {
    icon: Share2,
    title: "Team Collaboration",
    description: "Share studies, tag colleagues, and build a shared research repository.",
    status: "Planned",
  },
  {
    icon: Layers,
    title: "Custom Persona Templates",
    description: "Save and reuse persona configurations across studies and teams.",
    status: "Planned",
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Roadmap
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            What&apos;s coming next
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We&apos;re building the future of synthetic user research. Here&apos;s
            what&apos;s on our radar.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-dashed border-border/60 bg-card/50 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="size-5 text-muted-foreground" />
                </div>
                <Badge
                  variant={
                    item.status === "In development" ? "secondary" : "outline"
                  }
                  className="text-[10px]"
                >
                  {item.status}
                </Badge>
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
