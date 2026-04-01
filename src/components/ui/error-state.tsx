import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  message,
  children,
  className,
}: {
  title?: string;
  message: string;
  /** Recovery action(s), e.g. Button */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/[0.06] px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {children ? <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
