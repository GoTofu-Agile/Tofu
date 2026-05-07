"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { login } from "@/app/(auth)/actions";

function mapError(message: string): string {
  const t = message.toLowerCase();
  if (t.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (t.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (t.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  return "Sign in failed. Please try again.";
}

function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const next = searchParams.get("next");

  const busy = isPending || redirecting || googleBusy;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await login(formData);
        if (result?.error) {
          setError(mapError(result.error));
        } else {
          setRedirecting(true);
        }
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your GoTofu account</p>
      </div>

      {message && (
        <p className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <GoogleButton
        next={next}
        disabled={isPending || redirecting}
        onError={setError}
        onLoadingChange={setGoogleBusy}
      />

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={handleSubmit} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            autoFocus
            required
            disabled={busy}
            onChange={() => setError(null)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              tabIndex={-1}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={busy}
            onChange={() => setError(null)}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {isPending || redirecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {redirecting ? "Redirecting…" : "Signing in…"}
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
