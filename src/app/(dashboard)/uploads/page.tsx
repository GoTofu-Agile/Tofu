export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Uploads</h2>
        <p className="text-muted-foreground">
          Upload transcripts and datasets to generate personas.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No uploads yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your first file to create personas from your own data.
        </p>
      </div>
    </div>
  );
}
