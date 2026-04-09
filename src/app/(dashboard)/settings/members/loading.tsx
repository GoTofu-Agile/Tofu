export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border p-6 space-y-4">
        <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="rounded-lg border divide-y">
        <div className="h-14 animate-pulse bg-muted/50" />
        <div className="h-14 animate-pulse bg-muted/40" />
        <div className="h-14 animate-pulse bg-muted/30" />
      </div>
    </div>
  );
}
