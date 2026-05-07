"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "./google-icon";

interface Props {
  next?: string | null;
  /** Disables the button when the parent form is also busy */
  disabled?: boolean;
  onError: (message: string) => void;
  /** Called when loading state changes so the parent can disable its own fields */
  onLoadingChange?: (loading: boolean) => void;
}

export function GoogleButton({ next, disabled, onError, onLoadingChange }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    onLoadingChange?.(true);
    onError("");
    try {
      const supabase = createClient();
      const redirectPath = next
        ? `/callback?next=${encodeURIComponent(next)}`
        : "/callback";
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      ).replace(/\/$/, "");
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}${redirectPath}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        onError("Google sign-in is unavailable right now. Try again.");
        return;
      }
      if (data.url) window.location.assign(data.url);
    } catch {
      onError("Could not start Google sign-in. Please try again.");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      size="lg"
      onClick={handleClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      Continue with Google
    </Button>
  );
}
