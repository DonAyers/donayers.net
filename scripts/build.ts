// Static build for GitHub Pages: bundle the game, copy public/, write
// content.json, bake the home fallback into index.html, render fallback pages.
import { cp, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { loadContent } from "./content.ts";
import { gameData, homeFallback, renderPages } from "./pages.ts";

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");

await rm(DIST, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [join(ROOT, "src/index.html")],
  outdir: DIST,
  target: "browser",
  splitting: true,
  minify: true,
  sourcemap: "linked",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp(join(ROOT, "public"), DIST, { recursive: true });

const content = await loadContent();
await Bun.write(join(DIST, "content.json"), JSON.stringify(gameData(content)));

const indexPath = join(DIST, "index.html");
const fallback = homeFallback(content);
const baked = await new HTMLRewriter()
  .on("#fallback", { element: (el) => void el.setInnerContent(fallback, { html: true }) })
  .transform(new Response(Bun.file(indexPath)))
  .text();
if (!baked.includes('class="cards"')) throw new Error("Failed to inject the home fallback into index.html");
await Bun.write(indexPath, baked);

const pages = renderPages(content);
for (const [path, page] of pages) await Bun.write(join(DIST, path), page);

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1).padStart(8)} KB`;
let total = 0;
console.log("     raw        gzip   file");
for (const output of result.outputs.filter((o) => o.kind !== "sourcemap")) {
  const gzip = Bun.gzipSync(new Uint8Array(await Bun.file(output.path).arrayBuffer())).length;
  total += gzip;
  console.log(`${kb(output.size)} ${kb(gzip)}   ${relative(DIST, output.path)}`);
}
console.log(`${"".padStart(11)} ${kb(total)}   total (gzip)`);
console.log(`Built ${pages.size} fallback pages + content.json → dist/`);
