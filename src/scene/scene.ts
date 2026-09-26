// The LA scene, back to front: sky, stars, sun, clouds, mountains, palms,
// power lines, the brick wall, and the yard in front of it. Everything is in
// low-res "virtual" pixels.
import { type Lab, type RGB, fromLab, hex, mixLab, multiply, packLab, toLab } from "./color.ts";
import { BAYER, type Pixels, rng } from "./pixels.ts";
import { type SkyState, gradientAt } from "./sky.ts";
import type { SunPosition } from "./sun.ts";
import { type Yard, createYard, drawYard } from "./yard.ts";

const BANDS = 30;
const GLOW_LEVELS = 6;
const WHITE = toLab([1, 1, 1]);

interface Palm {
  x: number;
  height: number;
  lean: number;
  phase: number;
  near: boolean;
  crown: number;
  trunkWidth: number;
}

interface Cloud {
  x: number;
  y: number;
  length: number;
  thickness: number;
  speed: number;
}

interface Star {
  x: number;
  y: number;
  brightness: number;
  phase: number;
}

interface Bird {
  span: number;
  u: number;
  wire: number;
}

export interface Layout {
  width: number;
  height: number;
  horizon: number;
  wallTop: number;
  mountains: Float32Array;
  palms: Palm[];
  clouds: Cloud[];
  stars: Star[];
  poles: { spacing: number; offset: number; top: number };
  birds: Bird[];
  yard: Yard;
}

export function createLayout(width: number, height: number): Layout {
  const random = rng(1987);
  const yardHeight = Math.min(90, Math.max(44, Math.round(height * 0.28)));
  const wallHeight = Math.min(30, Math.max(14, Math.round(height * 0.11)));
  const yardTop = height - yardHeight;
  const wallTop = yardTop - wallHeight;
  const horizon = wallTop + 2;

  const mountains = new Float32Array(width);
  const peak = height * 0.07;
  for (let x = 0; x < width; x++) {
    mountains[x] = peak * (0.55 + 0.25 * Math.sin(x * 0.021 + 1.3) + 0.15 * Math.sin(x * 0.063 + 0.4) + 0.05 * Math.sin(x * 0.17));
  }

  const palmCount = Math.max(4, Math.round(width / 55));
  const palms: Palm[] = [];
  for (let i = 0; i < palmCount; i++) {
    const near = random() > 0.45;
    const tall = horizon * (near ? 0.62 + random() * 0.28 : 0.38 + random() * 0.16);
    palms.push({
      x: ((i + 0.2 + random() * 0.6) / palmCount) * width,
      height: Math.round(tall),
      lean: (random() - 0.5) * tall * 0.1,
      phase: random() * Math.PI * 2,
      near,
      crown: Math.max(near ? 7 : 5, Math.round(tall * (near ? 0.1 : 0.085))),
      trunkWidth: near ? 2 : 1,
    });
  }
  palms.sort((a, b) => Number(a.near) - Number(b.near));

  const clouds: Cloud[] = Array.from({ length: Math.round(width / 90) + 2 }, () => ({
    x: random() * width,
    y: Math.round(horizon * (0.06 + random() * 0.42)),
    length: Math.round(30 + random() * 50),
    thickness: 3 + Math.floor(random() * 3),
    speed: 0.3 + random() * 0.9,
  }));

  const stars: Star[] = Array.from({ length: Math.round((width * horizon) / 320) }, () => ({
    x: Math.floor(random() * width),
    y: Math.floor(random() * horizon * 0.75),
    brightness: 0.3 + random() * 0.7,
    phase: random() * Math.PI * 2,
  }));

  const spacing = Math.max(70, Math.round(width * 0.32));
  const poles = { spacing, offset: Math.round(spacing * 0.3), top: Math.round(horizon * 0.45) };
  const spans = Math.max(1, Math.floor((width - poles.offset) / spacing));
  const birds: Bird[] = Array.from({ length: 4 }, () => ({
    span: Math.floor(random() * spans),
    u: 0.2 + random() * 0.6,
    wire: Math.floor(random() * 2),
  }));

  const yard = createYard(width, yardTop, height);
  return { width, height, horizon, wallTop, mountains, palms, clouds, stars, poles, birds, yard };
}

/** Gusty wind strength, 0..1. */
export const windAt = (t: number) => 0.55 + 0.45 * Math.sin(t * 0.21) * Math.sin(t * 0.13 + 1.7);

// Daylight colours of things; the sky state decides how lit or silhouetted they look.
const BASE = {
  trunk: hex("#7a5f48"),
  trunkDark: hex("#5e4938"),
  frond: hex("#4a7a3e"),
  skirt: hex("#8a6e48"),
  wood: hex("#5a4636"),
  insulator: hex("#9fb4ba"),
  transformer: hex("#6b7278"),
  wire: hex("#26222a"),
  mortar: hex("#7a6a5e"),
  cap: hex("#b8a48a"),
  capShadow: hex("#6a5a4e"),
  bricks: ["#9a4b3c", "#a8543f", "#8c4436", "#b3603f"].map(hex),
};

/** A daylight colour as it looks under this sky, in OKLab. */
function litLab(sky: SkyState, base: RGB, light: number, haze = 0): Lab {
  const color = mixLab(sky.silhouette, toLab(multiply(base, fromLab(sky.tint))), light);
  return haze ? mixLab(color, sky.haze, haze) : color;
}

function lighting(sky: SkyState) {
  return (base: RGB, light: number, haze = 0): number => packLab(litLab(sky, base, light, haze));
}

function drawSky(px: Pixels, layout: Layout, sky: SkyState, sunX: number, sunY: number) {
  const { width, height, horizon } = layout;
  const table = new Uint32Array(BANDS * (GLOW_LEVELS + 1));
  for (let b = 0; b < BANDS; b++) {
    const base = gradientAt(sky.sky, (b + 0.5) / BANDS);
    for (let k = 0; k <= GLOW_LEVELS; k++) {
      table[b * (GLOW_LEVELS + 1) + k] = packLab(mixLab(base, sky.sun, (k / GLOW_LEVELS) * 0.8));
    }
  }

  const columns = new Float32Array(width);
  const rx = width * 0.5;
  for (let x = 0; x < width; x++) columns[x] = Math.exp(-(((x - sunX) / rx) ** 2));
  const glowY = Math.min(sunY, horizon);
  const ry = horizon * 0.6;

  for (let y = 0; y < height; y++) {
    const t = Math.min(1, y / horizon);
    const rowGlow = sky.glow * Math.exp(-(((y - glowY) / ry) ** 2));
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const d = BAYER[((y & 3) << 2) | (x & 3)]!;
      const band = Math.min(BANDS - 1, Math.max(0, Math.floor(t * BANDS + d - 0.5)));
      const level = Math.min(GLOW_LEVELS, Math.floor(rowGlow * columns[x]! * GLOW_LEVELS + d));
      px.data[row + x] = table[band * (GLOW_LEVELS + 1) + level]!;
    }
  }
}

function drawStars(px: Pixels, layout: Layout, sky: SkyState, t: number) {
  if (sky.stars <= 0.02) return;
  for (const star of layout.stars) {
    const a = sky.stars * star.brightness * (0.7 + 0.3 * Math.sin(t * 2.2 + star.phase));
    if (a < 0.2) continue;
    const behind = gradientAt(sky.sky, star.y / layout.horizon);
    px.set(star.x, star.y, packLab(mixLab(behind, WHITE, Math.min(1, a))));
  }
}

function drawClouds(px: Pixels, layout: Layout, sky: SkyState, t: number) {
  const lit = packLab(sky.cloudLit);
  const shade = packLab(sky.cloudShade);
  for (const c of layout.clouds) {
    const span = layout.width + c.length * 2;
    const x = ((((c.x + t * c.speed) % span) + span) % span) - c.length;
    // Two smaller lobes peeking over a long base streak (base drawn last so
    // only the lobes' shaded tops show).
    lozenge(px, x + c.length * 0.18, c.y - 2, c.length * 0.45, c.thickness, lit, shade);
    lozenge(px, x + c.length * 0.5, c.y - 1, c.length * 0.3, c.thickness, lit, shade);
    lozenge(px, x, c.y, c.length, c.thickness, lit, shade);
  }
}

/** Rounded horizontal blob; lit from below, so the lower half takes the warm colour. */
function lozenge(px: Pixels, x: number, y: number, length: number, thickness: number, lit: number, shade: number) {
  for (let r = 0; r < thickness; r++) {
    const inset = Math.abs(r - (thickness - 1) / 2) * 3;
    px.rect(Math.round(x + inset), y + r, Math.round(length - inset * 2), 1, r >= thickness / 2 ? lit : shade);
  }
}

function drawPalm(px: Pixels, p: Palm, horizon: number, t: number, wind: number, c: Record<"trunk" | "trunkDark" | "frond" | "skirt", number>) {
  const sway = Math.sin(t * 0.9 + p.phase) * wind * (p.near ? 2.2 : 1.4) + Math.sin(t * 2.3 + p.phase * 2) * wind * 0.4;
  const topY = horizon - p.height;
  let topX = p.x;
  for (let y = horizon; y >= topY; y--) {
    const u = (horizon - y) / p.height;
    const x = p.x + p.lean * u * u + sway * u * u * u;
    // Flared base, and near palms carry a thicker lower trunk.
    const w = p.trunkWidth + (u < 0.06 ? 1 : 0) + (p.near && u < 0.35 ? 1 : 0);
    px.rect(Math.round(x - w / 2), y, w, 1, y % 4 === 0 ? c.trunkDark : c.trunk);
    topX = x;
  }

  // The shaggy skirt of dead fronds under the crown — very LA.
  const skirtH = Math.round(p.crown * 0.9);
  const skirtW = Math.max(2, Math.round(p.crown * 0.55));
  for (let i = 0; i < skirtH; i++) {
    const w = skirtW - Math.floor(i / 3);
    const jag = (i * 7 + Math.round(p.phase * 10)) % 3 === 0 ? 1 : 0;
    px.rect(Math.round(topX - w / 2) + jag, topY + 1 + i, w, 1, c.skirt);
  }

  FRONDS.forEach(([angle, length, droop], j) => {
    const a = angle + Math.sin(p.phase * 3 + j) * 0.1 + Math.sin(t * 1.8 + p.phase + j * 0.9) * 0.09 * wind;
    const L = p.crown * length;
    const steps = Math.max(3, Math.ceil(L / 1.5));
    let x0 = topX;
    let y0 = topY;
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      const x = topX + Math.cos(a) * L * u;
      const y = topY + Math.sin(a) * L * u + droop * L * u * u;
      px.line(x0, y0, x, y, c.frond);
      if (u < 0.55) px.line(x0, y0 + 1, x, y + 1, c.frond); // thicker near the crown
      if (u > 0.3) {
        px.set(x, y + 1, c.frond); // hanging leaflets
        if (s % 2 === 0) px.set(x, y + 2, c.frond);
      }
      x0 = x;
      y0 = y;
    }
  });
  px.disk(Math.round(topX), topY, Math.max(1, Math.round(p.crown * 0.28)), c.frond);
}

/** [angle, length, droop] per frond: a fan arcing over, plus a hanging lower half. */
const FRONDS: [number, number, number][] = [
  ...Array.from({ length: 10 }, (_, i): [number, number, number] => {
    const a = -Math.PI + 0.15 + (i / 9) * (Math.PI - 0.3);
    const side = Math.abs(Math.cos(a));
    return [a, 0.85 + 0.25 * side, 0.15 + 0.5 * side];
  }),
  ...Array.from({ length: 6 }, (_, i): [number, number, number] => [0.35 + (i / 5) * (Math.PI - 0.7), 0.6, 0.2]),
];

function drawPowerLines(px: Pixels, layout: Layout, c: Record<"wood" | "insulator" | "transformer" | "wire", number>) {
  const { spacing, offset, top } = layout.poles;
  const { width, horizon } = layout;
  // Seen side-on, so each wire gets its own height to read as distinct.
  // [x offset from pole, y offset from pole top, sag as a fraction of span]
  const wires: [number, number, number][] = [[0, -1, 0.05], [0, 2, 0.065], [0, 6, 0.075], [1, 14, 0.1]];

  const wireY = (wire: [number, number, number], u: number) => top + wire[1] + spacing * wire[2] * 4 * u * (1 - u);

  for (let k = -1; offset + k * spacing < width + spacing; k++) {
    const x = offset + k * spacing;
    for (const wire of wires) {
      let prev: number | null = null;
      for (let xx = x + wire[0]; xx <= x + spacing + wire[0]; xx++) {
        const y = Math.round(wireY(wire, (xx - x - wire[0]) / spacing));
        if (prev !== null && Math.abs(y - prev) > 1) px.rect(xx, Math.min(y, prev) + 1, 1, Math.abs(y - prev) - 1, c.wire);
        px.set(xx, y, c.wire);
        prev = y;
      }
    }
    px.rect(x - 1, top, 2, horizon - top, c.wood);
    // Two crossarms with insulators, and a diagonal brace.
    px.rect(x - 10, top + 3, 21, 1, c.wood);
    px.rect(x - 7, top + 7, 15, 1, c.wood);
    px.line(x - 5, top + 8, x - 1, top + 11, c.wood);
    for (const dx of [-9, -4, 4, 9]) px.set(x + dx, top + 2, c.insulator);
    for (const dx of [-6, 6]) px.set(x + dx, top + 6, c.insulator);
    px.set(x, top - 1, c.insulator);
    if (((k % 3) + 3) % 3 === 0) px.rect(x + 1, top + 16, 3, 5, c.transformer);
  }

  for (const bird of layout.birds) {
    const wire = wires[bird.wire]!;
    const bx = Math.round(offset + bird.span * spacing + wire[0] + bird.u * spacing);
    const by = Math.round(wireY(wire, bird.u));
    px.rect(bx - 1, by - 2, 3, 1, c.wire);
    px.set(bx + 1, by - 3, c.wire);
    px.set(bx - 2, by - 1, c.wire);
  }
}

function drawWall(px: Pixels, layout: Layout, sky: SkyState, lit: (base: RGB, light: number) => number) {
  const { width, wallTop } = layout;
  const bottom = layout.yard.top;
  const l = 0.3 + 0.7 * sky.light;
  px.rect(0, wallTop, width, bottom - wallTop, lit(BASE.mortar, l));
  const bricks = BASE.bricks.map((b) => lit(b, l));
  const highlights = BASE.bricks.map((b) => lit(b.map((v) => Math.min(1, v * 1.2 + 0.05)) as RGB, l));
  for (let r = 0, y = wallTop + 3; y < bottom; r++, y += 5) {
    const shift = (r % 2) * 4;
    for (let col = 0, x = -shift; x < width; col++, x += 9) {
      const i = (Math.imul(r + 1, 73856093) ^ Math.imul(col + 1, 19349663)) >>> 0;
      px.rect(x, y, 8, Math.min(4, bottom - y), bricks[i % 4]!);
      px.rect(x, y, 8, 1, highlights[i % 4]!);
    }
  }
  // The cap's top face catches the open sky, so it picks up a little of its colour.
  px.rect(0, wallTop, width, 2, packLab(mixLab(litLab(sky, BASE.cap, l), sky.sky[2]!, 0.3)));
  px.rect(0, wallTop + 2, width, 1, lit(BASE.capShadow, l));
}

export function drawScene(px: Pixels, layout: Layout, sky: SkyState, sun: SunPosition, t: number) {
  const { width, height, horizon } = layout;
  const wind = windAt(t);
  const lit = lighting(sky);

  // We look west-ish: evening sun sits on stage, morning sun is mirrored onto it.
  const azimuth = sun.azimuth >= 180 ? sun.azimuth : 360 - sun.azimuth;
  const sunX = ((azimuth - 200) / 140) * width;
  const sunY = horizon - sun.altitude * (horizon / 45);

  drawSky(px, layout, sky, sunX, sunY);
  drawStars(px, layout, sky, t);

  if (sun.altitude > -3) {
    const r = Math.max(3, Math.round(height * 0.028));
    px.disk(Math.round(sunX), Math.round(sunY), r, packLab(sky.sun));
    px.disk(Math.round(sunX), Math.round(sunY), r - 1, packLab(mixLab(sky.sun, WHITE, 0.35)));
  }

  drawClouds(px, layout, sky, t);

  const mountain = packLab(mixLab(sky.haze, sky.sky[4]!, 0.3));
  for (let x = 0; x < width; x++) px.rect(x, horizon - Math.round(layout.mountains[x]!), 1, Math.round(layout.mountains[x]!) + 1, mountain);

  for (const palm of layout.palms) {
    const haze = palm.near ? 0 : 0.35;
    drawPalm(px, palm, horizon, t, wind, {
      trunk: lit(BASE.trunk, sky.light, haze),
      trunkDark: lit(BASE.trunkDark, sky.light, haze),
      frond: lit(BASE.frond, sky.light, haze),
      skirt: lit(BASE.skirt, sky.light, haze),
    });
  }

  drawPowerLines(px, layout, {
    wood: lit(BASE.wood, sky.light),
    insulator: lit(BASE.insulator, sky.light),
    transformer: lit(BASE.transformer, sky.light),
    wire: lit(BASE.wire, sky.light),
  });

  drawWall(px, layout, sky, lit);

  // The yard is the foreground: it stays readable after dark (moonlit, not
  // black) and takes a softened version of the sky's tint so it keeps its colour.
  const yardSky = { ...sky, tint: mixLab(sky.tint, WHITE, 0.4) };
  const yardLight = 0.55 + 0.45 * sky.light;
  const cache = new Map<RGB, number>();
  const paint = (base: RGB) => {
    let color = cache.get(base);
    if (color === undefined) cache.set(base, (color = packLab(litLab(yardSky, base, yardLight))));
    return color;
  };
  drawYard(px, layout.yard, paint, t, wind, sky.light < 0.2);
}
