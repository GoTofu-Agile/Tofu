export default function ResultsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-7 w-56 bg-muted rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-5/6 bg-muted rounded" />
      </div>
    </div>
  );
}
