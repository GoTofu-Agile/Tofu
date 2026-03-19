"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepUrlProps {
  url: string;
  onUrlChange: (url: string) => void;
  disabled?: boolean;
  error: string | null;
}

function isValidHttpUrl(value: string) {
  const t = value.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

export function StepUrl({ url, onUrlChange, disabled, error }: StepUrlProps) {
  const valid = isValidHttpUrl(url);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Enter a company or product URL. We&apos;ll scrape the page and infer the target user
        persona, then research real user signals.
      </p>

      <div className="space-y-2">
        <Label htmlFor="company-url">Company / Product URL</Label>
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-background px-3 transition-[border-color,box-shadow]",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
            valid
              ? "border-primary/60 shadow-sm"
              : "border-input",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <Globe
            className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              valid ? "text-primary" : "text-muted-foreground"
            )}
            aria-hidden
          />
          <Input
            id="company-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            disabled={disabled}
            className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export { isValidHttpUrl };
