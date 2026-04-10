/**
 * Normalize hrefs in Ask GoTofu markdown so same-origin URLs become in-app paths.
 * Client navigation keeps the assistant panel open; external links stay absolute.
 */
export function getAssistantAppOrigin(): string | null {
  if (typeof window !== "undefined") return window.location.origin;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function normalizeAssistantHref(
  href: string
): { type: "internal" | "external" | "invalid"; value: string } {
  if (!href) return { type: "invalid", value: href };
  const trimmed = href.trim();
  if (trimmed.startsWith("#/")) {
    return { type: "internal", value: trimmed.slice(1) };
  }
  if (trimmed.startsWith("/")) {
    return { type: "internal", value: trimmed };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const appOrigin = getAssistantAppOrigin();
      if (appOrigin && u.origin === appOrigin) {
        return {
          type: "internal",
          value: `${u.pathname}${u.search}${u.hash}`,
        };
      }
      return { type: "external", value: trimmed };
    } catch {
      return { type: "invalid", value: href };
    }
  }
  return { type: "invalid", value: href };
}
