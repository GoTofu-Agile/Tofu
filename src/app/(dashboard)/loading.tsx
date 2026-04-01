import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" variant="shimmer" />
        <Skeleton className="h-9 w-72 max-w-full" variant="shimmer" />
        <Skeleton className="h-4 w-80 max-w-full" variant="shimmer" />
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-4 w-48" variant="shimmer" />
          <Skeleton className="h-9 w-40 sm:ml-auto" variant="shimmer" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Loading workspace status…</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-3 w-24" variant="shimmer" />
            <Skeleton className="mt-3 h-7 w-16" variant="shimmer" />
            <Skeleton className="mt-2 h-3 w-28" variant="shimmer" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border bg-card p-5">
            <Skeleton className="h-3 w-28" variant="shimmer" />
            {Array.from({ length: 3 }).map((__, row) => (
              <Skeleton key={row} className="h-12 w-full rounded-xl" variant="shimmer" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
