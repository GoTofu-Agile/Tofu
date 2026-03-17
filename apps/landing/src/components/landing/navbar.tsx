"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { APP_URL } from "@/lib/config";
import { buttonVariants } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Roadmap", href: "#roadmap" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          GoTofu
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={`${APP_URL}/login`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </a>
          <a
            href={`${APP_URL}/signup`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Get started
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/40 bg-background px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`${APP_URL}/login`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              Sign in
            </a>
            <a
              href={`${APP_URL}/signup`}
              className={cn(buttonVariants({ size: "sm" }), "w-full")}
            >
              Get started
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
