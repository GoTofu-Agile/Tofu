"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { login } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";

function mapLoginError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
  }
  if (text.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (text.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return "Sign in failed. Please try again.";
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const next = searchParams.get("next");

  async function handleSubmit(formData: FormData) {
    if (loading || googleLoading || redirecting) return;
    setLoading(true);
    setError(null);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(mapLoginError(result.error));
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectPath = next
        ? `/callback?next=${encodeURIComponent(next)}`
        : "/callback";
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
      const redirectTo = `${appUrl}${redirectPath}`;

      await supabase.auth.signOut();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });

      if (oauthError) {
        setError("Google sign-in is temporarily unavailable. Please try again.");
        setGoogleLoading(false);
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }
    } catch {
      setError("Could not start Google sign-in. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell>
    <Card className="border-border/80 shadow-[var(--shadow-card)]">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Sign in
        </CardTitle>
        <CardDescription>
          Use your work email—we’ll drop you back where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <p
            className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground"
            role="status"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <form action={handleSubmit} className="space-y-4" aria-busy={loading || redirecting}>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              disabled={loading || googleLoading || redirecting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              disabled={loading || googleLoading || redirecting}
            />
          </div>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            size="lg"
            disabled={loading || googleLoading || redirecting}
          >
            {loading || redirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {redirecting ? "Redirecting..." : "Signing in..."}
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          {(loading || redirecting) && (
            <p className="text-center text-xs text-muted-foreground">
              Please wait a moment, this can take a few seconds.
            </p>
          )}
        </form>
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/60 pt-6 sm:justify-start">
        <p className="text-sm text-muted-foreground">
          New to GoTofu?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
    </AuthShell>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.6 12.23c0-.82-.07-1.61-.21-2.36H12v4.47h5.4a4.62 4.62 0 0 1-2.01 3.03v2.52h3.25c1.9-1.75 2.96-4.33 2.96-7.66Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.25-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.42 13.89a5.99 5.99 0 0 1 0-3.78v-2.6H3.06a10 10 0 0 0 0 8.98l3.36-2.6Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.8.5 3.84 1.49l2.88-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.36 2.6C7.2 7.74 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
