// Serve dist/ the way GitHub Pages does: dir → index.html, trailing-slash
// redirects, and 404.html for misses.
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { html, within } from "./static.ts";

const DIST = resolve(import.meta.dir, "..", "dist");

const server = Bun.serve({
  port: Number(process.env.PORT ?? 7421),
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const target = within(DIST, decodeURIComponent(pathname));
    const info = target ? await stat(target).catch(() => null) : null;

    if (target && info?.isFile()) return new Response(Bun.file(target));
    if (target && info?.isDirectory() && (await Bun.file(join(target, "index.html")).exists())) {
      return pathname.endsWith("/")
        ? html(Bun.file(join(target, "index.html")))
        : Response.redirect(`${pathname}/`, 301);
    }
    return html(Bun.file(join(DIST, "404.html")), 404);
  },
});

console.log(`donayers.net preview (dist/) → ${server.url}`);
