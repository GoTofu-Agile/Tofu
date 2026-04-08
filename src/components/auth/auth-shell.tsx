import type { ReactNode } from "react";

/**
 * Shared auth layout: clear value prop + form. Keeps login/signup visually aligned.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-8">
      <header className="text-center sm:text-left">
        <p className="text-sm font-semibold tracking-tight text-foreground">GoTofu</p>
        <h1 className="mt-2 text-balance text-lg font-medium leading-snug text-foreground sm:text-xl">
          Synthetic user research—interviews and insights without recruiting.
        </h1>
        <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:mx-0 mx-auto">
          Build AI personas, run studies, and ship decisions faster. No credit card required to explore.
        </p>
      </header>
      {children}
    </div>
  );
}
