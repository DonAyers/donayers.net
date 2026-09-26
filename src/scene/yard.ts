// The back yard in front of the wall: a lime tree, a potted lemon, two raised
// beds (San Marzano tomato + Japanese cucumber; chilis) and two cats.
// Positions are designed for a 384px-wide scene and spread to fit others.
import { type RGB, hex } from "./color.ts";
import { BAYER, type Pixels, hash2, rng, sprite } from "./pixels.ts";
import { isTall } from "./viewport.ts";

/** Maps a daylight colour to how it looks under the current sky. */
export type Paint = (base: RGB) => number;

const C = {
  grass: hex("#5c8c3c"),
  grassDark: hex("#467030"),
  grassLight: hex("#78a84a"),
  shadow: hex("#34522a"),
  stone: hex("#a8a298"),
  stoneLight: hex("#c8c2b6"),
  stoneDark: hex("#86807a"),
  soil: hex("#4a3526"),
  dirt: hex("#7a5a3e"),
  dirtLight: hex("#9a7a58"),
  wood: hex("#a0724a"),
  woodDark: hex("#74502f"),
  woodLight: hex("#c0905e"),
  bark: hex("#6a4e36"),
  leafDark: hex("#2c5e2c"),
  leaf: hex("#3e8438"),
  leafLight: hex("#62ac4a"),
  citrusDark: hex("#24502a"),
  citrus: hex("#357a36"),
  citrusLight: hex("#58a044"),
  lime: hex("#a8d040"),
  limeLight: hex("#d4f080"),
  lemon: hex("#ffd83a"),
  lemonLight: hex("#fff0a0"),
  tomato: hex("#d8322a"),
  tomatoLight: hex("#ff7058"),
  unripe: hex("#8cb84a"),
  cucumber: hex("#2a5a28"),
  cucumberLight: hex("#4a8a3a"),
  blossom: hex("#ffd840"),
  chiliRed: hex("#e0301e"),
  chiliOrange: hex("#ff8a1e"),
  chiliGreen: hex("#58a032"),
  bamboo: hex("#c8b27a"),
  bambooDark: hex("#9a8452"),
  twine: hex("#8a7a5a"),
  terracotta: hex("#c2653f"),
  terracottaLight: hex("#d8835a"),
  terracottaDark: hex("#8e4428"),
  flowerWhite: hex("#f0ece0"),
  flowerPurple: hex("#a888d8"),
};

// ---- Sprites ------------------------------------------------------------------

const FRUIT = {
  tomato: { rows: [".g.", "RhR", "RRR", "RRR", ".R."], colors: { g: C.leafDark, R: C.tomato, h: C.tomatoLight } },
  unripe: { rows: [".g.", "UU", "UU", "UU"].map((r) => r.padEnd(3, ".")), colors: { g: C.leafDark, U: C.unripe } },
  lemon: { rows: [".YY.", "YhYY", ".YY."], colors: { Y: C.lemon, h: C.lemonLight } },
  lime: { rows: [".L.", "LhL", ".L."], colors: { L: C.lime, h: C.limeLight } },
  cucumber: { rows: ["g.", "cc", "cb", "cc", "cc", "bc", "cc", "cc", "c."], colors: { g: C.leafDark, c: C.cucumber, b: C.cucumberLight } },
};

type Colors = Record<string, RGB>;

function paintAll(colors: Colors, paint: Paint): Record<string, number> {
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, paint(v)]));
}

function drawFruit(px: Pixels, paint: Paint, fruit: { rows: string[]; colors: Colors }, x: number, y: number) {
  sprite(px, fruit.rows, x, y + fruit.rows.length, paintAll(fruit.colors, paint));
}

// ---- Plants ---------------------------------------------------------------------

interface Disk {
  x: number;
  y: number;
  r: number;
}

interface Canopy {
  disks: Disk[];
  fruit: { x: number; y: number }[];
}

/** A clump of overlapping disks, with fruit spots scattered inside it. */
function canopy(random: () => number, radius: number, blobs: number, fruit: number): Canopy {
  const disks: Disk[] = [{ x: 0, y: 0, r: radius * 0.75 }];
  for (let i = 0; i < blobs; i++) {
    const a = random() * Math.PI * 2;
    const d = random() * radius * 0.55;
    disks.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, r: radius * (0.4 + random() * 0.3) });
  }
  const inside = (x: number, y: number) => disks.some((k) => (x - k.x) ** 2 + (y - k.y) ** 2 <= (k.r - 3) ** 2);
  const spots: { x: number; y: number }[] = [];
  for (let tries = 0; spots.length < fruit && tries < 400; tries++) {
    const x = Math.round((random() - 0.5) * radius * 2);
    const y = Math.round((random() - 0.5) * radius * 2);
    if (inside(x, y) && spots.every((s) => Math.abs(s.x - x) + Math.abs(s.y - y) > 5)) spots.push({ x, y });
  }
  return { disks, fruit: spots };
}

/** Leafy blob lit from the upper left, with ragged edges. */
function foliage(px: Pixels, cx: number, cy: number, disks: Disk[], tones: [number, number, number], seed: number) {
  const reach = Math.max(...disks.map((d) => Math.hypot(d.x, d.y) + d.r));
  const ox = Math.round(cx);
  const oy = Math.round(cy);
  for (let y = Math.floor(cy - reach); y <= cy + reach; y++) {
    for (let x = Math.floor(cx - reach); x <= cx + reach; x++) {
      let margin = -Infinity;
      for (const d of disks) margin = Math.max(margin, d.r - Math.hypot(x - cx - d.x, y - cy - d.y));
      if (margin < 0) continue;
      if (margin < 1.2 && hash2(x - ox, y - oy, seed) < 0.35) continue; // ragged edge
      const light = 0.5 - ((x - cx) * 0.35 + (y - cy) * 0.7) / reach + (BAYER[((y & 3) << 2) | (x & 3)]! - 0.5) * 0.45;
      const gap = hash2(x - ox, y - oy, seed + 7) < 0.07; // leaf shadows
      px.set(x, y, gap ? tones[0] : light > 0.62 ? tones[2] : light > 0.3 ? tones[1] : tones[0]);
    }
  }
}

function groundShadow(px: Pixels, paint: Paint, cx: number, y: number, halfWidth: number) {
  px.rect(cx - halfWidth, y - 1, halfWidth * 2 + 1, 2, paint(C.shadow));
  px.rect(cx - halfWidth + 2, y + 1, halfWidth * 2 - 3, 1, paint(C.grassDark));
}

/** Front face of a wooden raised bed, with soil showing along the top. */
function bed(px: Pixels, paint: Paint, left: number, base: number, width: number) {
  const h = 13;
  const top = base - h;
  px.rect(left + 1, top - 2, width - 2, 2, paint(C.soil));
  px.rect(left, top, width, h, paint(C.wood));
  px.rect(left, top, width, 1, paint(C.woodLight));
  px.rect(left, top + 6, width, 1, paint(C.woodDark));
  px.rect(left, top + 7, width, 1, paint(C.woodLight));
  px.rect(left, top - 2, 3, h + 2, paint(C.woodDark));
  px.rect(left + width - 3, top - 2, 3, h + 2, paint(C.woodDark));
  for (let i = 0; i < width / 5; i++) {
    const gx = left + 5 + ((i * 11) % (width - 12));
    px.rect(gx, top + 3 + (i % 2) * 6, 4, 1, paint(C.woodDark)); // grain
  }
}

// ---- Layout -------------------------------------------------------------------

type Draw = (px: Pixels, paint: Paint, t: number, wind: number) => void;

interface Point {
  x: number;
  y: number;
}

export interface Yard {
  top: number;
  bottom: number;
  width: number;
  /** Stable grass texture: 0 dark, 1 base, 2 light. */
  grass: Uint8Array;
  items: { depth: number; draw: Draw }[];
  /** Places the cats care about. */
  spots: { calico: Point; tabby: Point; nap: Point[]; dirt: Point };
}

export const BED_A_WIDTH = 66;
export const BED_B_WIDTH = 54;

export interface Composition {
  tall: boolean;
  /** Tree bases, and bed centres at their front base line. */
  lime: Point;
  lemon: Point;
  bedA: Point;
  bedB: Point;
  dirt: Point;
  stones: Point[];
  spots: { calico: Point; tabby: Point; nap: Point[] };
}

/**
 * Where everything goes. Wide screens spread the yard side to side (offsets
 * designed for a 384px scene); tall screens stack it front to back instead, so
 * a portrait phone still gets every tree, bed and cat.
 */
export function composition(width: number, top: number, bottom: number): Composition {
  const height = bottom - top;
  const tall = isTall(width, bottom);
  const spread = Math.min(1.5, Math.max(0.6, width / 384));
  const Y = (depth: number) => Math.round(top + height * depth);
  // [wide: offset from centre, depth] [tall: fraction of width, depth]
  const at = (wx: number, wd: number, tx: number, td: number): Point =>
    tall ? { x: Math.round(width * tx), y: Y(td) } : { x: Math.round(width / 2 + wx * spread), y: Y(wd) };
  return {
    tall,
    lime: at(-130, 0.3, 0.2, 0.2),
    lemon: at(128, 0.42, 0.85, 0.3),
    bedA: at(-50, 0.56, 0.36, 0.44),
    bedB: at(48, 0.66, 0.68, 0.64),
    dirt: at(92, 0.84, 0.78, 0.86),
    stones: [at(-8, 0.98, 0.44, 0.98), at(6, 0.84, 0.5, 0.9), at(-5, 0.7, 0.44, 0.82)],
    spots: {
      calico: at(8, 0.97, 0.62, 0.96),
      tabby: at(-104, 0.9, 0.22, 0.9),
      // Tabby naps in the lime tree's shade; the calico by the pepper bed.
      nap: [at(-112, 0.46, 0.24, 0.36), at(20, 0.8, 0.82, 0.84)],
    },
  };
}

export function createYard(width: number, top: number, bottom: number): Yard {
  const random = rng(4242);
  const height = bottom - top;
  const place = composition(width, top, bottom);

  const grass = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = hash2(x, y, 99);
      grass[y * width + x] = n < 0.12 ? 0 : n > 0.9 ? 2 : 1;
    }
  }

  const items: Yard["items"] = [];
  const add = (depth: number, draw: Draw) => items.push({ depth, draw });

  // A bare dirt patch (for rolling in) and stepping stones up the middle —
  // flat on the ground, so drawn before everything else.
  const { dirt, stones } = place;
  add(top, (px, paint) => {
    const soil = [paint(C.soil), paint(C.dirt), paint(C.dirtLight)];
    for (let dy = -4; dy <= 3; dy++) {
      for (let dx = -15; dx <= 15; dx++) {
        const d = (dx / 15) ** 2 + (dy / 4) ** 2;
        if (d > 1 || (d > 0.7 && hash2(dx, dy, 61) < 0.5)) continue;
        const n = hash2(dx, dy, 62);
        px.set(dirt.x + dx, dirt.y + dy, soil[n < 0.2 ? 0 : n > 0.85 ? 2 : 1]!);
      }
    }
    for (const { x, y } of stones) {
      px.rect(x - 5, y - 2, 11, 4, paint(C.stone));
      px.rect(x - 6, y - 1, 13, 2, paint(C.stone));
      px.rect(x - 4, y + 2, 9, 1, paint(C.stoneDark));
      px.rect(x - 3, y - 2, 5, 1, paint(C.stoneLight));
    }
  });

  // Lime tree, planted near the wall.
  {
    const { x, y: base } = place.lime;
    const crown = canopy(random, 21, 9, 14);
    add(base, (px, paint, t, wind) => {
      const sway = Math.round(Math.sin(t * 0.8 + 1) * wind);
      const trunkTop = base - 22;
      groundShadow(px, paint, x, base, 16);
      px.rect(x - 2, trunkTop, 4, 22, paint(C.bark));
      px.rect(x - 3, base - 3, 6, 3, paint(C.bark));
      px.line(x - 1, trunkTop + 6, x - 9 + sway, trunkTop - 6, paint(C.bark));
      px.line(x + 1, trunkTop + 4, x + 9 + sway, trunkTop - 8, paint(C.bark));
      const cx = x + sway;
      const cy = trunkTop - 14;
      foliage(px, cx, cy, crown.disks, [paint(C.citrusDark), paint(C.citrus), paint(C.citrusLight)], 11);
      for (const f of crown.fruit) drawFruit(px, paint, FRUIT.lime, cx + f.x, cy + f.y);
    });
  }

  // Small lemon tree in a terracotta pot.
  {
    const { x, y: base } = place.lemon;
    const crown = canopy(random, 13, 6, 8);
    add(base, (px, paint, t, wind) => {
      const sway = Math.round(Math.sin(t * 1.1 + 2) * wind);
      groundShadow(px, paint, x, base, 11);
      const potTop = base - 14;
      px.rect(x - 1, potTop - 15, 2, 15, paint(C.bark));
      const cx = x + sway;
      const cy = potTop - 22;
      foliage(px, cx, cy, crown.disks, [paint(C.citrusDark), paint(C.citrus), paint(C.citrusLight)], 23);
      for (const f of crown.fruit) drawFruit(px, paint, FRUIT.lemon, cx + f.x, cy + f.y);
      // Pot: soil, rim, then a tapering body with a highlight.
      px.rect(x - 8, potTop - 1, 16, 1, paint(C.soil));
      px.rect(x - 10, potTop, 20, 3, paint(C.terracottaLight));
      px.rect(x - 10, potTop + 3, 20, 1, paint(C.terracottaDark));
      for (let r = 0; r < 10; r++) {
        const inset = Math.floor(r / 3);
        px.rect(x - 9 + inset, potTop + 4 + r, 18 - inset * 2, 1, paint(C.terracotta));
      }
      px.rect(x - 6, potTop + 5, 1, 6, paint(C.terracottaLight));
    });
  }

  // Raised bed A: San Marzano tomato on a stake, Japanese cucumber on a trellis.
  {
    const { x: cx, y: base } = place.bedA;
    const bedW = BED_A_WIDTH;
    const left = cx - bedW / 2;
    const soil = base - 15;
    const clusters = Array.from({ length: 7 }, (_, i) => canopy(random, i < 4 ? 7 : 6, 3, 0));
    add(base, (px, paint, t, wind) => {
      groundShadow(px, paint, cx, base, bedW / 2 + 1);
      const tones: [number, number, number] = [paint(C.leafDark), paint(C.leaf), paint(C.leafLight)];
      const nod = Math.round(Math.sin(t * 1.4) * wind * 0.6);

      // Tomato: stake, leafy clusters climbing it, plum-shaped fruit.
      const tx = left + 17;
      px.rect(tx, soil - 40, 2, 40, paint(C.bamboo));
      px.rect(tx + 1, soil - 40, 1, 40, paint(C.bambooDark));
      clusters.forEach((cluster, i) =>
        foliage(px, tx + (i % 2 ? 5 : -4) + (i > 3 ? nod : 0), soil - 5 - i * 5.5, cluster.disks, tones, 31 + i),
      );
      for (const [dx, dy] of [[-8, -12], [-4, -11], [5, -18], [-7, -25], [3, -31]] as const) {
        drawFruit(px, paint, FRUIT.tomato, tx + dx, soil + dy);
      }
      for (const [dx, dy] of [[8, -24], [-2, -36]] as const) drawFruit(px, paint, FRUIT.unripe, tx + dx, soil + dy);

      // Cucumber: bamboo trellis with a twine net, climbing vine, long fruit.
      const kx = left + 47;
      const trellisTop = soil - 42;
      px.line(kx - 10, trellisTop, kx + 10, soil - 2, paint(C.twine));
      px.line(kx + 10, trellisTop, kx - 10, soil - 2, paint(C.twine));
      px.line(kx - 10, trellisTop + 20, kx, soil - 2, paint(C.twine));
      px.line(kx + 10, trellisTop + 20, kx, soil - 2, paint(C.twine));
      for (const dx of [-11, 10]) px.rect(kx + dx, trellisTop - 1, 2, 43, paint(C.bamboo));
      for (const dy of [0, 14, 28]) px.rect(kx - 11, trellisTop + dy, 23, 1, paint(C.bambooDark));
      for (let i = 0; i < 13; i++) {
        const lx = kx - 8 + ((i * 7) % 17) + (i > 8 ? nod : 0);
        const ly = soil - 4 - i * 3;
        px.rect(lx - 2, ly, 5, 3, tones[1]);
        px.rect(lx - 1, ly - 1, 3, 1, tones[2]);
        px.rect(lx, ly + 3, 1, 1, tones[0]);
      }
      for (const [dx, dy] of [[-6, -20], [2, -15], [6, -30]] as const) drawFruit(px, paint, FRUIT.cucumber, kx + dx, soil + dy);
      for (const [dx, dy] of [[-7, -34], [5, -38], [0, -24], [8, -12]] as const) {
        px.rect(kx + dx, soil + dy, 2, 2, paint(C.blossom));
      }

      bed(px, paint, left, base, bedW);
    });
  }

  // Raised bed B: spicy peppers.
  {
    const { x: cx, y: base } = place.bedB;
    const bedW = BED_B_WIDTH;
    const left = cx - bedW / 2;
    const soil = base - 15;
    const bushes = Array.from({ length: 3 }, () => canopy(random, 9, 5, 0));
    add(base, (px, paint, t, wind) => {
      groundShadow(px, paint, cx, base, bedW / 2 + 1);
      const tones: [number, number, number] = [paint(C.leafDark), paint(C.leaf), paint(C.leafLight)];
      const chili = [paint(C.chiliRed), paint(C.chiliOrange), paint(C.chiliGreen)];
      bushes.forEach((bush, i) => {
        const bx = left + 10 + i * 17;
        const nod = Math.round(Math.sin(t * 1.6 + i) * wind * 0.6);
        px.rect(bx, soil - 6, 2, 6, tones[0]);
        foliage(px, bx + nod, soil - 12, bush.disks, tones, 51 + i);
        // Chilis: some point up (like Thai chilis), some hang.
        for (let k = 0; k < 5; k++) {
          const x0 = bx + nod - 6 + ((k * 5 + i * 3) % 13);
          const up = (k + i) % 2 === 0;
          const y0 = soil - (up ? 22 : 11) + (k % 3);
          const color = chili[(k + i) % 3]!;
          px.rect(x0, y0, 2, 4, color);
          px.set(x0 + (up ? 0 : 1), up ? y0 - 1 : y0 + 4, color); // pointed tip
          px.rect(x0, up ? y0 + 4 : y0 - 1, 2, 1, tones[0]); // stem cap
        }
      });
      bed(px, paint, left, base, bedW);
    });
  }

  items.sort((a, b) => a.depth - b.depth);
  return { top, bottom, width, grass, items, spots: { ...place.spots, dirt } };
}

type Drawable = { depth: number; draw: (px: Pixels) => void };

/** Grass, then the yard's plants merged back-to-front with `actors` (cats, birds). */
export function drawYard(px: Pixels, yard: Yard, paint: Paint, t: number, wind: number, actors: Drawable[] = []) {
  const { top, bottom, width, grass } = yard;
  const tones = [paint(C.grassDark), paint(C.grass), paint(C.grassLight)];
  for (let y = top; y < bottom && y < px.height; y++) {
    const row = (y - top) * width;
    for (let x = 0; x < width; x++) px.data[y * px.width + x] = tones[grass[row + x]!]!;
  }
  // Shade at the foot of the wall.
  px.rect(0, top, width, 2, paint(C.shadow));
  px.rect(0, top + 2, width, 1, tones[0]!);
  // A few wildflowers.
  for (let i = 0; i < width / 20; i++) {
    const fx = Math.floor(hash2(i, 1, 5) * width);
    const fy = top + 5 + Math.floor(hash2(i, 2, 5) * (bottom - top - 7));
    px.set(fx, fy, paint(i % 2 ? C.flowerWhite : C.flowerPurple));
    px.set(fx, fy + 1, tones[0]!);
  }
  const layers: Drawable[] = [
    ...yard.items.map((item) => ({ depth: item.depth, draw: (p: Pixels) => item.draw(p, paint, t, wind) })),
    ...actors,
  ];
  layers.sort((a, b) => a.depth - b.depth);
  for (const layer of layers) layer.draw(px);
}
