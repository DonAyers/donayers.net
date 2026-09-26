// Visitors: butterflies among the flowers by day, moths fluttering around the
// yard after dusk, and the very occasional possum waddling along the wall.
import { hex } from "./color.ts";
import type { World } from "./life.ts";
import { type Pixels, sprite } from "./pixels.ts";
import type { Paint } from "./yard.ts";

const MOTH = {
  up: ["W.W", ".b."],
  down: [".b.", "W.W"],
  colors: { W: hex("#e8e0c8"), b: hex("#a89878") },
};

export class Moth {
  x: number;
  y: number;
  gone = false;
  private vx = 0;
  private vy = 0;
  private target = { x: 0, y: 0 };
  private retarget = 0;
  private leaving = false;
  private phase: number;

  constructor(x: number, y: number, random: () => number) {
    this.x = x;
    this.y = y;
    this.phase = random() * 10;
  }

  catch() {
    this.gone = true;
  }

  update(dt: number, world: World) {
    if (world.light > 0.45) this.leaving = true;
    this.retarget -= dt;
    if (this.retarget <= 0) {
      const b = world.bounds;
      this.target = this.leaving
        ? { x: this.x, y: -20 }
        : { x: 8 + world.random() * (world.width - 16), y: world.wallTop - 30 + world.random() * (b.bottom - 14 - world.wallTop + 30) };
      this.retarget = 2 + world.random() * 3;
    }
    // Head roughly toward the target, but erratically, the way moths do.
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = 1 - Math.exp(-5 * dt);
    this.vx += ((dx / d) * 16 + (world.random() - 0.5) * 90 - this.vx) * k;
    this.vy += ((dy / d) * 16 + (world.random() - 0.5) * 90 - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.leaving && this.y < -5) this.gone = true;
  }

  draw(px: Pixels, paint: Paint, t: number) {
    const rows = Math.floor(t * 14 + this.phase) % 2 ? MOTH.up : MOTH.down;
    sprite(px, rows, Math.round(this.x) - 1, Math.round(this.y), { W: paint(MOTH.colors.W), b: paint(MOTH.colors.b) });
  }
}

// ---- Butterflies ------------------------------------------------------------------

/** Somewhere a butterfly can land: x, the ground depth under it, and height above that. */
export interface Flower {
  x: number;
  gy: number;
  h: number;
}

// W wing, T wing tip, b body. Open: seen from above, wings spread. Closed:
// side-on, wings folded up over its back (facing right).
const BUTTERFLY_OPEN = ["TW...WT", "WWWbWWW", ".WWbWW.", ".WWbWW.", "..W.W.."];
const BUTTERFLY_CLOSED = ["..TW...", "..WW...", "..WW...", "...Wb..", "....b.."];
const BUTTERFLY_KINDS = [
  { W: hex("#f07a1c"), T: hex("#2a1a10"), b: hex("#2a1a10") }, // Gulf fritillary
  { W: hex("#f4f2ea"), T: hex("#8a8a8a"), b: hex("#3a3a3a") }, // cabbage white
  { W: hex("#f5d53a"), T: hex("#c89a1a"), b: hex("#3a2a10") }, // sulphur
];

/**
 * A daytime butterfly, flitting between flowers. Positioned by the ground
 * point under it (x, gy) plus height h, so it depth-sorts with the yard and a
 * cat can chase the spot beneath it.
 */
export class Butterfly {
  x: number;
  gy: number;
  h: number;
  gone = false;
  private kind: number;
  private target: Flower;
  private landing: boolean;
  private rest = 0;
  private clock = 0;
  private retarget = 0;
  private leaving = false;
  private lifetime: number;
  private facing = 1;

  constructor(world: World, flowers: Flower[]) {
    const r = world.random;
    this.kind = Math.floor(r() * BUTTERFLY_KINDS.length);
    const fromLeft = r() < 0.5;
    this.x = fromLeft ? -6 : world.width + 6;
    this.gy = world.bounds.top + r() * (world.bounds.bottom - world.bounds.top);
    this.h = 20 + r() * 20;
    this.target = flowers.length ? flowers[Math.floor(r() * flowers.length)]! : this.air(world);
    this.landing = flowers.length > 0;
    this.lifetime = 60 + r() * 90;
  }

  /** Screen y. */
  get y() {
    return this.gy - this.h;
  }

  get resting() {
    return this.rest > 0;
  }

  /** Off over the wall, for good. */
  escape() {
    this.leaving = true;
    this.rest = 0;
  }

  private air(world: World): Flower {
    const b = world.bounds;
    return { x: b.left + world.random() * (b.right - b.left), gy: b.top + world.random() * (b.bottom - b.top), h: 8 + world.random() * 30 };
  }

  update(dt: number, world: World, flowers: Flower[]) {
    this.clock += dt;
    const r = world.random;
    const chaser = world.cats.find((c) => c.chasing === this);
    if (world.light < 0.35 || (this.clock > this.lifetime && !chaser)) this.leaving = true;

    if (this.leaving) {
      this.target = { x: this.x + (this.x < world.width / 2 ? -80 : 80), gy: world.bounds.top, h: 90 };
      this.landing = false;
      this.rest = 0;
    } else if (chaser && Math.abs(chaser.x - this.x) < 26 && Math.abs(chaser.y - this.gy) < 18) {
      // Dodge — but stay teasingly low, so the chase goes on.
      this.rest = 0;
      this.retarget -= dt;
      if (this.retarget <= 0) {
        const away = Math.sign(this.x - chaser.x) || 1;
        const b = world.bounds;
        this.target = {
          x: Math.min(b.right, Math.max(b.left, this.x + away * (20 + r() * 25) + (r() - 0.5) * 20)),
          gy: Math.min(b.bottom, Math.max(b.top, this.gy + (r() - 0.5) * 30)),
          h: 8 + r() * 18,
        };
        this.landing = false;
        this.retarget = 0.4 + r() * 0.5;
      }
    } else if (this.rest > 0) {
      this.rest -= dt;
      if (chaser) this.rest = 0;
      return;
    }

    const speed = this.leaving ? 22 : chaser ? 30 : 16;
    const dx = this.target.x - this.x;
    const dg = this.target.gy - this.gy;
    const dh = this.target.h - this.h;
    const dist = Math.hypot(dx, dg, dh);
    if (dist < 2) {
      if (this.leaving) return void (this.gone = true);
      if (this.landing && !chaser) this.rest = 3 + r() * 5;
      const flower = r() < 0.6 && flowers.length && !chaser;
      this.target = flower ? flowers[Math.floor(r() * flowers.length)]! : this.air(world);
      this.landing = !!flower;
      return;
    }
    const step = Math.min(dist, speed * dt);
    // Fluttery: wobble sideways and up and down as it goes.
    this.x += (dx / dist) * step + Math.sin(this.clock * 7) * 0.4;
    this.gy += (dg / dist) * step;
    this.h = Math.max(2, this.h + (dh / dist) * step + Math.sin(this.clock * 11) * 0.5);
    if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
    if (this.h > 80 || this.x < -30 || this.x > world.width + 30) this.gone = this.leaving;
  }

  draw(px: Pixels, paint: Paint, t: number) {
    // Quick flaps in flight; slow opening and closing at rest.
    const open = this.rest > 0 ? Math.sin(t * 2 + this.x) > 0 : Math.floor(t * 12 + this.x) % 2 === 0;
    const colors = Object.fromEntries(Object.entries(BUTTERFLY_KINDS[this.kind]!).map(([k, v]) => [k, paint(v)]));
    sprite(px, open ? BUTTERFLY_OPEN : BUTTERFLY_CLOSED, Math.round(this.x) - 3, Math.round(this.y) + 3, colors, this.facing < 0);
  }
}

// Facing right. G fur, L pale belly, W white face, A ears, E eye, N nose.
const POSSUM = [
  "............A...",
  "...GGGGGGG.AWW..",
  ".GGGGGGGGGGWWEW.",
  "GGGGGGGGGGGWWWWN",
  "GGGGGGGGGGGGWW..",
  ".LGGGGGGGGGGG...",
];
const POSSUM_LEGS = ["..KK......KK....", "...KK....KK....."];
const POSSUM_COLORS = {
  G: hex("#9a9aa0"), L: hex("#c0c0c4"), W: hex("#eeeae4"), A: hex("#2a2628"), E: hex("#1a1616"),
  N: hex("#e8a0a8"), K: hex("#2a2628"),
};
const TAIL = hex("#e8a0a8");

export class Possum {
  x: number;
  readonly dir: number;
  gone = false;
  private pause = 0;
  private step = 0;

  constructor(world: World) {
    this.dir = world.random() < 0.5 ? 1 : -1;
    this.x = this.dir > 0 ? -20 : world.width + 20;
  }

  update(dt: number, world: World) {
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    if (world.random() < dt * 0.08) this.pause = 1.5 + world.random() * 2.5; // stop and sniff
    this.x += this.dir * 7 * dt;
    this.step += 7 * dt;
    if ((this.dir > 0 && this.x > world.width + 24) || (this.dir < 0 && this.x < -24)) this.gone = true;
  }

  draw(px: Pixels, paint: Paint, t: number, wallTop: number) {
    const flip = this.dir < 0;
    const width = POSSUM[0]!.length;
    const left = Math.round(this.x) - width / 2;
    const colors = Object.fromEntries(Object.entries(POSSUM_COLORS).map(([k, v]) => [k, paint(v)]));
    if (this.pause > 0 && Math.floor(t * 6) % 2) colors.N = colors.W!; // nose twitch
    // Long bare tail trailing behind, drooping over the edge of the wall.
    const tail = paint(TAIL);
    const rootX = flip ? left + width : left - 1;
    for (let i = 0; i < 11; i++) {
      const x = rootX - this.dir * i;
      const y = wallTop - 4 + Math.round(Math.max(0, i - 4) * 0.35 + Math.sin(t * 2 + i * 0.6) * (i / 11));
      px.set(x, y, tail);
    }
    const legs = POSSUM_LEGS[Math.floor(this.step / 2) % 2]!;
    sprite(px, [...POSSUM, legs], left, wallTop, colors, flip);
  }
}
