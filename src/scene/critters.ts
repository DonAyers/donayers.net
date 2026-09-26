// Night visitors: moths fluttering around the yard after dusk, and the very
// occasional possum waddling along the top of the wall.
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
