import { Badge } from "@/components/ui/badge";

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  supportingEvidence: string;
}

interface ResultsRecommendationsProps {
  recommendations: Recommendation[];
}

const priorityStyles: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function ResultsRecommendations({
  recommendations,
}: ResultsRecommendationsProps) {
  const sorted = [...recommendations].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Recommendations
      </h3>
      <div className="space-y-2">
        {sorted.map((rec, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] ${priorityStyles[rec.priority]}`}>
                {rec.priority}
              </Badge>
              <span className="text-sm font-medium">{rec.title}</span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {rec.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70 italic">
              Evidence: {rec.supportingEvidence}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
