// Sparrows. They perch on the wires and the wall, drop into the yard to hop
// and peck, spook when a cat gets too interested (and spook each other), and
// head off to roost around dusk.
import { hex } from "./color.ts";
import type { World } from "./life.ts";
import { type Pixels, sprite } from "./pixels.ts";
import type { Paint } from "./yard.ts";

type Perch = { kind: "wire"; wire: number } | { kind: "wall" } | { kind: "ground" };

// Facing right. H cap, B back, b belly, T tail, K beak, W wing.
const SPRITES = {
  sit: ["..HH.", "TBBHK", ".bb.."],
  peck: [".....", "TBBH.", ".bbHK"],
  flyUp: [".W.W.", "TBBHK", "....."],
  flyDown: [".....", "TBBHK", ".W.W."],
};
const COLORS = {
  H: hex("#6a4a32"), B: hex("#9a7a58"), b: hex("#d8c8a8"), T: hex("#5a4028"), K: hex("#3a3028"), W: hex("#7a5a3a"),
};

interface Flight {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  u: number;
  dur: number;
  dest: Perch | null;
}

export class Bird {
  x: number;
  y: number;
  facing = 1;
  state: "perch" | "ground" | "fly" | "gone" = "fly";
  perch: Perch = { kind: "wire", wire: 0 };
  private timer = 0;
  private flight: Flight | null = null;
  private hop = 0;
  private peckUntil = 0;
  private clock = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get onGround() {
    return this.state === "ground";
  }

  /** On a wire, out of reach. */
  get perched() {
    return this.state === "perch" && this.perch.kind === "wire";
  }

  get gone() {
    return this.state === "gone";
  }

  /** Fly in from off-screen to a spot on the wires. */
  static arrive(world: World): Bird {
    const fromLeft = world.random() < 0.5;
    const bird = new Bird(fromLeft ? -8 : world.width + 8, world.horizon * (0.2 + world.random() * 0.3));
    bird.flyTo(world, { kind: "wire", wire: Math.floor(world.random() * 3) });
    return bird;
  }

  /** Already sitting on a wire (for scenes that start populated). */
  static perchedOnWire(world: World): Bird {
    const perch: Perch = { kind: "wire", wire: Math.floor(world.random() * 3) };
    const bird = new Bird(0, 0);
    const spot = bird.spotFor(world, perch);
    bird.x = spot.x;
    bird.y = spot.y;
    bird.perch = perch;
    bird.state = "perch";
    bird.timer = 4 + world.random() * 20;
    return bird;
  }

  private spotFor(world: World, perch: Perch): { x: number; y: number } {
    const r = world.random;
    if (perch.kind === "wire") {
      const x = Math.round(12 + r() * (world.width - 24));
      return { x, y: world.wireAt(perch.wire, x) };
    }
    if (perch.kind === "wall") return { x: 8 + r() * (world.width - 16), y: world.wallTop };
    // Ground: somewhere in the yard not right next to a cat.
    const b = world.bounds;
    let best = { x: b.left, y: b.top };
    let bestDist = -1;
    for (let i = 0; i < 6; i++) {
      const x = b.left + r() * (b.right - b.left);
      const y = b.top + r() * (b.bottom - b.top);
      const d = Math.min(...world.cats.map((c) => Math.hypot(c.x - x, c.y - y)));
      if (d > bestDist) {
        best = { x, y };
        bestDist = d;
      }
    }
    return best;
  }

  flyTo(world: World, dest: Perch | null) {
    const target = dest ? this.spotFor(world, dest) : { x: world.random() < 0.5 ? -12 : world.width + 12, y: world.horizon * 0.25 };
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    this.flight = {
      x0: this.x, y0: this.y, x1: target.x, y1: target.y,
      cx: (this.x + target.x) / 2, cy: Math.min(this.y, target.y) - 15 - dist * 0.15,
      u: 0, dur: 0.4 + dist / 75, dest,
    };
    this.facing = target.x >= this.x ? 1 : -1;
    this.state = "fly";
  }

  /** Follow a layout change: keep our place, re-snapped to wherever we're standing. */
  rescale(world: World, sx: number, mapY: (y: number) => number) {
    this.x = Math.round(this.x * sx);
    if (this.state === "perch") {
      this.y = this.perch.kind === "wire" ? world.wireAt(this.perch.wire, this.x) : world.wallTop;
    } else if (this.state === "ground") {
      this.y = mapY(this.y);
    } else if (this.state === "fly" && this.flight) {
      this.flyTo(world, this.flight.dest); // re-aim at a spot in the new layout
    }
  }

  /** Something scary happened nearby. */
  startle(world: World, cascade: boolean) {
    if (this.state !== "ground" && !(this.state === "perch" && this.perch.kind === "wall")) return;
    this.flyTo(world, world.random() < 0.3 ? null : { kind: "wire", wire: Math.floor(world.random() * 3) });
    if (!cascade) return;
    for (const other of world.birds) {
      if (other !== this && Math.hypot(other.x - this.x, other.y - this.y) < 70) other.startle(world, false);
    }
  }

  private decide(world: World) {
    const r = world.random();
    if (world.light < 0.22) return this.flyTo(world, null); // off to roost
    if (r < 0.45) return this.flyTo(world, { kind: "ground" });
    if (r < 0.7) return this.flyTo(world, { kind: "wire", wire: Math.floor(world.random() * 3) });
    if (r < 0.88) return this.flyTo(world, { kind: "wall" });
    this.flyTo(world, null);
  }

  update(dt: number, world: World) {
    this.clock += dt;
    switch (this.state) {
      case "fly": {
        const f = this.flight!;
        f.u = Math.min(1, f.u + dt / f.dur);
        const u = f.u;
        this.x = (1 - u) * (1 - u) * f.x0 + 2 * (1 - u) * u * f.cx + u * u * f.x1;
        this.y = (1 - u) * (1 - u) * f.y0 + 2 * (1 - u) * u * f.cy + u * u * f.y1;
        if (u >= 1) {
          if (!f.dest) {
            this.state = "gone";
            break;
          }
          this.perch = f.dest;
          this.state = f.dest.kind === "ground" ? "ground" : "perch";
          this.timer = f.dest.kind === "ground" ? 6 + world.random() * 14 : 6 + world.random() * 24;
        }
        break;
      }
      case "perch":
        this.timer -= dt * (world.light < 0.22 ? 4 : 1);
        if (world.random() < dt * 0.4) this.facing = -this.facing; // look around
        if (this.perch.kind === "wall") this.watchCats(dt, world, 0.5);
        // A helicopter circling low clears the wires.
        if (world.helicopter?.hovering && world.random() < dt * 0.15) return this.flyTo(world, null);
        if (this.timer <= 0) this.decide(world);
        break;
      case "ground": {
        this.timer -= dt;
        this.hop = Math.max(0, this.hop - dt);
        if (this.hop === 0 && world.random() < dt * 1.5) {
          // Hop a little way, sometimes turning around first.
          if (world.random() < 0.3) this.facing = -this.facing;
          const b = world.bounds;
          this.x = Math.min(b.right, Math.max(b.left, this.x + this.facing * (2 + world.random() * 4)));
          this.hop = 0.18;
        } else if (this.hop === 0 && world.random() < dt * 2) {
          this.peckUntil = this.clock + 0.25;
        }
        this.watchCats(dt, world, 1);
        if (this.state === "ground" && this.timer <= 0) this.flyTo(world, { kind: "wire", wire: Math.floor(world.random() * 3) });
        break;
      }
      case "gone":
        break;
    }
  }

  /** Flee if a cat is too close or looks like it means business. */
  private watchCats(dt: number, world: World, nerve: number) {
    for (const cat of world.cats) {
      const d = Math.hypot(cat.x - this.x, (cat.y - this.y) * 1.5);
      const threat = cat.threat;
      if ((threat >= 1 && d < 50) || d < 12 || (d < 14 + 30 * threat && world.random() < dt * (1 + 4 * threat) * nerve)) {
        this.startle(world, true);
        return;
      }
    }
  }

  /** Which layer this bird belongs in right now. */
  get layer(): "back" | "wall" | "yard" | "front" {
    if (this.state === "ground") return "yard";
    if (this.state === "perch") return this.perch.kind === "wall" ? "wall" : "back";
    return "front";
  }

  draw(px: Pixels, paint: Paint, t: number) {
    if (this.state === "gone") return;
    let rows = SPRITES.sit;
    let lift = 0;
    if (this.state === "fly") rows = Math.floor(t * 12 + this.x) % 2 ? SPRITES.flyUp : SPRITES.flyDown;
    else if (this.state === "ground") {
      if (this.hop > 0) lift = Math.round(2 * Math.sin((this.hop / 0.18) * Math.PI));
      else if (this.clock < this.peckUntil) rows = SPRITES.peck;
    }
    const colors = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, paint(v)]));
    sprite(px, rows, Math.round(this.x) - 2, Math.round(this.y) - lift, colors, this.facing < 0);
  }
}
