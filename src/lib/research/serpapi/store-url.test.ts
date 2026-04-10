import { describe, expect, it } from "vitest";
import {
  extractAppleAppStoreProductId,
  extractGooglePlayProductId,
  isAppleAppStoreUrl,
  isGooglePlayStoreUrl,
} from "./store-url";

describe("SerpAPI store URL parsing", () => {
  it("extracts Apple product id from regional app URL", () => {
    expect(
      extractAppleAppStoreProductId(
        "https://apps.apple.com/us/app/example/id534220544"
      )
    ).toBe("534220544");
  });

  it("extracts Apple product id when path ends with id", () => {
    expect(
      extractAppleAppStoreProductId("https://apps.apple.com/app/foo/id123456789")
    ).toBe("123456789");
  });

  it("returns null for non-Apple URLs", () => {
    expect(extractAppleAppStoreProductId("https://example.com/id123")).toBeNull();
  });

  it("detects Apple App Store URLs", () => {
    expect(
      isAppleAppStoreUrl("https://apps.apple.com/de/app/x/id987654321")
    ).toBe(true);
    expect(isAppleAppStoreUrl("https://play.google.com/store/apps/details?id=a")).toBe(
      false
    );
  });

  it("extracts Google Play package id", () => {
    expect(
      extractGooglePlayProductId(
        "https://play.google.com/store/apps/details?id=com.google.android.youtube&hl=en"
      )
    ).toBe("com.google.android.youtube");
  });

  it("detects Google Play URLs", () => {
    expect(
      isGooglePlayStoreUrl(
        "https://play.google.com/store/apps/details?id=com.foo.bar"
      )
    ).toBe(true);
    expect(isGooglePlayStoreUrl("https://apps.apple.com/app/x/id1")).toBe(false);
  });
});
