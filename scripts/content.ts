// Reads content/*.md into plain data. The game fetches this as JSON; the
// build also renders it into static fallback pages.
import { Glob } from "bun";
import { join } from "node:path";

export type Kind = "dev" | "music";

export interface Link {
  label: string;
  url: string;
}

export interface Entry {
  kind: Kind;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  /** ISO date (YYYY-MM-DD) — release date for music, start date for dev. */
  date: string | null;
  status: string | null;
  featured: boolean;
  order: number;
  links: Link[];
  html: string;
}

export interface Page {
  title: string;
  html: string;
}

export interface SiteContent {
  home: Page;
  about: Page;
  entries: Entry[];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseMarkdown(source: string): { data: Record<string, unknown>; body: string } {
  const match = source.match(FRONTMATTER);
  if (!match) return { data: {}, body: source };
  const data = (Bun.YAML.parse(match[1] ?? "") ?? {}) as Record<string, unknown>;
  return { data, body: source.slice(match[0].length) };
}

function toDate(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function links(kind: Kind, data: Record<string, unknown>): Link[] {
  if (kind === "music") {
    const raw = Array.isArray(data.links) ? data.links : [];
    return raw.flatMap((link: Record<string, unknown>) => {
      const url = str(link?.url);
      return url ? [{ label: str(link.platform) ?? "Listen", url }] : [];
    });
  }
  const out: Link[] = [];
  const live = str(data.liveUrl);
  const github = str(data.githubUrl);
  if (live) out.push({ label: "Live", url: live });
  if (github) out.push({ label: "GitHub", url: github });
  return out;
}

export function toEntry(kind: Kind, slug: string, source: string): Entry {
  const { data, body } = parseMarkdown(source);
  return {
    kind,
    slug,
    title: str(data.title) ?? slug,
    description: str(data.description) ?? "",
    tags: strings(kind === "music" ? data.genre : data.tech),
    date: toDate(kind === "music" ? data.releaseDate : data.startDate),
    status: str(data.status),
    featured: data.featured === true,
    order: typeof data.order === "number" ? data.order : Number.MAX_SAFE_INTEGER,
    links: links(kind, data),
    html: Bun.markdown.html(body),
  };
}

async function readPage(root: string, name: string): Promise<Page> {
  const { data, body } = parseMarkdown(await Bun.file(join(root, `${name}.md`)).text());
  return { title: str(data.seoTitle) ?? str(data.title) ?? name, html: Bun.markdown.html(body) };
}

async function readKind(root: string, kind: Kind): Promise<Entry[]> {
  const entries: Entry[] = [];
  for await (const file of new Glob("*.md").scan(join(root, kind))) {
    const source = await Bun.file(join(root, kind, file)).text();
    entries.push(toEntry(kind, file.replace(/\.md$/, ""), source));
  }
  return entries;
}

/** Featured first, then explicit order, then newest. */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.order - b.order ||
      (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

export async function loadContent(root = join(import.meta.dir, "..", "content")): Promise<SiteContent> {
  const [home, about, dev, music] = await Promise.all([
    readPage(root, "home"),
    readPage(root, "about"),
    readKind(root, "dev"),
    readKind(root, "music"),
  ]);
  return { home, about, entries: [...sortEntries(dev), ...sortEntries(music)] };
}
