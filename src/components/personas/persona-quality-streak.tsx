/**
 * Horizontal “timeline” strip: red → amber → green with a marker at quality %.
 */
export function PersonaQualityStreak({
  qualityScore,
}: {
  qualityScore: number | null;
}) {
  if (qualityScore === null) return null;

  const pct = Math.round(qualityScore * 100);
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="mt-2 w-[min(100%,10.5rem)]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">Quality</span>
        <span className="font-medium tabular-nums text-foreground">{pct}%</span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full ring-1 ring-border/70"
        role="img"
        aria-label={`Quality score ${pct} percent`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500 dark:from-red-500 dark:via-amber-500 dark:to-emerald-400"
          aria-hidden
        />
        <div
          className="absolute top-1/2 z-10 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-sm ring-1 ring-border"
          style={{ left: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
