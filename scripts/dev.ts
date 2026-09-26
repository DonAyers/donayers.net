// Dev server: Bun bundles src/index.html with HMR; content and fallback pages
// are rendered per request so markdown edits show up on refresh.
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import index from "../src/index.html";
import { loadContent } from "./content.ts";
import { gameData, homeFallback, renderPages } from "./pages.ts";
import { html, within } from "./static.ts";

const PUBLIC = resolve(import.meta.dir, "..", "public");

const server = Bun.serve({
  port: Number(process.env.PORT ?? 7420),
  development: { hmr: true, console: true },
  routes: {
    "/": index,
    "/content.json": async () => Response.json(gameData(await loadContent())),
    "/fallback.html": async () => html(homeFallback(await loadContent())),
  },
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);

    const asset = within(PUBLIC, path);
    if (asset && (await stat(asset).catch(() => null))?.isFile()) return new Response(Bun.file(asset));

    const pages = renderPages(await loadContent());
    const page = pages.get(`${path.replace(/^\/|\/$/g, "")}/index.html`);
    return page ? html(page) : html(pages.get("404.html")!, 404);
  },
});

console.log(`donayers.net dev → ${server.url}`);
