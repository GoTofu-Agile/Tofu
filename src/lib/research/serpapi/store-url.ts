export type StoreLocale = {
  country?: string;
  language?: string;
};

/**
 * Extract Apple App Store numeric product id from common URL shapes, e.g.
 * https://apps.apple.com/us/app/name/id534220544
 */
export function extractAppleAppStoreProductId(appUrl: string): string | null {
  try {
    const u = new URL(appUrl);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.includes("apple.com") && !host.includes("itunes.apple.com")) {
      return null;
    }
    const match = u.pathname.match(/\/id(\d{5,})(?:\/?|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** True if URL targets the iOS/macOS App Store product page. */
export function isAppleAppStoreUrl(appUrl: string): boolean {
  return extractAppleAppStoreProductId(appUrl) !== null;
}

/**
 * Extract Google Play app id (package name) from details URL.
 * e.g. https://play.google.com/store/apps/details?id=com.foo.bar
 */
export function extractGooglePlayProductId(appUrl: string): string | null {
  try {
    const u = new URL(appUrl);
    if (!u.hostname.replace(/^www\./, "").includes("play.google.com")) {
      return null;
    }
    const id = u.searchParams.get("id");
    if (!id || !/^[\w.]+$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export function isGooglePlayStoreUrl(appUrl: string): boolean {
  return extractGooglePlayProductId(appUrl) !== null;
}

/** Best-effort locale extraction from store URLs (no IP guessing). */
export function extractStoreLocaleFromUrl(appUrl: string): StoreLocale {
  try {
    const u = new URL(appUrl);

    // Apple App Store URLs commonly embed storefront in path: /us/app/... or /de/app/...
    if (isAppleAppStoreUrl(appUrl)) {
      const parts = u.pathname.split("/").filter(Boolean);
      const storefront = (parts[0] ?? "").toLowerCase();
      if (/^[a-z]{2}$/.test(storefront)) {
        return { country: storefront };
      }
      return {};
    }

    // Google Play can include explicit locale params.
    if (isGooglePlayStoreUrl(appUrl)) {
      const gl = (u.searchParams.get("gl") ?? "").trim().toLowerCase();
      const hl = (u.searchParams.get("hl") ?? "").trim().toLowerCase();
      const out: StoreLocale = {};
      if (/^[a-z]{2}$/.test(gl)) out.country = gl;
      // allow `de` or regional forms like `en-US`
      if (/^[a-z]{2}(-[a-z]{2})?$/i.test(hl)) out.language = hl;
      return out;
    }
  } catch {
    // ignore parse failures
  }
  return {};
}
