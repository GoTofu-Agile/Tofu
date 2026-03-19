import {
  BrainCircuit,
  MessageSquareText,
  FileText,
  Lightbulb,
  Zap,
  Download,
} from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Research-Powered Personas",
    description:
      "Personas built from real data — Reddit threads, app store reviews, forum discussions. Not generic stereotypes.",
  },
  {
    icon: MessageSquareText,
    title: "Multi-Turn Interviews",
    description:
      "Natural conversations that go deep. Personas stay in character with consistent personalities and realistic follow-ups.",
  },
  {
    icon: FileText,
    title: "AI Interview Guides",
    description:
      "Generate structured interview guides from your research goals. The AI follows them naturally, probing where it matters.",
  },
  {
    icon: Lightbulb,
    title: "Auto-Generated Insights",
    description:
      "Key themes, patterns, and actionable recommendations extracted automatically from every interview session.",
  },
  {
    icon: Zap,
    title: "Batch Interview Runner",
    description:
      "Run interviews with dozens of personas simultaneously. Get comprehensive coverage in the time it takes to make coffee.",
  },
  {
    icon: Download,
    title: "Export & Analyze",
    description:
      "Download full transcripts as CSV. Bring your data into any analysis tool, or let our AI surface what matters.",
  },
];

export function Features() {
  return (
    <section id="features">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to understand your users
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From persona generation to insight extraction — one platform for
            your entire synthetic research workflow.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="size-5 text-foreground" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
