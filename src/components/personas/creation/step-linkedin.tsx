"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileUp, Loader2, Linkedin } from "lucide-react";
import type { ExtractedContext } from "@/lib/validation/schemas";

interface StepLinkedinProps {
  onExtracted: (extracted: ExtractedContext) => void;
  onBack: () => void;
}

export function StepLinkedin({ onExtracted, onBack }: StepLinkedinProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/personas/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to extract PDF");
      }

      const data: ExtractedContext = await res.json();
      onExtracted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Export your LinkedIn profile as a PDF (LinkedIn → Me → View Profile → More → Save to PDF), then upload it here.
        </p>
      </div>

      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 cursor-pointer hover:border-foreground/30 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Linkedin className="h-10 w-10 text-muted-foreground/50" />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload LinkedIn PDF</p>
            <p className="text-xs text-muted-foreground">PDF files only</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); setError(null); }
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleExtract} disabled={!file || loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Extract & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
