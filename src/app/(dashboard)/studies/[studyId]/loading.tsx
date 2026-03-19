export default function StudyDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="h-7 w-72 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
