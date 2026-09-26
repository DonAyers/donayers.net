// Birds: sparrows and the occasional big crow. They perch on the wires and
// the wall, drop into the yard to hop and peck, and head off to roost around
// dusk. Sparrows spook at any cat that gets interested (and spook each other,
// and clear out when a crow lands nearby); crows are bold, caw at the cats,
// and only leave if one actually pounces.
import { type RGB, hex } from "./color.ts";
import type { World } from "./life.ts";
import { type Pixels, sprite } from "./pixels.ts";
import type { Paint } from "./yard.ts";

type Perch = { kind: "wire"; wire: number } | { kind: "wall" } | { kind: "ground" };

export type Species = "sparrow" | "crow";

interface Kind {
  sprites: { sit: string[]; peck: string[]; flyUp: string[]; flyDown: string[]; caw?: string[] };
  colors: Record<string, RGB>;
  /** Pixels from the sprite's left edge to its centre. */
  half: number;
  flySpeed: number;
  /** Wingbeats per second. */
  flap: number;
  /** Where it goes next: chances of ground, wire, wall (the rest: leave). */
  choices: [number, number, number];
  hop: [number, number];
}

const KINDS: Record<Species, Kind> = {
  // Facing right. H cap, B back, b belly, T tail, K beak, W wing.
  sparrow: {
    sprites: {
      sit: ["..HH.", "TBBHK", ".bb.."],
      peck: [".....", "TBBH.", ".bbHK"],
      flyUp: [".W.W.", "TBBHK", "....."],
      flyDown: [".....", "TBBHK", ".W.W."],
    },
    colors: { H: hex("#6a4a32"), B: hex("#9a7a58"), b: hex("#d8c8a8"), T: hex("#5a4028"), K: hex("#3a3028"), W: hex("#7a5a3a") },
    half: 2,
    flySpeed: 75,
    flap: 12,
    choices: [0.45, 0.25, 0.18],
    hop: [2, 6],
  },
  // A big glossy crow, facing right. K black, S blue-black sheen, E eye glint, b beak, T tail, L legs.
  crow: {
    sprites: {
      sit: ["......KK..", ".....KKEKb", "TTKKSSKKb.", ".TKKKKKK..", "...KKKK...", "....L.L..."],
      caw: ["......KK.b", ".....KKEbb", "TTKKSSKK.b", ".TKKKKKK..", "...KKKK...", "....L.L..."],
      peck: ["..........", "..........", "TTKKSSKK..", ".TKKKKKKKE", "...KKKK.Kb", "....L.L..b"],
      flyUp: ["...KKK....", "....KKK...", "TTKKSSKKKb", ".TKKKKKK..", "..........", ".........."],
      flyDown: ["..........", "..........", "TTKKSSKKKb", ".TKKKKKK..", "...KKK....", "....KKK..."],
    },
    colors: { K: hex("#1c1c22"), S: hex("#34405c"), E: hex("#7a8aa8"), b: hex("#3a3a42"), T: hex("#26262e"), L: hex("#2a2a2a") },
    half: 5,
    flySpeed: 50,
    flap: 5,
    choices: [0.25, 0.3, 0.4],
    hop: [1, 3],
  },
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
  private cawUntil = 0;
  private nextCaw = 3;
  private kind: Kind;

  constructor(
    x: number,
    y: number,
    readonly species: Species = "sparrow",
  ) {
    this.x = x;
    this.y = y;
    this.kind = KINDS[species];
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

  /** Mid-caw right now. */
  get cawing() {
    return this.clock < this.cawUntil;
  }

  /** Fly in from off-screen to a spot on the wires (crows usually head for the wall). */
  static arrive(world: World, species: Species = "sparrow"): Bird {
    const fromLeft = world.random() < 0.5;
    const bird = new Bird(fromLeft ? -12 : world.width + 12, world.horizon * (0.2 + world.random() * 0.3), species);
    bird.flyTo(world, species === "crow" && world.random() < 0.6 ? { kind: "wall" } : { kind: "wire", wire: Math.floor(world.random() * 3) });
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
    const target = dest ? this.spotFor(world, dest) : { x: world.random() < 0.5 ? -14 : world.width + 14, y: world.horizon * 0.25 };
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    this.flight = {
      x0: this.x, y0: this.y, x1: target.x, y1: target.y,
      cx: (this.x + target.x) / 2, cy: Math.min(this.y, target.y) - 15 - dist * 0.15,
      u: 0, dur: 0.4 + dist / this.kind.flySpeed, dest,
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
    if (this.species === "crow") this.caw(); // leaves complaining
    this.flyTo(world, world.random() < 0.3 ? null : { kind: "wire", wire: Math.floor(world.random() * 3) });
    if (!cascade) return;
    for (const other of world.birds) {
      if (other !== this && Math.hypot(other.x - this.x, other.y - this.y) < 70) other.startle(world, false);
    }
  }

  private caw() {
    this.cawUntil = this.clock + 0.9;
  }

  private decide(world: World) {
    const r = world.random();
    if (world.light < 0.22) return this.flyTo(world, null); // off to roost
    const [ground, wire, wall] = this.kind.choices;
    if (r < ground) return this.flyTo(world, { kind: "ground" });
    if (r < ground + wire) return this.flyTo(world, { kind: "wire", wire: Math.floor(world.random() * 3) });
    if (r < ground + wire + wall) return this.flyTo(world, { kind: "wall" });
    this.flyTo(world, null);
  }

  update(dt: number, world: World) {
    this.clock += dt;
    if (this.state === "perch" || this.state === "ground") {
      if (this.species === "crow") this.crowTalk(world);
      else if (this.makeWayForCrows(dt, world)) return;
    }
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
          const long = this.species === "crow" ? 1.6 : 1;
          this.timer = (f.dest.kind === "ground" ? 6 + world.random() * 14 : 6 + world.random() * 24) * long;
        }
        break;
      }
      case "perch":
        this.timer -= dt * (world.light < 0.22 ? 4 : 1);
        if (world.random() < dt * 0.4) this.facing = -this.facing; // look around
        if (this.perch.kind === "wall") this.watchCats(dt, world, 0.5);
        // A helicopter circling low clears the wires.
        if (world.helicopter?.hovering && world.random() < dt * 0.15) return this.flyTo(world, null);
        if (this.state === "perch" && this.timer <= 0) this.decide(world);
        break;
      case "ground": {
        this.timer -= dt;
        this.hop = Math.max(0, this.hop - dt);
        if (this.hop === 0 && world.random() < dt * 1.5) {
          // Hop (or, for a crow, strut) a little way, sometimes turning around first.
          if (world.random() < 0.3) this.facing = -this.facing;
          const b = world.bounds;
          const [min, max] = this.kind.hop;
          this.x = Math.min(b.right, Math.max(b.left, this.x + this.facing * (min + world.random() * (max - min))));
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

  /** Crows caw now and then, and a lot more at a cat that's too close. */
  private crowTalk(world: World) {
    if (this.clock < this.nextCaw) return;
    const catNear = world.cats.some((c) => Math.hypot(c.x - this.x, c.y - this.y) < 50);
    this.caw();
    this.nextCaw = this.clock + (catNear ? 1.5 + world.random() * 2.5 : 4 + world.random() * 10);
    if (catNear) {
      const cat = world.cats.reduce((a, b) => (Math.abs(a.x - this.x) < Math.abs(b.x - this.x) ? a : b));
      this.facing = cat.x >= this.x ? 1 : -1; // scold it to its face
    }
  }

  /** Sparrows don't hang around next to a crow. Returns true if this one flew off. */
  private makeWayForCrows(dt: number, world: World): boolean {
    for (const other of world.birds) {
      if (other.species !== "crow" || other.state === "fly" || other.gone) continue;
      if (Math.hypot(other.x - this.x, other.y - this.y) < 26 && world.random() < dt * 2) {
        if (this.perched) this.flyTo(world, { kind: "wire", wire: Math.floor(world.random() * 3) });
        else this.startle(world, false);
        return true;
      }
    }
    return false;
  }

  /** Flee if a cat is too close or looks like it means business. Crows hold their ground. */
  private watchCats(dt: number, world: World, nerve: number) {
    for (const cat of world.cats) {
      const d = Math.hypot(cat.x - this.x, (cat.y - this.y) * 1.5);
      const threat = cat.threat;
      const scared =
        this.species === "crow"
          ? (threat >= 1 && d < 36) || d < 8
          : (threat >= 1 && d < 50) || d < 12 || (d < 14 + 30 * threat && world.random() < dt * (1 + 4 * threat) * nerve);
      if (scared) {
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
    const { sprites, colors, half, flap } = this.kind;
    let rows = sprites.sit;
    let lift = 0;
    if (this.state === "fly") rows = Math.floor(t * flap + this.x) % 2 ? sprites.flyUp : sprites.flyDown;
    else if (this.cawing && sprites.caw && Math.floor((this.cawUntil - this.clock) * 6) % 2 === 0) rows = sprites.caw;
    else if (this.state === "ground") {
      if (this.hop > 0) lift = Math.round((this.species === "crow" ? 1 : 2) * Math.sin((this.hop / 0.18) * Math.PI));
      else if (this.clock < this.peckUntil) rows = sprites.peck;
    }
    const painted = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, paint(v)]));
    const left = Math.round(this.x) - half;
    const bottom = Math.round(this.y) - lift;
    sprite(px, rows, left, bottom, painted, this.facing < 0);
    // "Caw!": a couple of little sound marks off the beak.
    if (this.cawing && rows === sprites.caw) {
      const beak = this.facing > 0 ? left + rows[0]!.length + 1 : left - 2;
      const mark = painted.E!;
      px.set(beak, bottom - 6, mark);
      px.set(beak + this.facing, bottom - 7, mark);
      px.set(beak, bottom - 4, mark);
    }
  }
}
