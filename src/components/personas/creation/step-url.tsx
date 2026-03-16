"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Globe, Loader2 } from "lucide-react";
import type { ExtractedContext } from "@/lib/validation/schemas";

interface StepUrlProps {
  onExtracted: (extracted: ExtractedContext) => void;
  onBack: () => void;
}

export function StepUrl({ onExtracted, onBack }: StepUrlProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = url.startsWith("http://") || url.startsWith("https://");

  async function handleExtract() {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/personas/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to extract URL");
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
      <p className="text-sm text-muted-foreground">
        Enter a company or product URL. We&apos;ll scrape the page and infer the target user persona.
      </p>

      <div className="space-y-2">
        <Label htmlFor="url">Company / Product URL</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && isValid && !loading && handleExtract()}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleExtract} disabled={!isValid || loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
          </Button>
        </div>
        {loading && (
          <p className="text-xs text-muted-foreground">Scraping and analyzing... this takes ~10 seconds.</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
