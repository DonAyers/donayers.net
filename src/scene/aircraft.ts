// Things in the sky over South LA: airliners drifting down toward LAX, and
// the LAPD helicopter that circles the neighbourhood for a while, sweeping its
// searchlight after dark.
import { type RGB, hex, pack } from "./color.ts";
import type { World } from "./life.ts";
import { BAYER, type Pixels, sprite } from "./pixels.ts";
import type { Paint } from "./yard.ts";

// Facing left (nose at column 0). B fuselage, b belly, T tail, W wing.
const PLANE = ["........TT", ".BBBBBBBBT", "bbbbbbbbb.", "...WWW...."];
const PLANE_COLORS = { B: hex("#e6e8ee"), b: hex("#aeb4c2"), T: hex("#2f5a9e"), W: hex("#6a7080") };

// LAPD black-and-white, facing left. r rotor, m mast, K black, W white door,
// G glass, T tail rotor, s/S skids.
const HELI_BODY = [
  "......m........",
  "...KKKKK.......",
  "..GGKKKKKKKKKKT",
  ".GGWWWKKK....TT",
  "..KKKKKK......T",
  "..s.....s......",
  ".SSSSSSSSS.....",
];
const ROTOR = ["rrrrrrrrrrrrr..", "...rrrrrrr....."];
const HELI_COLORS = {
  K: hex("#1e1e22"), W: hex("#e8e8ea"), G: hex("#7aa8c8"), r: hex("#6a6a72"), m: hex("#2a2a2e"),
  T: hex("#1e1e22"), s: hex("#3a3a40"), S: hex("#3a3a40"),
};

// Lights are light sources: they don't take the sky's tint.
const RED = pack(hex("#ff3a30"));
const WHITE = pack(hex("#ffffff"));
const LANDING = pack(hex("#fff4c0"));
const BEAM: RGB = [1, 0.96, 0.84];

function paintAll(colors: Record<string, RGB>, paint: Paint) {
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, paint(v)]));
}

/** Mix a light colour into whatever's already at (x, y). */
function glow(px: Pixels, x: number, y: number, rgb: RGB, amount: number) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= px.width || y >= px.height || amount <= 0) return;
  const i = y * px.width + x;
  const c = px.data[i]!;
  const mix = (v: number, to: number) => Math.round(v + (to * 255 - v) * amount);
  px.data[i] = ((255 << 24) | (mix((c >> 16) & 255, rgb[2]) << 16) | (mix((c >> 8) & 255, rgb[1]) << 8) | mix(c & 255, rgb[0])) >>> 0;
}

export class Plane {
  x: number;
  y: number;
  readonly dir: number;
  gone = false;
  private speed: number;
  private descent: number;

  constructor(world: World) {
    // Mostly heading west toward LAX, drifting down on approach.
    this.dir = world.random() < 0.7 ? -1 : 1;
    this.x = this.dir < 0 ? world.width + 12 : -12;
    this.y = world.horizon * (0.1 + world.random() * 0.3);
    this.speed = 9 + world.random() * 5;
    this.descent = world.random() * 0.3;
  }

  update(dt: number, world: World) {
    this.x += this.dir * this.speed * dt;
    this.y += this.descent * dt;
    if (this.x < -16 || this.x > world.width + 16) this.gone = true;
  }

  draw(px: Pixels, paint: Paint, t: number, light: number) {
    const left = Math.round(this.x) - 5;
    const bottom = Math.round(this.y) + 2;
    sprite(px, PLANE, left, bottom, paintAll(PLANE_COLORS, paint), this.dir > 0);
    if (light > 0.45) return;
    // After dark you mostly see its lights.
    const nose = this.dir < 0 ? left : left + 9;
    const tail = this.dir < 0 ? left + 9 : left;
    px.set(nose - this.dir, bottom - 2, LANDING);
    if (Math.floor(t * 1.3) % 2 === 0) px.set(left + 5, bottom, RED);
    if ((t * 1.1) % 1 < 0.08) px.set(tail, bottom - 4, WHITE);
  }
}

export class Helicopter {
  x: number;
  y: number;
  facing: number;
  state: "enter" | "hover" | "leave" | "gone" = "enter";
  /** Where the searchlight is pointing (on the ground). */
  spot = { x: 0, y: 0 };
  private center: { x: number; y: number };
  private timer = 0;
  private phase = 0;
  private clock = 0;
  private exit = 1;

  constructor(world: World) {
    const dir = world.random() < 0.5 ? 1 : -1;
    this.facing = dir;
    this.x = dir > 0 ? -20 : world.width + 20;
    this.y = world.horizon * (0.14 + world.random() * 0.14); // clear sky above the wires
    this.center = { x: world.width * (0.3 + world.random() * 0.4), y: this.y };
  }

  get hovering() {
    return this.state === "hover";
  }

  get gone() {
    return this.state === "gone";
  }

  /** Follow a layout change. */
  rescale(sx: number, sy: number) {
    this.x *= sx;
    this.y *= sy;
    this.center = { x: this.center.x * sx, y: this.center.y * sy };
  }

  update(dt: number, world: World) {
    this.clock += dt;
    switch (this.state) {
      case "enter": {
        const dx = this.center.x - this.x;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), 28 * dt);
        if (Math.abs(dx) < 2) {
          this.state = "hover";
          this.timer = 20 + world.random() * 25;
        }
        break;
      }
      case "hover": {
        // Lazy circles over the neighbourhood.
        this.phase += dt;
        const vx = Math.cos(this.phase * 0.25);
        this.x = this.center.x + 26 * Math.sin(this.phase * 0.25);
        this.y = this.center.y + 5 * Math.sin(this.phase * 0.4);
        if (Math.abs(vx) > 0.2) this.facing = vx > 0 ? 1 : -1;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = "leave";
          this.exit = world.random() < 0.5 ? 1 : -1;
          this.facing = this.exit;
        }
        break;
      }
      case "leave":
        this.x += this.exit * 32 * dt;
        this.y -= 3 * dt;
        if (this.x < -24 || this.x > world.width + 24) this.state = "gone";
        break;
      case "gone":
        break;
    }
    // The searchlight wanders across the yard.
    const b = world.bounds;
    this.spot = {
      x: this.x + 40 * Math.sin(this.clock * 0.37) + 18 * Math.sin(this.clock * 0.9),
      y: b.top + (b.bottom - b.top) * (0.45 + 0.35 * Math.sin(this.clock * 0.23)),
    };
  }

  draw(px: Pixels, paint: Paint, t: number) {
    if (this.gone) return;
    const width = HELI_BODY[0]!.length;
    const left = Math.round(this.x) - Math.floor(width / 2);
    const bottom = Math.round(this.y) + 4;
    const colors = paintAll(HELI_COLORS, paint);
    const flip = this.facing > 0;
    sprite(px, HELI_BODY, left, bottom, colors, flip);
    // Rotor blur: alternate a long and short blade every few frames.
    sprite(px, [ROTOR[Math.floor(t * 20) % 2]!], left, bottom - HELI_BODY.length, colors, flip);
    if (Math.floor(t * 1.5) % 2 === 0) px.set(left + (flip ? width - 6 : 5), bottom - 6, RED);
  }

  /** The searchlight, after dark: a dithered beam down to a bright spot. */
  drawBeam(px: Pixels, light: number) {
    if (this.gone || light > 0.3) return;
    const strength = Math.min(1, (0.3 - light) / 0.2);
    const x0 = this.x;
    const y0 = this.y + 3;
    const { x: x1, y: y1 } = this.spot;
    const length = Math.max(1, y1 - y0);
    for (let y = Math.round(y0) + 2; y <= y1; y++) {
      const u = (y - y0) / length;
      const cx = x0 + (x1 - x0) * u;
      const half = 1 + u * 7;
      for (let x = Math.floor(cx - half); x <= cx + half; x++) {
        if (BAYER[((y & 3) << 2) | (x & 3)]! > 0.7) continue;
        glow(px, x, y, BEAM, strength * 0.2 * (1 - (Math.abs(x - cx) / half) * 0.6));
      }
    }
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -11; dx <= 11; dx++) {
        const e = (dx / 11) ** 2 + (dy / 3) ** 2;
        if (e <= 1) glow(px, x1 + dx, y1 + dy, BEAM, strength * 0.45 * (1 - e * 0.6));
      }
    }
  }
}
