import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm font-semibold">
            GoTofu
          </Link>
          <span className="text-sm text-muted-foreground">
            · Synthetic user research platform
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} GoTofu. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
