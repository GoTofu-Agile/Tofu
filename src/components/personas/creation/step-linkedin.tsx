"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepLinkedinProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error: string | null;
}

export function StepLinkedin({
  file,
  onFileChange,
  disabled,
  error,
}: StepLinkedinProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Upload a CV or resume PDF. We&apos;ll extract key details and use them to ground the
        personas, then research real user signals.
      </p>

      <div className="space-y-2">
        <Label>CV / Resume (PDF)</Label>
        <button
          type="button"
          disabled={disabled}
          aria-label={file ? `Selected file: ${file.name}. Click to replace` : "Upload CV or resume PDF"}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 text-center transition-[border-color,box-shadow]",
            "hover:border-foreground/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            file
              ? "border-primary/60 border-solid bg-primary/[0.02] shadow-sm"
              : "border-muted-foreground/25",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <FileText
            className={cn(
              "h-10 w-10 transition-colors",
              file ? "text-primary" : "text-muted-foreground/50"
            )}
            aria-hidden
          />
          {file ? (
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">Click to upload CV / Resume</p>
              <p className="text-xs text-muted-foreground">PDF files only</p>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChange(f);
            e.target.value = "";
          }}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
