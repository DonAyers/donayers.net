// The back yard in front of the wall. Down the middle, back to front: the
// gate (drawn with the wall), a terrazzo patio, then a slab path. Around it: a
// lime tree, a potted lemon, a bougainvillea spilling over the back-right
// corner, and two raised beds (San Marzano tomato + Japanese cucumber; chilis).
// Positions are designed for a 384px-wide scene and spread to fit others.
import { art, drawArt } from "./art.ts";
import { type RGB, hex } from "./color.ts";
import type { Flower } from "./critters.ts";
import { BAYER, type Pixels, hash2, rng, sprite } from "./pixels.ts";
import { isTall } from "./viewport.ts";

/** Maps a daylight colour to how it looks under the current sky. */
export type Paint = (base: RGB) => number;

const C = {
  grass: hex("#5c8c3c"),
  grassDark: hex("#467030"),
  grassLight: hex("#78a84a"),
  tallGrass: hex("#8cb44c"),
  tallGrassLight: hex("#c2d87a"),
  shadow: hex("#34522a"),
  terrazzo: hex("#e2e0da"),
  terrazzoLight: hex("#eceae4"),
  terrazzoDark: hex("#d4d1c9"),
  chipGrey: hex("#9e9a92"),
  chipWarm: hex("#c4ab8e"),
  chipDark: hex("#6e6a64"),
  grout: hex("#b4b0a6"),
  edging: hex("#8a623e"),
  edgingLight: hex("#a87a50"),
  slab: hex("#b2b0aa"),
  slabLight: hex("#c6c4be"),
  slabDark: hex("#8e8c86"),
  bougainvillea: hex("#d6208a"),
  bougainvilleaPink: hex("#f25cb0"),
  bougainvilleaDeep: hex("#9c1266"),
  bougainvilleaLight: hex("#ff9ad0"),
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

/**
 * Terrazzo patio in front of the gate: big light square tiles (11×6 with 1px
 * grout, squashed by perspective) flecked with chips, a touch wider at the
 * front, finished with a wooden edge.
 */
function drawPatio(px: Pixels, paint: Paint, p: Composition["patio"]) {
  const tones = [paint(C.terrazzo), paint(C.terrazzoLight), paint(C.terrazzoDark)];
  const chips = [paint(C.chipGrey), paint(C.chipWarm), paint(C.chipDark)];
  const grout = paint(C.grout);
  const rows = p.bottom - p.top;
  const halfAt = (y: number) => Math.round(p.back + ((p.front - p.back) * (y - p.top)) / rows);
  for (let y = p.top; y < p.bottom; y++) {
    const half = halfAt(y);
    const row = Math.floor((y - p.top) / 7);
    const inRow = (y - p.top) % 7;
    for (let x = p.x - half; x <= p.x + half; x++) {
      const lx = x - p.x + 300;
      const col = Math.floor(lx / 12);
      let color: number;
      if (inRow === 6 || lx % 12 === 11) color = grout;
      else if (hash2(x, y, 81) < 0.055) color = chips[Math.floor(hash2(x, y, 82) * 3)]!; // terrazzo chips
      else color = tones[hash2(col, row, 71) < 0.7 ? 0 : hash2(col, row, 72) < 0.5 ? 1 : 2]!;
      px.set(x, y, color);
    }
    px.set(p.x - half - 1, y, grout);
    px.set(p.x + half + 1, y, grout);
  }
  // Wooden edging along the front, and its shadow on the ground.
  const front = halfAt(p.bottom);
  px.rect(p.x - front - 1, p.bottom, front * 2 + 3, 2, paint(C.edging));
  px.rect(p.x - front - 1, p.bottom, front * 2 + 3, 1, paint(C.edgingLight));
  px.rect(p.x - front, p.bottom + 2, front * 2 + 1, 1, paint(C.shadow));
}

/** A single line of concrete slabs, grass showing between them. */
function drawPath(px: Pixels, paint: Paint, p: Composition["path"]) {
  const left = p.x - Math.floor(p.width / 2);
  for (let y = p.top + 2, i = 0; y < p.bottom; y += 8, i++) {
    const h = Math.min(7, p.bottom - y);
    px.rect(left, y, p.width, h, paint(C.slab));
    px.rect(left, y, p.width, 1, paint(C.slabLight));
    if (h === 7) px.rect(left, y + 6, p.width, 1, paint(C.slabDark));
    px.set(left + 2 + ((i * 5) % (p.width - 4)), y + 3, paint(C.slabDark)); // a fleck of wear
  }
}

interface Vine {
  base: Point;
  trunk: Point[];
  blobs: Disk[];
  strands: { x: number; y: number; len: number }[];
  flowers: { x: number; y: number; kind: number }[];
}

/** A bougainvillea climbing the wall from `base`, its blooms spilling over the top. */
function bougainvillea(random: () => number, base: Point, wallTop: number, span: number): Vine {
  const trunkTop = { x: base.x - 6, y: wallTop - 2 };
  const trunk = [base, { x: base.x - 2, y: Math.round((base.y + wallTop) / 2) }, trunkTop];
  const blobs: Disk[] = [];
  const count = Math.max(4, Math.round(span / 7));
  for (let i = 0; i < count; i++) {
    const x = base.x - span * 0.85 + (i / (count - 1)) * span * 1.2 + (random() - 0.5) * 6;
    // Heavier near the trunk, trailing off along the wall.
    const near = 1 - Math.min(1, Math.abs(x - trunkTop.x) / span);
    blobs.push({ x, y: wallTop - 3 - near * 6 + (random() - 0.5) * 4, r: 4 + near * 5 + random() * 2 });
  }
  const strands = Array.from({ length: Math.round(span / 9) }, () => ({
    x: Math.round(base.x - span * 0.75 + random() * span * 1.05),
    y: wallTop + 1,
    len: Math.round(5 + random() * (base.y - wallTop - 8)),
  }));
  const flowers: Vine["flowers"] = [];
  for (const blob of blobs) {
    for (let i = 0; i < blob.r * 2.2; i++) {
      const a = random() * Math.PI * 2;
      const d = Math.sqrt(random()) * (blob.r - 1);
      flowers.push({ x: Math.round(blob.x + Math.cos(a) * d), y: Math.round(blob.y + Math.sin(a) * d * 0.8), kind: Math.floor(random() * 3) });
    }
  }
  for (const s of strands) {
    for (let y = 2; y < s.len; y += 3) if (random() < 0.6) flowers.push({ x: s.x + (random() < 0.5 ? -1 : 1), y: s.y + y, kind: Math.floor(random() * 3) });
  }
  return { base, trunk, blobs, strands, flowers };
}

function drawBougainvillea(px: Pixels, paint: Paint, v: Vine, t: number, wind: number) {
  const bark = paint(C.bark);
  for (let i = 1; i < v.trunk.length; i++) {
    const a = v.trunk[i - 1]!;
    const b = v.trunk[i]!;
    px.line(a.x, a.y, b.x, b.y, bark);
    px.line(a.x + 1, a.y, b.x + 1, b.y, bark);
  }
  const tones: [number, number, number] = [paint(C.leafDark), paint(C.leaf), paint(C.leafLight)];
  // Strands hanging down the wall face, swinging a little at the tips.
  for (const s of v.strands) {
    const swing = Math.sin(t * 1.3 + s.x * 0.3) * wind;
    for (let y = 0; y < s.len; y++) {
      const x = Math.round(s.x + swing * (y / s.len) * 1.5);
      px.set(x, s.y + y, y % 3 === 0 ? tones[1] : tones[0]);
      if (y % 4 === 1) px.set(x + 1, s.y + y, tones[1]);
    }
  }
  for (const [i, blob] of v.blobs.entries()) foliage(px, blob.x, blob.y, [{ x: 0, y: 0, r: blob.r }], tones, 90 + i);
  const blooms = [paint(C.bougainvillea), paint(C.bougainvilleaPink), paint(C.bougainvilleaDeep)];
  const light = paint(C.bougainvilleaLight);
  for (const f of v.flowers) {
    px.set(f.x, f.y, blooms[f.kind]!);
    if (f.kind === 0) {
      px.set(f.x + 1, f.y, blooms[0]!);
      px.set(f.x, f.y - 1, light); // papery bracts catching the light
    }
  }
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

/**
 * An element that can be redrawn in Aseprite: its art id, and where custom art
 * goes (bottom-centre pixel, one row below the base so it includes the shadow).
 */
export interface ArtSlot {
  id: string;
  x: number;
  bottom: number;
}

export interface Yard {
  top: number;
  bottom: number;
  width: number;
  /** Stable grass texture: 0 dark, 1 base, 2 light. */
  grass: Uint8Array;
  items: { depth: number; draw: Draw; art?: ArtSlot }[];
  /** Places the cats care about. */
  spots: { calico: Point; tabby: Point; nap: Point[]; dirt: Point; gate: Point };
  /** Where butterflies land: x, ground depth under the bloom, and its height. */
  flowers: Flower[];
  /** Long grass the tabby grazes on (shared, mutable: eaten tufts get shorter). */
  tufts: Tuft[];
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
  /** Terrazzo patio in front of the gate: centre x, back and front edges (y), half-widths at each. */
  patio: { x: number; top: number; bottom: number; back: number; front: number };
  /** Concrete slab path from the patio down to the front of the yard. */
  path: { x: number; top: number; bottom: number; width: number };
  /** Where the bougainvillea's trunk meets the ground, in the back-right corner. */
  bougainvillea: Point;
  /** Tufts of long grass (the tabby eats them). */
  tufts: Point[];
  spots: { calico: Point; tabby: Point; nap: Point[]; gate: Point };
}

/** A tuft of long grass; `length` shrinks as it's eaten and slowly grows back. */
export interface Tuft {
  x: number;
  y: number;
  length: number;
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
  // Back to front down the middle: gate, terrazzo patio, then a slab path to the front.
  const patio = {
    x: Math.round(width / 2),
    top: Y(tall ? 0.03 : 0.04),
    bottom: Y(tall ? 0.3 : 0.38),
    back: tall ? 30 : Math.round(42 * spread),
    front: tall ? 34 : Math.round(48 * spread),
  };
  return {
    tall,
    // Trees in the back corners (lime right, so it never hides downtown on the
    // left); the beds flank the path.
    lime: at(130, 0.3, 0.86, 0.14),
    lemon: at(-128, 0.42, 0.12, 0.2),
    bedA: at(-70, 0.56, 0.77, 0.64),
    bedB: at(66, 0.66, 0.185, 0.46),
    dirt: at(92, 0.84, 0.84, 0.9),
    patio,
    path: { x: patio.x, top: patio.bottom + 1, bottom, width: 10 },
    bougainvillea: { x: width - Math.round((tall ? 18 : 40) * (tall ? 1 : spread)), y: top + 2 },
    // Tufts of long grass, out on the lawn away from the beds and paving.
    tufts: tall
      ? [at(0, 0, 0.08, 0.78), at(0, 0, 0.3, 0.7), at(0, 0, 0.92, 0.72), at(0, 0, 0.4, 0.95)]
      : [at(-160, 0.9, 0, 0), at(-95, 0.72, 0, 0), at(110, 0.78, 0, 0), at(165, 0.95, 0, 0)],
    spots: {
      calico: at(8, 0.97, 0.6, 0.96),
      tabby: at(-104, 0.9, 0.3, 0.9),
      // Tabby naps in the lime tree's shade (on the patio in portrait); the calico on the terrazzo.
      nap: [at(112, 0.46, 0.36, 0.2), at(12, 0.2, 0.62, 0.84)],
      // On the terrazzo right in front of the gate, where the calico rolls around.
      gate: { x: patio.x, y: patio.top + 5 },
    },
  };
}

export function createYard(width: number, top: number, bottom: number, wallTop = top - 24): Yard {
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
  const add = (depth: number, draw: Draw, id?: string, x = 0) =>
    items.push({ depth, draw, art: id ? { id, x, bottom: depth + 1 } : undefined });

  // The terrazzo patio, slab path and a bare dirt patch (for rolling in) —
  // flat on the ground, so drawn before everything else.
  const { dirt, patio, path } = place;
  add(top, (px, paint) => {
    drawPatio(px, paint, patio);
    drawPath(px, paint, path);
    const soil = [paint(C.soil), paint(C.dirt), paint(C.dirtLight)];
    for (let dy = -4; dy <= 3; dy++) {
      for (let dx = -15; dx <= 15; dx++) {
        const d = (dx / 15) ** 2 + (dy / 4) ** 2;
        if (d > 1 || (d > 0.7 && hash2(dx, dy, 61) < 0.5)) continue;
        const n = hash2(dx, dy, 62);
        px.set(dirt.x + dx, dirt.y + dy, soil[n < 0.2 ? 0 : n > 0.85 ? 2 : 1]!);
      }
    }
  });

  // Tufts of long grass, swaying; they get shorter as the tabby eats them.
  const tufts: Tuft[] = place.tufts.map((p) => ({ x: p.x, y: p.y, length: 1 }));
  for (const [i, tuft] of tufts.entries()) {
    const blades = Array.from({ length: 7 }, (_, j) => ({ dx: j - 3 + (hash2(i, j, 83) - 0.5), len: 8 + hash2(i, j, 84) * 6, lean: (hash2(i, j, 85) - 0.5) * 1.6 }));
    add(tuft.y, (px, paint, t, wind) => {
      const tones = [paint(C.tallGrass), paint(C.tallGrassLight), paint(C.grassDark)];
      for (const [j, b] of blades.entries()) {
        const len = Math.max(2, Math.round(b.len * tuft.length));
        const sway = Math.sin(t * 1.7 + tuft.x * 0.1 + j) * wind * 1.2;
        for (let k = 0; k < len; k++) {
          const u = k / len;
          px.set(tuft.x + b.dx + (b.lean * len + sway) * u * u, tuft.y - k, tones[k === len - 1 ? 1 : k < 2 ? 2 : 0]!);
        }
      }
    });
  }

  // Bougainvillea in the back-right corner: climbs the wall and spills over it.
  {
    const vine = bougainvillea(rng(777), place.bougainvillea, wallTop, place.tall ? 50 : Math.round(110 * Math.min(1.5, Math.max(0.6, width / 384))));
    add(place.bougainvillea.y, (px, paint, t, wind) => drawBougainvillea(px, paint, vine, t, wind), "bougainvillea", place.bougainvillea.x);
  }

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
    }, "lime-tree", x);
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
    }, "lemon-tree", x);
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
    }, "bed-tomato", cx);
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
    }, "bed-peppers", cx);
  }

  items.sort((a, b) => a.depth - b.depth);

  // Blooms for butterflies: bougainvillea over the wall, peppers, tomato and
  // cucumber flowers, and the lemon tree.
  const bougainvilleaSpan = place.tall ? 50 : 110;
  const aLeft = place.bedA.x - BED_A_WIDTH / 2;
  const bLeft = place.bedB.x - BED_B_WIDTH / 2;
  const flowers: Flower[] = [
    ...[0.2, 0.45, 0.7].map((f) => ({ x: Math.round(place.bougainvillea.x - bougainvilleaSpan * (0.8 - f)), gy: top + 1, h: top - wallTop + 5 })),
    ...[10, 27, 44].map((dx) => ({ x: bLeft + dx, gy: place.bedB.y, h: 27 })),
    { x: aLeft + 17, gy: place.bedA.y, h: 36 },
    { x: aLeft + 47, gy: place.bedA.y, h: 40 },
    { x: place.lemon.x, gy: place.lemon.y, h: 36 },
  ];
  return { top, bottom, width, grass, items, spots: { ...place.spots, dirt }, flowers, tufts };
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
    ...yard.items.map((item) => {
      // Hand-drawn art from Aseprite replaces the procedural version.
      const custom = item.art && art(item.art.id);
      const draw = custom
        ? (p: Pixels) => drawArt(p, custom, item.art!.x, item.art!.bottom, paint)
        : (p: Pixels) => item.draw(p, paint, t, wind);
      return { depth: item.depth, draw };
    }),
    ...actors,
  ];
  layers.sort((a, b) => a.depth - b.depth);
  for (const layer of layers) layer.draw(px);
}
