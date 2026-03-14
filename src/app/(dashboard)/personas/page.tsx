export default function PersonasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
        <p className="text-muted-foreground">
          Manage your persona groups and individual personas.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No persona groups yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first persona group to get started.
        </p>
      </div>
    </div>
  );
}
