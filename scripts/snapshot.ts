// Render the scene at fixed sun positions to PNGs, for tuning colours without
// a browser. Usage: bun scripts/snapshot.ts [outDir]
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { hex, pack } from "../src/scene/color.ts";
import { Life } from "../src/scene/life.ts";
import { Pixels, rng } from "../src/scene/pixels.ts";
import { createLayout, drawScene, geometry } from "../src/scene/scene.ts";
import { skyAt } from "../src/scene/sky.ts";

const WIDTH = 384;
const HEIGHT = 216;
const ZOOM = 3;

const SHOTS: Record<string, number> = {
  "1-golden-hour": 4,
  "2-sunset": -0.5,
  "3-dusk": -4,
  "4-blue-hour": -9,
  "5-night": -20,
  "6-afternoon": 35,
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Minimal RGBA PNG encoder with nearest-neighbour upscaling and optional crop. */
function png(px: Pixels, zoom: number, crop = { x: 0, y: 0, w: px.width, h: px.height }): Uint8Array {
  const w = crop.w * zoom;
  const h = crop.h * zoom;
  const rgba = new Uint8Array(px.data.buffer);
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    for (let x = 0; x < w; x++) {
      const src = ((crop.y + Math.floor(y / zoom)) * px.width + crop.x + Math.floor(x / zoom)) * 4;
      raw.set(rgba.subarray(src, src + 4), row + 1 + x * 4);
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

const outDir = process.argv[2] ?? join(import.meta.dir, "..", "snapshots");
await mkdir(outDir, { recursive: true });
const layout = createLayout(WIDTH, HEIGHT);
for (const [name, altitude] of Object.entries(SHOTS)) {
  const px = new Pixels(WIDTH, HEIGHT);
  drawScene(px, layout, skyAt(altitude), { altitude, azimuth: 268 }, 10);
  const file = join(outDir, `${name}.png`);
  await Bun.write(file, png(px, ZOOM));
  console.log(file);
}

// Contact sheets: the yard's life simulated with a fixed seed, one frame
// every 15 seconds, stacked — for checking cat/bird behaviour at a glance.
function sheet(name: string, altitude: number, seed: number, possumSoon = false) {
  const cols = 1;
  const rows = 6;
  const crop = { x: 0, y: 124, w: WIDTH, h: HEIGHT - 124 };
  const big = new Pixels(crop.w * cols, crop.h * rows);
  const sky = skyAt(altitude);
  const life = new Life(geometry(layout), sky.light, { random: rng(seed), possumSoon });
  const px = new Pixels(WIDTH, HEIGHT);
  const dt = 1 / 30;
  let t = 0;
  for (let i = 0; i < cols * rows; i++) {
    for (let s = 0; s < 15 / dt; s++, t += dt) life.update(dt, sky.light);
    drawScene(px, layout, sky, { altitude, azimuth: 268 }, t, life);
    const ox = (i % cols) * crop.w;
    const oy = Math.floor(i / cols) * crop.h;
    for (let y = 0; y < crop.h; y++) {
      big.data.set(px.data.subarray((crop.y + y) * WIDTH + crop.x, (crop.y + y) * WIDTH + crop.x + crop.w), (oy + y) * big.width + ox);
    }
  }
  return { name, big };
}

for (const { name, big } of [sheet("8-life-day", 20, 5), sheet("9-life-night", -25, 9, true)]) {
  const file = join(outDir, `${name}.png`);
  await Bun.write(file, png(big, 3));
  console.log(file);
}

// Pose gallery: every cat pose for both cats, on plain grass, for sprite review.
{
  const poses: [string, object, number?][] = [
    ["sit", { kind: "sit", pose: "side", until: 99 }],
    ["front", { kind: "sit", pose: "front", until: 99 }],
    ["loaf", { kind: "loaf", until: 99 }],
    ["groom", { kind: "groom", until: 99 }],
    ["stare", { kind: "stare", at: () => null, until: 99, chatter: true }],
    ["walk", { kind: "walk", x: 0, y: 0, gait: "walk", then: null }],
    ["stalk", { kind: "walk", x: 0, y: 0, gait: "stalk", then: null }],
    ["leap", { kind: "leap", x0: 0, y0: 0, x1: 0, y1: 0, height: 0, dur: 1, then: () => {} }, 5],
    ["curl", { kind: "sleep", until: 99, belly: false }],
    ["belly", { kind: "sleep", until: 99, belly: true }, 0, ],
    ["roll", { kind: "roll", until: 99 }],
  ];
  const cell = 30;
  const px = new Pixels(cell * (poses.length + 1), 64);
  px.rect(0, 0, px.width, px.height, pack(hex("#5c8c3c")));
  const life = new Life(geometry(layout), 1, { random: rng(1) });
  const paint = (c: [number, number, number]) => pack(c);
  life.cats.forEach((cat, row) => {
    poses.forEach(([, activity, z], i) => {
      Object.assign(cat, { x: cell / 2 + i * cell, y: 28 + row * 32, z: z ?? 0, facing: 1, activity, clock: 6, step: 3 });
      cat.drawable(paint, 1.3)?.draw(px);
    });
  });
  // The wrestling cloud, last cell.
  const [a, b] = life.cats as [(typeof life.cats)[0], (typeof life.cats)[0]];
  Object.assign(a, { x: cell * poses.length + 12, y: 44, activity: { kind: "fight", other: b, until: 99, leader: true } });
  Object.assign(b, { x: cell * poses.length + 18, y: 44 });
  a.drawable(paint, 2.1)?.draw(px);
  const file = join(outDir, "10-cat-poses.png");
  await Bun.write(file, png(px, 5));
  console.log(file);
}

// Close-up of the yard at golden hour, for sprite work.
{
  const px = new Pixels(WIDTH, HEIGHT);
  drawScene(px, layout, skyAt(4), { altitude: 4, azimuth: 268 }, 10);
  const file = join(outDir, "7-yard-closeup.png");
  await Bun.write(file, png(px, 7, { x: 40, y: 150, w: 180, h: 66 }));
  console.log(file);
}
