export default function PersonaGroupLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-7 w-64 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-5 w-16 bg-muted rounded" />
            </div>
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-8 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
