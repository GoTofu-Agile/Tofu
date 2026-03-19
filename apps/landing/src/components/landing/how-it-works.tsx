import { Users, Sparkles, MessageSquare } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Users,
    title: "Define your audience",
    description:
      "Describe the people you want to talk to — by prompt, LinkedIn profile, company URL, or deep web research. GoTofu finds real-world context from Reddit, forums, and reviews.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Generate personas",
    description:
      "Get psychologically rich user profiles with unique personalities, backstories, and honest perspectives — including skeptics who challenge your thinking.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Run studies",
    description:
      "Run in-depth interviews where personas respond naturally based on their personality and backstory. Extract patterns and insights across sessions automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to insights in three steps
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <item.icon className="size-5" />
                </div>
                <span className="text-sm font-bold text-muted-foreground/50">
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
