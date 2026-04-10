import { describe, expect, it } from "vitest";
import {
  organicFromGoogleJson,
  resultsFromGoogleNewsJson,
} from "./persona-supplement";
import { rowsFromAppleAppStoreSearchJson } from "./parse-apple-app-store-search";
import { rowsFromGoogleJobsJson } from "./parse-google-jobs";
import { rowsFromGoogleMapsJson } from "./parse-google-maps";
import { rowsFromGooglePlaySearchJson } from "./parse-google-play-search";
import { rowsFromGoogleScholarJson } from "./parse-google-scholar";
import { rowsFromYoutubeJson } from "./parse-youtube";

describe("SerpAPI JSON → snippet rows", () => {
  it("parses google organic_results", () => {
    const rows = organicFromGoogleJson({
      organic_results: [
        {
          title: "Example title",
          link: "https://example.com/page",
          snippet: "A useful snippet about user pain points.",
        },
        { title: "", link: "https://x.com", snippet: "skip" },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Example title",
      url: "https://example.com/page",
      content: "A useful snippet about user pain points.",
    });
  });

  it("parses google organic when snippet is missing (uses title)", () => {
    const rows = organicFromGoogleJson({
      organic_results: [
        { title: "Only title", link: "https://example.com/a", snippet: "" },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.content).toBe("Only title");
  });

  it("parses google_news news_results", () => {
    const rows = resultsFromGoogleNewsJson({
      news_results: [
        {
          title: "Startup raises funding",
          link: "https://news.example.com/a",
          snippet: "Brief summary.",
          iso_date: "2024-01-15T12:00:00Z",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Startup raises funding");
    expect(rows[0]!.publishedAt?.toISOString()).toBe("2024-01-15T12:00:00.000Z");
  });

  it("parses google_maps local_results", () => {
    const rows = rowsFromGoogleMapsJson({
      local_results: [
        {
          title: "Joe's Pizza",
          place_id: "ChIJabc",
          address: "123 Main St",
          rating: 4.5,
          reviews: 1200,
          description: "Classic slices.",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Joe's Pizza");
    expect(rows[0]!.url).toContain("query_place_id");
    expect(rows[0]!.dedupeKey).toBe("maps:place:ChIJabc");
  });

  it("parses youtube video_results", () => {
    const rows = rowsFromYoutubeJson({
      video_results: [
        {
          title: "How CRM works",
          link: "https://www.youtube.com/watch?v=abc123",
          video_id: "abc123",
          description: "Overview for beginners.",
          channel: { name: "SaaS Tips" },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.url).toContain("youtube.com");
    expect(rows[0]!.dedupeKey).toBe("yt:abc123");
  });

  it("parses google_jobs jobs_results", () => {
    const rows = rowsFromGoogleJobsJson({
      jobs_results: [
        {
          title: "Product Manager",
          company_name: "Acme",
          location: "Berlin",
          via: "LinkedIn",
          description: "Own the roadmap.",
          share_link: "https://www.google.com/search?q=pm",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Product Manager");
    expect(rows[0]!.content).toContain("Acme");
  });

  it("parses google_scholar organic_results", () => {
    const rows = rowsFromGoogleScholarJson({
      organic_results: [
        {
          title: "UX Research Methods",
          link: "https://scholar.example.com/1",
          snippet: "Abstract text.",
          result_id: "rid1",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.dedupeKey).toBe("scholar:rid1");
  });

  it("parses apple_app_store organic_results", () => {
    const rows = rowsFromAppleAppStoreSearchJson({
      organic_results: [
        {
          title: "Notion",
          link: "https://apps.apple.com/us/app/notion/id123",
          id: 123,
          description: "Notes and docs.",
          bundle_id: "notion.id",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.dedupeKey).toBe("apple_app:123");
  });

  it("parses google_play search organic_results with nested items", () => {
    const rows = rowsFromGooglePlaySearchJson({
      organic_results: [
        {
          items: [
            {
              title: "Coffee Recipes",
              link: "https://play.google.com/store/apps/details?id=coffee.app",
              product_id: "coffee.app",
              description: "Brew guides.",
              author: "Dev",
            },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.dedupeKey).toBe("play:coffee.app");
  });
});
