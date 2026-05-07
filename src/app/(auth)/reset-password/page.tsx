"use client";

import { useState, useTransition, useDeferredValue } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updatePassword } from "@/app/(auth)/actions";

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const deferredPassword = useDeferredValue(password);

  function handleSubmit(formData: FormData) {
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await updatePassword(formData);
        if (result?.error) setError("Could not update password. The link may have expired.");
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a strong password you haven&apos;t used before.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Minimum 6 characters"
            autoFocus
            required
            minLength={6}
            disabled={isPending}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
          />
          <PasswordStrength password={deferredPassword} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
            disabled={isPending}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
