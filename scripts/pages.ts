// Static HTML fallback: every piece of content gets a real page at its old
// URL, for crawlers, reduced-motion visitors and browsers without WebGL.
import type { Entry, Kind, SiteContent } from "./content";

export const SITE = {
  title: "Don Ayers",
  description: "Frontend developer and musician in Los Angeles. Walk around the portfolio, or read it plain.",
  url: "https://donayers.net",
  github: "https://github.com/DonAyers",
};

const SECTIONS: Record<Kind, { title: string; blurb: string }> = {
  dev: { title: "Dev", blurb: "Things I've built, at work and for fun." },
  music: { title: "Music", blurb: "Bands I've drummed in, mostly in Seattle." },
};

export function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(opts: { title: string; description: string; path: string; body: string }): string {
  const title = opts.title === SITE.title ? SITE.title : `${opts.title} · ${SITE.title}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(opts.description)}">
<link rel="canonical" href="${SITE.url}${opts.path}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/site.css">
</head>
<body class="plain">
<header class="site-header">
<a class="wordmark" href="/?plain">${SITE.title}</a>
${nav()}
</header>
<main class="plain-main">
${opts.body}
</main>
<footer class="site-footer"><a href="${SITE.github}">GitHub</a></footer>
</body>
</html>
`;
}

export function nav(): string {
  return `<nav class="site-nav">
<a href="/dev/">Dev</a>
<a href="/music/">Music</a>
<a href="/about/">About</a>
<a class="play-link" href="/">Play ▶</a>
</nav>`;
}

function meta(entry: Entry): string {
  const bits = [entry.date?.slice(0, 4), entry.status].filter(Boolean) as string[];
  return bits.length ? `<p class="meta">${bits.map(escape).join(" · ")}</p>` : "";
}

function tags(entry: Entry): string {
  if (!entry.tags.length) return "";
  return `<ul class="tags">${entry.tags.map((t) => `<li>${escape(t)}</li>`).join("")}</ul>`;
}

function links(entry: Entry): string {
  if (!entry.links.length) return "";
  return `<p class="links">${entry.links
    .map((l) => `<a href="${escape(l.url)}" rel="noopener">${escape(l.label)} ↗</a>`)
    .join("")}</p>`;
}

/** Title, meta, tags, links and body — shared by the fallback pages and the in-game panel. */
export function entryArticle(entry: Entry): string {
  return `<article class="entry">
<p class="eyebrow ${entry.kind}">${SECTIONS[entry.kind].title}</p>
<h1>${escape(entry.title)}</h1>
${meta(entry)}
<p class="lede">${escape(entry.description)}</p>
${tags(entry)}
${links(entry)}
<div class="prose">${entry.html}</div>
</article>`;
}

function entryCard(entry: Entry): string {
  return `<li class="card"><a href="/${entry.kind}/${entry.slug}/">
<h2>${escape(entry.title)}</h2>
${meta(entry)}
<p>${escape(entry.description)}</p>
</a></li>`;
}

/** The home fallback, injected into the game's index.html at build time. */
export function homeFallback(content: SiteContent): string {
  const section = (kind: Kind) =>
    `<section><h2 class="eyebrow ${kind}">${SECTIONS[kind].title}</h2><ul class="cards">${content.entries
      .filter((e) => e.kind === kind)
      .map(entryCard)
      .join("")}</ul></section>`;
  return `<header class="site-header"><span class="wordmark">${SITE.title}</span>${nav()}</header>
<div class="plain-main">
<div class="prose intro">${content.home.html}</div>
${section("dev")}
${section("music")}
</div>`;
}

export interface GameEntry {
  kind: Kind;
  slug: string;
  title: string;
  /** Pre-rendered article HTML for the in-game panel. */
  article: string;
}

export interface GameData {
  about: string;
  entries: GameEntry[];
}

/** What the game fetches as /content.json — pre-rendered so the client stays tiny. */
export function gameData(content: SiteContent): GameData {
  return {
    about: `<article class="entry"><p class="eyebrow">About</p><h1>${SITE.title}</h1><div class="prose">${content.about.html}</div></article>`,
    entries: content.entries.map((e) => ({
      kind: e.kind,
      slug: e.slug,
      title: e.title,
      article: `${entryArticle(e)}<p class="play-cta"><a href="/${e.kind}/${e.slug}/">Open as a page ↗</a></p>`,
    })),
  };
}

/** Map of output path (relative to dist) to HTML. */
export function renderPages(content: SiteContent): Map<string, string> {
  const pages = new Map<string, string>();

  pages.set(
    "about/index.html",
    layout({
      title: content.about.title,
      description: SITE.description,
      path: "/about/",
      body: `<article class="entry"><h1>${escape(content.about.title)}</h1><div class="prose">${content.about.html}</div></article>`,
    }),
  );

  for (const kind of Object.keys(SECTIONS) as Kind[]) {
    const entries = content.entries.filter((e) => e.kind === kind);
    pages.set(
      `${kind}/index.html`,
      layout({
        title: SECTIONS[kind].title,
        description: SECTIONS[kind].blurb,
        path: `/${kind}/`,
        body: `<h1>${SECTIONS[kind].title}</h1><p class="lede">${SECTIONS[kind].blurb}</p><ul class="cards">${entries
          .map(entryCard)
          .join("")}</ul>`,
      }),
    );
    for (const entry of entries) {
      pages.set(
        `${kind}/${entry.slug}/index.html`,
        layout({
          title: entry.title,
          description: entry.description,
          path: `/${kind}/${entry.slug}/`,
          body: `${entryArticle(entry)}<p class="play-cta"><a href="/#${kind}/${entry.slug}">Find it in the world ▶</a></p>`,
        }),
      );
    }
  }

  pages.set(
    "404.html",
    layout({
      title: "Lost",
      description: "Page not found.",
      path: "/404.html",
      body: `<h1>Nothing here</h1><p class="lede">That page doesn't exist, or it was part of the old blog, which has been retired.</p><p><a href="/">Back to the world ▶</a></p>`,
    }),
  );

  return pages;
}
