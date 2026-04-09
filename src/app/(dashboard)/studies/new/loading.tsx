import { Loader2 } from "lucide-react";

export default function NewStudyLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">Creating your study...</p>
      <p className="text-xs text-muted-foreground">
        This usually takes a few seconds.
      </p>
    </div>
  );
}
