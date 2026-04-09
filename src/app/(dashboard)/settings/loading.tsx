export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border p-6">
        <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-32 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
