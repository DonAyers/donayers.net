// Render the scene at fixed sun positions to PNGs, for tuning colours without
// a browser. Usage: bun scripts/snapshot.ts [outDir]
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { Pixels } from "../src/scene/pixels.ts";
import { createLayout, drawScene } from "../src/scene/scene.ts";
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

// Close-up of the yard at golden hour, for sprite work.
{
  const px = new Pixels(WIDTH, HEIGHT);
  drawScene(px, layout, skyAt(4), { altitude: 4, azimuth: 268 }, 10);
  const file = join(outDir, "7-yard-closeup.png");
  await Bun.write(file, png(px, 7, { x: 40, y: 150, w: 180, h: 66 }));
  console.log(file);
}
