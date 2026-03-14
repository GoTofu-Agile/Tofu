"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/personas": "Personas",
  "/studies": "Studies",
  "/uploads": "Uploads",
  "/settings": "Settings",
  "/settings/members": "Members",
};

export function Topbar() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "GoTofu";

  return (
    <header className="flex h-14 items-center border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
