// Edit scene elements in Aseprite and have them land straight in the game.
//
//   bun run art                 list editable elements (and which have custom art)
//   bun run art edit <id>       open it in Aseprite; every save updates the game
//   bun run art sync            re-import everything in art/
//   bun run art reset <id>      drop custom art, back to the code-drawn version
//
// Sources live in art/<id>.aseprite (layers kept) with an exported art/<id>.png;
// the game reads generated src/art/<id>.ts. Art is drawn with its bottom-centre
// pixel on the element's spot, so resize the canvas anchored bottom-centre.
// Set ASEPRITE=/path/to/aseprite in .env if it isn't found automatically.
import { existsSync, watch } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { artModule, cropToAnchor, indexModule, toArtData } from "./artlib.ts";
import { ELEMENTS } from "./elements.ts";
import { decodePng, encodePng } from "./png.ts";

const ROOT = resolve(import.meta.dir, "..");
const ART_DIR = join(ROOT, "art");
const OUT_DIR = join(ROOT, "src", "art");

// ---- Aseprite ------------------------------------------------------------------

function findAseprite(): string | null {
  const env = process.env.ASEPRITE;
  if (env) return existsSync(env) ? env : (console.error(`ASEPRITE is set to ${env}, but that file doesn't exist.`), null);
  const home = homedir();
  const candidates = [
    Bun.which("aseprite"),
    "C:\\Program Files\\Aseprite\\Aseprite.exe",
    "C:\\Program Files (x86)\\Aseprite\\Aseprite.exe",
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe",
    "C:\\Program Files\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe",
    join(home, "AppData", "Local", "Programs", "Aseprite", "Aseprite.exe"),
    "/Applications/Aseprite.app/Contents/MacOS/aseprite",
    join(home, "Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite"),
    "/usr/bin/aseprite",
    "/usr/local/bin/aseprite",
    join(home, ".steam/steam/steamapps/common/Aseprite/aseprite"),
  ];
  return candidates.find((p): p is string => !!p && existsSync(p)) ?? null;
}

async function aseprite(exe: string, ...args: string[]) {
  const proc = Bun.spawn([exe, "-b", ...args], { stdout: "pipe", stderr: "pipe" });
  if ((await proc.exited) !== 0) throw new Error(`Aseprite failed: ${await new Response(proc.stderr).text()}`);
}

// ---- Import --------------------------------------------------------------------

const paths = (id: string) => ({
  png: join(ART_DIR, `${id}.png`),
  ase: join(ART_DIR, `${id}.aseprite`),
  module: join(OUT_DIR, `${id}.ts`),
});

async function writeIndex() {
  const ids = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".ts") && f !== "index.ts").map((f) => basename(f, ".ts"));
  await Bun.write(join(OUT_DIR, "index.ts"), indexModule(ids));
}

/** art/<id>.png → src/art/<id>.ts (+ index). */
async function importPng(id: string) {
  const image = decodePng(new Uint8Array(await Bun.file(paths(id).png).arrayBuffer()));
  const data = toArtData(image);
  await Bun.write(paths(id).module, artModule(id, data));
  await writeIndex();
  console.log(`✓ ${id} → game (${data.w}×${data.h}, ${Object.keys(data.palette).length} colours)`);
}

/** If the .aseprite is newer than the .png, export it first. */
async function exportIfNeeded(exe: string | null, id: string) {
  const { png, ase } = paths(id);
  if (!existsSync(ase)) return;
  const newer = !existsSync(png) || (await stat(ase)).mtimeMs > (await stat(png)).mtimeMs;
  if (!newer) return;
  if (!exe) throw new Error(`art/${id}.aseprite changed but Aseprite wasn't found to export it`);
  await aseprite(exe, ase, "--save-as", png);
}

// ---- Commands ------------------------------------------------------------------

async function list() {
  const custom = new Set(existsSync(OUT_DIR) ? (await readdir(OUT_DIR)).map((f) => basename(f, ".ts")) : []);
  console.log("Editable elements (bun run art edit <id>):\n");
  for (const [id, { about }] of Object.entries(ELEMENTS)) {
    console.log(`  ${custom.has(id) ? "●" : "○"} ${id.padEnd(12)} ${about}`);
  }
  console.log("\n● has custom art   ○ drawn by code");
  const exe = findAseprite();
  console.log(exe ? `\nAseprite: ${exe}` : "\nAseprite not found. Set ASEPRITE=/path/to/aseprite in .env");
}

async function edit(id: string) {
  const element = ELEMENTS[id];
  if (!element) throw new Error(`Unknown element "${id}". Run \`bun run art\` to see the list.`);
  const exe = findAseprite();
  if (!exe) throw new Error("Aseprite not found. Add ASEPRITE=/path/to/Aseprite.exe to .env and try again.");
  await mkdir(ART_DIR, { recursive: true });
  const { png, ase } = paths(id);

  // First edit: start from what's in the game now.
  if (!existsSync(png) && !existsSync(ase)) {
    const baked = element.bake();
    await Bun.write(png, encodePng(cropToAnchor(baked.px, baked.cx, baked.bottom)));
    console.log(`Baked the current ${id} to art/${id}.png`);
  }
  if (!existsSync(ase)) await aseprite(exe, png, "--save-as", ase);

  console.log(`Opening art/${id}.aseprite. Every save goes straight into the game (keep \`bun run dev\` running to see it).`);
  console.log("Keep the bottom-centre anchor if you resize the canvas.");

  let busy = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const sync = async () => {
    if (busy) return;
    busy = true;
    try {
      await aseprite(exe, ase, "--save-as", png);
      await importPng(id);
    } catch (error) {
      console.error(`✗ ${(error as Error).message}`);
    } finally {
      busy = false;
    }
  };
  const watcher = watch(ART_DIR, (_event, file) => {
    if (file !== `${id}.aseprite`) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(sync, 300); // Aseprite writes in bursts
  });

  const started = Date.now();
  const app = Bun.spawn([exe, ase], { stdout: "ignore", stderr: "ignore" });
  await app.exited;
  if (Date.now() - started < 5000) {
    // Handed off to an Aseprite window that was already open: keep watching.
    console.log("Aseprite was already open, so the file went to that window. Watching for saves; press Ctrl+C when you're done.");
    await new Promise(() => {});
  }
  watcher.close();
  await sync();
  console.log(`Done with ${id}.`);
}

async function syncAll() {
  const exe = findAseprite();
  if (!existsSync(ART_DIR)) return console.log("No art/ folder yet.");
  const ids = new Set((await readdir(ART_DIR)).filter((f) => /\.(png|aseprite)$/.test(f)).map((f) => f.replace(/\.(png|aseprite)$/, "")));
  for (const id of ids) {
    await exportIfNeeded(exe, id);
    await importPng(id);
  }
}

async function reset(id: string) {
  const { png, ase, module } = paths(id);
  for (const file of [png, ase, module]) if (existsSync(file)) await rm(file);
  await writeIndex();
  console.log(`✓ ${id} is drawn by code again.`);
}

const [command, id] = process.argv.slice(2);
try {
  if (!command || command === "list") await list();
  else if (command === "edit" && id) await edit(id);
  else if (command === "sync") await syncAll();
  else if (command === "reset" && id) await reset(id);
  else console.log("Usage: bun run art [list | edit <id> | sync | reset <id>]");
} catch (error) {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
}
