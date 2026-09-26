import { describe, expect, test } from "bun:test";
import { loadContent, parseMarkdown, sortEntries, toEntry, type Entry } from "./content.ts";

describe("parseMarkdown", () => {
  test("splits YAML frontmatter from the body", () => {
    const { data, body } = parseMarkdown('---\ntitle: "Hi"\ntags:\n  - a\n---\n\n## Body');
    expect(data).toEqual({ title: "Hi", tags: ["a"] });
    expect(body.trim()).toBe("## Body");
  });

  test("handles CRLF line endings and missing frontmatter", () => {
    expect(parseMarkdown('---\r\ntitle: "Hi"\r\n---\r\nText').data).toEqual({ title: "Hi" });
    expect(parseMarkdown("Just text")).toEqual({ data: {}, body: "Just text" });
  });
});

describe("toEntry", () => {
  test("normalizes music frontmatter", () => {
    const entry = toEntry(
      "music",
      "band",
      `---
title: "Band"
genre: [Soul, Pop]
releaseDate: 2017-02-24T00:00:00.000Z
featured: true
links:
  - platform: "Bandcamp"
    url: "https://band.bandcamp.com"
  - platform: "Broken"
---
Played drums.`,
    );
    expect(entry).toMatchObject({
      kind: "music",
      slug: "band",
      title: "Band",
      tags: ["Soul", "Pop"],
      date: "2017-02-24",
      featured: true,
      links: [{ label: "Bandcamp", url: "https://band.bandcamp.com" }],
    });
    expect(entry.html).toContain("<p>Played drums.</p>");
  });

  test("builds dev links from liveUrl and githubUrl", () => {
    const entry = toEntry("dev", "x", '---\ntitle: X\ngithubUrl: "https://github.com/x"\nliveUrl: "https://x.dev"\norder: 2\n---\n');
    expect(entry.links).toEqual([
      { label: "Live", url: "https://x.dev" },
      { label: "GitHub", url: "https://github.com/x" },
    ]);
    expect(entry.order).toBe(2);
  });
});

test("sortEntries puts featured first, then order, then newest", () => {
  const e = (slug: string, featured: boolean, order: number, date: string) =>
    ({ slug, featured, order, date }) as Entry;
  const sorted = sortEntries([e("a", false, 1, "2020"), e("b", true, 5, "2019"), e("c", true, 5, "2024"), e("d", true, 1, "2000")]);
  expect(sorted.map((x) => x.slug)).toEqual(["d", "c", "b", "a"]);
});

test("real content loads cleanly", async () => {
  const content = await loadContent();
  expect(content.home.html.length).toBeGreaterThan(0);
  expect(content.about.html.length).toBeGreaterThan(0);
  expect(content.entries.filter((e) => e.kind === "dev").length).toBeGreaterThan(0);
  expect(content.entries.filter((e) => e.kind === "music").length).toBeGreaterThan(0);
  for (const entry of content.entries) {
    expect(entry.title).not.toBe("");
    expect(entry.description).not.toBe("");
    expect(entry.html).not.toBe("");
  }
});
