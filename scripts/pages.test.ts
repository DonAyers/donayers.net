import { expect, test } from "bun:test";
import { loadContent } from "./content.ts";
import { escape, gameData, homeFallback, renderPages } from "./pages.ts";

test("escape covers HTML-significant characters", () => {
  expect(escape(`<a href="x">R&B</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;R&amp;B&lt;/a&gt;");
});

test("renders a page for every old URL", async () => {
  const content = await loadContent();
  const pages = renderPages(content);
  const expected = [
    "about/index.html",
    "dev/index.html",
    "music/index.html",
    "404.html",
    ...content.entries.map((e) => `${e.kind}/${e.slug}/index.html`),
  ];
  expect([...pages.keys()].sort()).toEqual(expected.sort());
  for (const page of pages.values()) {
    expect(page).toStartWith("<!doctype html>");
    expect(page).toContain('<link rel="stylesheet" href="/site.css">');
  }
});

test("entry pages link into the game and the game links back out", async () => {
  const content = await loadContent();
  const riff = content.entries.find((e) => e.slug === "riff")!;
  expect(renderPages(content).get("dev/riff/index.html")).toContain('href="/#dev/riff"');
  const data = gameData(content);
  expect(data.entries.find((e) => e.slug === "riff")?.article).toContain('href="/dev/riff/"');
  expect(homeFallback(content)).toContain(`href="/dev/riff/"`);
  expect(riff.title).toBe("Riff");
});
