// Render the scene at fixed sun positions to PNGs, for tuning colours without
// a browser. Usage: bun scripts/snapshot.ts [outDir]
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { hex, pack } from "../src/scene/color.ts";
import { Life } from "../src/scene/life.ts";
import { Pixels, rng } from "../src/scene/pixels.ts";
import { createLayout, drawScene, geometry } from "../src/scene/scene.ts";
import { skyAt } from "../src/scene/sky.ts";
import { fitPixels } from "../src/scene/viewport.ts";
import { encodePng } from "./png.ts";

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

/** Crop a frame and encode it as a PNG, upscaled by `zoom`. */
function png(px: Pixels, zoom: number, crop = { x: 0, y: 0, w: px.width, h: px.height }): Uint8Array {
  const src = new Uint8Array(px.data.buffer);
  const rgba = new Uint8Array(crop.w * crop.h * 4);
  for (let y = 0; y < crop.h; y++) {
    const from = ((crop.y + y) * px.width + crop.x) * 4;
    rgba.set(src.subarray(from, from + crop.w * 4), y * crop.w * 4);
  }
  return encodePng({ width: crop.w, height: crop.h, rgba }, zoom);
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

// Portrait phone (iPhone-sized), at dusk and in the afternoon, after the yard
// has been running for a bit.
{
  const fit = fitPixels(390, 844, 3);
  const tall = createLayout(fit.width, fit.height);
  for (const [name, altitude] of [["11-portrait-dusk", -4], ["12-portrait-day", 25]] as const) {
    const sky = skyAt(altitude);
    const life = new Life(geometry(tall), sky.light, { random: rng(8) });
    for (let i = 0; i < 20 * 30; i++) life.update(1 / 30, sky.light);
    const px = new Pixels(fit.width, fit.height);
    drawScene(px, tall, sky, { altitude, azimuth: 268 }, 20, life);
    const file = join(outDir, `${name}.png`);
    await Bun.write(file, png(px, 3));
    console.log(file);
  }
}

// Downtown skyline close-up through the day: afternoon, sunset, dusk, night.
{
  const crop = { x: Math.max(0, layout.downtown - 64), y: layout.horizon - 44, w: 128, h: 42 };
  const moments = [25, 1, -5, -20];
  const big = new Pixels(crop.w, crop.h * moments.length);
  moments.forEach((altitude, i) => {
    const px = new Pixels(WIDTH, HEIGHT);
    drawScene(px, layout, skyAt(altitude), { altitude, azimuth: 268 }, 3, undefined);
    for (let y = 0; y < crop.h; y++) {
      big.data.set(px.data.subarray((crop.y + y) * WIDTH + crop.x, (crop.y + y) * WIDTH + crop.x + crop.w), (i * crop.h + y) * crop.w);
    }
  });
  const file = join(outDir, "13-downtown.png");
  await Bun.write(file, png(big, 6));
  console.log(file);
}

// Aircraft: a plane crossing at golden hour, and the LAPD helicopter's searchlight at night.
for (const [name, altitude, options] of [
  ["14-plane", 4, { planeSoon: true }],
  ["15-helicopter-night", -25, { helicopterSoon: true }],
  ["16-helicopter-day", 20, { helicopterSoon: true }],
] as const) {
  const sky = skyAt(altitude);
  const life = new Life(geometry(layout), sky.light, { random: rng(3), ...options });
  let t = 0;
  for (; t < 120; t += 1 / 30) {
    life.update(1 / 30, sky.light);
    const plane = life.plane;
    if (plane && Math.abs(plane.x - WIDTH * 0.6) < 2) break;
    if (life.helicopter?.hovering && t > 20) break;
  }
  const px = new Pixels(WIDTH, HEIGHT);
  drawScene(px, layout, sky, { altitude, azimuth: 268 }, t, life);
  const file = join(outDir, `${name}.png`);
  await Bun.write(file, png(px, ZOOM));
  console.log(file);
}

// The calico's butterfly chase: frames every 0.4s once it starts, zoomed in around her.
{
  const sky = skyAt(20);
  const life = new Life(geometry(layout), sky.light, { random: rng(23) });
  const frames: Pixels[] = [];
  const crop = { w: 150, h: 70 };
  let t = 0;
  let next = 0;
  while (frames.length < 10 && t < 600) {
    life.update(1 / 30, sky.light);
    t += 1 / 30;
    const calico = life.cats[0]!;
    if (!calico.chasing || t < next) continue;
    next = t + 0.4;
    const px = new Pixels(WIDTH, HEIGHT);
    drawScene(px, layout, sky, { altitude: 20, azimuth: 268 }, t, life);
    const x0 = Math.max(0, Math.min(WIDTH - crop.w, Math.round(calico.x) - crop.w / 2));
    const y0 = Math.max(0, Math.min(HEIGHT - crop.h, Math.round(calico.y) - 50));
    const frame = new Pixels(crop.w, crop.h);
    for (let y = 0; y < crop.h; y++) frame.data.set(px.data.subarray((y0 + y) * WIDTH + x0, (y0 + y) * WIDTH + x0 + crop.w), y * crop.w);
    frames.push(frame);
  }
  const sheet = new Pixels(crop.w * 2, crop.h * Math.ceil(frames.length / 2));
  frames.forEach((f, i) => {
    for (let y = 0; y < crop.h; y++) {
      sheet.data.set(f.data.subarray(y * crop.w, (y + 1) * crop.w), (Math.floor(i / 2) * crop.h + y) * sheet.width + (i % 2) * crop.w);
    }
  });
  const file = join(outDir, "17-butterfly-chase.png");
  await Bun.write(file, png(sheet, 4));
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
