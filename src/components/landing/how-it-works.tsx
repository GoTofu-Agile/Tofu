import { Globe, Users, MessageSquare } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Globe,
    title: "Describe your product",
    description:
      "Tell us about your product and target audience. Our AI researches your market from Reddit, app reviews, and forums to understand real user pain points.",
  },
  {
    step: "02",
    icon: Users,
    title: "Generate personas",
    description:
      "Get realistic user profiles with unique personalities, backstories, and perspectives — including skeptics who challenge your assumptions.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Run interviews",
    description:
      "Conduct multi-turn interviews where AI personas respond naturally. Extract patterns and insights across sessions automatically.",
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
