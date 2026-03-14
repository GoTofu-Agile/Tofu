export default function StudiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Studies</h2>
        <p className="text-muted-foreground">
          Run interviews, surveys, and focus groups with synthetic users.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No studies yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a study after setting up your persona groups.
        </p>
      </div>
    </div>
  );
}
