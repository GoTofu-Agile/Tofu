"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { login } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";

function mapError(message: string): string {
  const t = message.toLowerCase();
  if (t.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (t.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (t.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  return "Sign in failed. Please try again.";
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <path d="M21.6 12.23c0-.82-.07-1.61-.21-2.36H12v4.47h5.4a4.62 4.62 0 0 1-2.01 3.03v2.52h3.25c1.9-1.75 2.96-4.33 2.96-7.66Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.25-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.06v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.42 13.89a5.99 5.99 0 0 1 0-3.78v-2.6H3.06a10 10 0 0 0 0 8.98l3.36-2.6Z" fill="#FBBC05" />
      <path d="M12 5.98c1.47 0 2.8.5 3.84 1.49l2.88-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.36 2.6C7.2 7.74 9.4 5.98 12 5.98Z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const next = searchParams.get("next");

  const busy = loading || googleLoading || redirecting;

  async function handleSubmit(formData: FormData) {
    if (busy) return;
    setLoading(true);
    setError(null);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(mapError(result.error));
        return;
      }
      setRedirecting(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setRedirecting(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectPath = next
        ? `/callback?next=${encodeURIComponent(next)}`
        : "/callback";
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      ).replace(/\/$/, "");
      await supabase.auth.signOut();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}${redirectPath}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        setError("Google sign-in is unavailable right now. Try again.");
        return;
      }
      if (data.url) window.location.assign(data.url);
    } catch {
      setError("Could not start Google sign-in. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your GoTofu account
        </p>
      </div>

      {/* Info / error banners */}
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

      {/* Google — primary OAuth CTA */}
      <Button
        variant="outline"
        className="w-full gap-2"
        size="lg"
        onClick={handleGoogle}
        disabled={busy}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email / password form */}
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
            required
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              tabIndex={-1}
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
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {loading || redirecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {redirecting ? "Redirecting…" : "Signing in…"}
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Footer */}
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
