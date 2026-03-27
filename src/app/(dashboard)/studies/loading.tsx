export default function StudiesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-md animate-shimmer" />
          <div className="h-4 w-64 rounded-md animate-shimmer" />
        </div>
        <div className="h-9 w-28 rounded-lg animate-shimmer" />
      </div>

      {/* Study cards grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-5 space-y-3"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="h-5 w-40 rounded-md animate-shimmer" />
              <div className="h-5 w-14 rounded-full animate-shimmer" />
            </div>
            <div className="h-4 w-full rounded-md animate-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 rounded-full animate-shimmer" />
              <div className="h-4 w-20 rounded-md animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
