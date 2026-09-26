// The cats: sprites, skins, and a little brain each. A cat picks its next
// activity from its personality plus what's going on around it (birds,
// moths, the other cat, a possum on the wall, time of day), and activities
// chain the way real cat behaviour does: stare → stalk → wiggle → pounce →
// miss → groom like nothing happened.
import { type RGB, hex } from "./color.ts";
import type { Bird } from "./birds.ts";
import type { Moth } from "./critters.ts";
import type { World } from "./life.ts";
import { type Pixels, hash2 } from "./pixels.ts";
import type { Paint } from "./yard.ts";

// ---- Shapes -------------------------------------------------------------------
// All face right. Keys: B patterned fur, L light fur (muzzle, chest, paws),
// A ear, E eye, K dark line (closed eye), N nose, P tongue. "." is empty.

interface Shape {
  rows: string[];
  width: number;
  /** Where the tail joins, and the tail's resting path from there (shape coords). */
  tail?: [number, number][];
  /** Head position, for "z"s and chatter marks. */
  head: [number, number];
}

function shape(rows: string[], head: [number, number], tail?: [number, number][]): Shape {
  const width = Math.max(...rows.map((r) => r.length));
  return { rows: rows.map((r) => r.padEnd(width, ".")), width, head, tail };
}

const SIT_BODY = [
  ".........BBLL.",
  "........BBBLL.",
  ".......BBBBLL.",
  "......BBBBBLL.",
  ".....BBBBBBLL.",
  "....BBBBBBBLL.",
  "....BBBBBBBLL.",
  "...BBBBBBBBLL.",
  "...BBBBBBBLLL.",
  "...LLLLB..LL..",
];
const SIT_TAIL: [number, number][] = [[3, 14], [2, 15], [1, 15], [0, 15], [-1, 14], [-2, 13]];

const SHAPES = {
  sit: shape(
    [".........A..A.", ".........BB.BB", "........BBBBBB", "........BBBBEB", "........BBBBLN", ".........BBLL.", ...SIT_BODY],
    [11, 2],
    SIT_TAIL,
  ),
  lookUp: shape(
    ["........A..A..", "........BB.BB.", "........BBBBBL", "........BBBEBN", "........BBBBL.", ".........BBLL.", ...SIT_BODY],
    [11, 2],
    SIT_TAIL,
  ),
  // Head dipped to lick a raised front paw…
  groomA: shape(
    [
      "..............", "..............", ".........A..A.", ".........BB.BB", "........BBBBBB", "........BBBBKB",
      ".........BBLLN", ".........BBLPL", ".......BBBBLLL", ...SIT_BODY.slice(3, 9), "...LLLLB..L...",
    ],
    [11, 4],
    SIT_TAIL,
  ),
  // …then bobbing back up between licks.
  groomB: shape(
    [
      "..............", ".........A..A.", ".........BB.BB", "........BBBBBB", "........BBBBKB", "........BBBBLN",
      ".........BBLLL", ".........BBLL.", ".......BBBBLL.", ...SIT_BODY.slice(3, 9), "...LLLLB..L...",
    ],
    [11, 3],
    SIT_TAIL,
  ),
  walk: shape(
    [
      "..............A..A..", "..............BB.BB.", ".............BBBBBB.", "...BBBBBBBBBBBBBEBB.",
      "..BBBBBBBBBBBBBBBLLN", "..BBBBBBBBBBBBBBBLL.", "..BBBBBBBBBBBBBBLL..", "...LLLLLLLLLLLLLL...",
      "....................", "....................", "....................",
    ],
    [16, 2],
    [[3, 3], [2, 2], [1, 1], [1, 0], [2, -1], [3, -1]],
  ),
  crouchA: shape(
    [
      "...............A.A..", "..BBBB.........BBBB.", ".BBBBBBBBBBBBBBBBEBB", ".BBBBBBBBBBBBBBBBBLN",
      "..BBBBBBBBBBBBBBBLL.", "..LLLLLLLLLLLLLLLL..", "..BB..........BB....", ".LL..........LL.....",
    ],
    [17, 2],
    [[1, 2], [0, 2], [-1, 2], [-2, 2], [-3, 1], [-4, 1]],
  ),
  crouchB: shape(
    [
      "...............A.A..", "..BBBB.........BBBB.", ".BBBBBBBBBBBBBBBBEBB", ".BBBBBBBBBBBBBBBBBLN",
      "..BBBBBBBBBBBBBBBLL.", "..LLLLLLLLLLLLLLLL..", "...BB..........BB...", "...LL..........LL...",
    ],
    [17, 2],
    [[1, 2], [0, 2], [-1, 2], [-2, 2], [-3, 1], [-4, 1]],
  ),
  pounce: shape(
    [
      ".................A.A..", "................BBBB..", "......BBBBBBBBBBBBEBB.",
      "LL.BBBBBBBBBBBBBBBBBLN", ".LLBBBBBBBBBBBBBBBBLLL", "......LLLLLLLLLLLL.LL.",
    ],
    [18, 2],
    [[4, 2], [3, 1], [2, 1], [1, 0], [0, 0], [-1, 0]],
  ),
  curl: shape(
    ["...BBBBBBBB...", "..BBBBBBBBBBA.", ".BBBBBBBBBBBBA", ".BBBBBBBBBKBBB", ".BBBBBBBBBBLLN", "..BBBBBBBBBBB.", "...BBBBBBBBB.."],
    [10, 1],
  ),
  bellyA: shape(
    ["...L..L.....L..L..", "...B..B.....B..B..", "..BLLLLLLLLLLLLBA.", ".BBLLLLLLLLLLLLBBA", "BBBBBBBBBBBBBBBBKB", ".BBBBBBBBBBBBBBBLN", "..BBBBBBBBBBBBBB.."],
    [16, 3],
    [[0, 4], [-1, 4], [-2, 5], [-3, 5], [-4, 4]],
  ),
  bellyB: shape(
    ["....L..L...L..L...", "...B..B.....B..B..", "..BLLLLLLLLLLLLBA.", ".BBLLLLLLLLLLLLBBA", "BBBBBBBBBBBBBBBBKB", ".BBBBBBBBBBBBBBBLN", "..BBBBBBBBBBBBBB.."],
    [16, 3],
    [[0, 4], [-1, 5], [-2, 5], [-3, 4], [-4, 4]],
  ),
  sideLie: shape(
    ["..............A.A.", "..BBBBBBBBBBBBBBBB", ".BBBBBBBBBBBBBBEBB", ".BBBBBBBBBBBBBBBLN", "..LLLLLLLLLLLLBB..", "...L..L.....L..L.."],
    [15, 1],
    [[1, 2], [0, 3], [-1, 3], [-2, 2], [-3, 2]],
  ),
  // The tabby's hand-drawn loaf, mirrored to face right; other cats get stripes/patches from their pattern.
  loaf: shape(
    [
      "..............A..A..", ".............BB.BA..", ".............BBBBBB.", "..BBBBBBB..BBBBBBB..",
      ".BBBBBBBBBBBBBBBBEBB", "BBBBBBBBBBBBBBBBBBBN", "BBBBBBBBBBBBBBBBBLL.", "BBBBBBBBBBBBBBBBLLL.",
      "BBBBBBBBBBBBBBBBLLL.", "BBBBBBBBBBBBBBBBLL..", ".BBBBBBBBBBBBBBBB...",
    ],
    [17, 3],
  ),
} satisfies Record<string, Shape>;

type ShapeName = keyof typeof SHAPES;

/** Walk-cycle leg x positions (4 legs) per frame, under the walk body. */
const LEGS = [[3, 6, 13, 16], [2, 7, 12, 17], [3, 6, 13, 16], [4, 5, 14, 15]];

// The calico's original front-facing sit, kept exactly as drawn.
const CALICO_FRONT = [
  "..O.........K..",
  "..OO.......KK..",
  "..OPO.....KPK..",
  "..OOOOWWWKKKK..",
  ".OOOWWWWWWWKKK.",
  ".OOWEWWWWWEWKK.",
  ".OWWWWWPWWWWWK.",
  "..WWWWsWsWWWW..",
  "...WWWWWWWWW...",
  "...WWWWWWWWWO..",
  "..WWWWWWWWWOO..",
  "..WWWWWWWWOOO..",
  "..WWWWWWWWWOO..",
  "..sWWWWWWWWWs..",
  "..sWWKKWWWWWs..",
  "...WW.WWW.WW...",
];

// ---- Skins & personalities -------------------------------------------------------

interface Skin {
  fur: RGB;
  dark: RGB;
  accent: RGB;
  light: RGB;
  ear: RGB;
  eye: RGB;
  nose: RGB;
  tongue: RGB;
  /** Colour of patterned fur at shape-local (x, y). */
  pattern: (x: number, y: number) => "fur" | "dark" | "accent";
  /** Colour of the i-th tail pixel out of n. */
  tail: (i: number, n: number) => "fur" | "dark" | "accent";
}

export interface Personality {
  name: string;
  /** Walking speed, px/s. */
  speed: number;
  energy: number;
  hunt: number;
  sleepy: number;
  groom: number;
  /** Idle pose it favours. */
  idle: "front" | "loaf";
}

const SKINS: Record<string, Skin> = {
  calico: {
    fur: hex("#f4f0e8"), dark: hex("#2e2a28"), accent: hex("#e0883a"), light: hex("#f4f0e8"),
    ear: hex("#e0883a"), eye: hex("#3e4a26"), nose: hex("#e89a9a"), tongue: hex("#e8707e"),
    pattern: (x, y) => {
      const v = hash2(Math.floor((x + 1) / 4), Math.floor((y + 2) / 4), 17);
      return v < 0.28 ? "accent" : v > 0.8 ? "dark" : "fur";
    },
    tail: (i, n) => (i >= n - 1 ? "dark" : "accent"),
  },
  tabby: {
    fur: hex("#8e8e94"), dark: hex("#5c5c64"), accent: hex("#8e8e94"), light: hex("#c8c8ce"),
    ear: hex("#5c5c64"), eye: hex("#d0e050"), nose: hex("#d99a9a"), tongue: hex("#e8707e"),
    pattern: (x, y) => ((x + Math.floor(y / 3)) % 4 === 0 ? "dark" : "fur"),
    tail: (i) => (i % 2 ? "dark" : "fur"),
  },
};

// The tabby's original loaf (facing left), kept exactly as drawn.
const TABBY_LOAF = [
  "..D..D..............",
  "..DG.DG.............",
  ".GGDGGG.............",
  ".GDGDGG..GGGDGGGDG..",
  "GGEGGGGGDGGGDGGGDGG.",
  "PGGGGGGGDGGGDGGGDGGG",
  ".LLGGGGGDGGGDGGGDGGG",
  ".LLLGGGGDGGGDGGGDGGG",
  ".LLLGGGGGDGGGDGGGDGG",
  "..LLGGGGGDGGGDGGGDGG",
  "...TTDTTTDTTTDTTTTT.",
];
const TABBY_COLORS = { G: hex("#8e8e94"), D: hex("#5c5c64"), L: hex("#c8c8ce"), P: hex("#d99a9a"), E: hex("#d0e050"), T: hex("#7a7a82") };

const CALICO_COLORS = { W: hex("#f4f0e8"), s: hex("#cfc9bd"), O: hex("#e0883a"), K: hex("#2e2a28"), P: hex("#e89a9a"), E: hex("#3e4a26") };
const SHADOW = hex("#34522a");
const DUST = hex("#b89a72");
const Z_COLOR = hex("#f0ece0");

export const PERSONALITIES: Record<"calico" | "tabby", Personality> = {
  calico: { name: "calico", speed: 15, energy: 0.8, hunt: 0.9, sleepy: 0.35, groom: 0.7, idle: "front" },
  tabby: { name: "tabby", speed: 11, energy: 0.45, hunt: 0.55, sleepy: 0.85, groom: 0.9, idle: "loaf" },
};

// ---- Activities -----------------------------------------------------------------

type Activity =
  | { kind: "sit"; pose: "front" | "side"; until: number }
  | { kind: "loaf"; until: number }
  | { kind: "groom"; until: number }
  | { kind: "walk"; x: number; y: number; gait: "walk" | "trot" | "stalk"; then: (() => void) | null }
  | { kind: "sleep"; until: number; belly: boolean }
  | { kind: "roll"; until: number }
  | { kind: "stare"; at: () => { x: number; y: number } | null; until: number; chatter: boolean }
  | { kind: "wiggle"; bird: Bird; until: number }
  | { kind: "leap"; x0: number; y0: number; x1: number; y1: number; height: number; dur: number; then: () => void }
  | { kind: "bat"; moth: Moth; until: number }
  | { kind: "fight"; other: Cat; until: number; leader: boolean };

export class Cat {
  x: number;
  y: number;
  /** Height above the ground (jumps). */
  z = 0;
  facing = 1;
  activity: Activity;
  private clock = 0;
  private step = 0;
  private sensed = 0;
  private skin: Skin;
  private noticedPossum = false;
  /** Runs when a timed activity ends; defaults to picking something new. */
  private activityThen: (() => void) | null = null;

  constructor(
    readonly persona: Personality,
    x: number,
    y: number,
    private world: World,
  ) {
    this.skin = SKINS[persona.name]!;
    this.x = x;
    this.y = y;
    this.activity = persona.idle === "front" ? { kind: "sit", pose: "front", until: 6 } : { kind: "loaf", until: 8 };
  }

  get asleep() {
    return this.activity.kind === "sleep";
  }

  get busy() {
    const k = this.activity.kind;
    return k === "fight" || k === "leap" || k === "wiggle";
  }

  /** How alarming this cat looks to a bird: 0 calm … 1 about to pounce. */
  get threat(): number {
    const a = this.activity;
    if (a.kind === "leap" || a.kind === "wiggle") return 1;
    if (a.kind === "walk") return a.gait === "stalk" ? 0.6 : a.gait === "trot" ? 0.8 : 0.5;
    if (a.kind === "sleep" || a.kind === "loaf") return 0;
    return 0.25;
  }

  // ---- Choosing what to do ----

  private set(activity: Activity) {
    this.activity = activity;
    this.clock = 0;
    this.activityThen = null;
  }

  private rand(min: number, max: number) {
    return min + this.world.random() * (max - min);
  }

  private walkTo(x: number, y: number, gait: "walk" | "trot" | "stalk", then: (() => void) | null) {
    const b = this.world.bounds;
    this.set({ kind: "walk", x: clamp(x, b.left, b.right), y: clamp(y, b.top, b.bottom), gait, then });
  }

  private sit(pose?: "front" | "side") {
    const p = pose ?? (this.persona.idle === "front" && this.world.random() < 0.6 ? "front" : "side");
    this.set({ kind: "sit", pose: p, until: this.rand(3, 8) });
  }

  private groom() {
    this.set({ kind: "groom", until: this.rand(3, 7) });
  }

  choose() {
    const w = this.world;
    const night = w.light < 0.25;
    const day = w.light > 0.6;
    const p = this.persona;
    const other = w.cats.find((c) => c !== this);
    const groundBird = w.birds.find((b) => b.onGround);
    const wireBird = w.birds.find((b) => b.perched);
    const moth = w.moths[0];

    const options: [number, () => void][] = [
      [1, () => this.sit()],
      [1.3 * p.energy, () => this.wander()],
      [0.9 * p.groom, () => this.groom()],
      [0.9 * p.sleepy, () => this.set({ kind: "loaf", until: this.rand(6, 16) })],
      [p.sleepy * (night ? 1.8 : day ? 0.8 : 0.5), () => this.goSleep()],
      [p.energy * (day ? 0.7 : 0.2), () => this.goRoll()],
      [groundBird ? p.hunt * 3 : 0, () => this.stalk(groundBird!)],
      [wireBird ? p.hunt * 1.3 : 0, () => this.watchBird(wireBird!)],
      [moth ? p.hunt * 2.4 : 0, () => this.chaseMoth(moth!)],
      [other && !other.busy && !other.asleep ? p.energy * 0.6 : other?.asleep ? p.energy * 0.12 : 0, () => this.pickFight(other!)],
    ];
    let total = 0;
    for (const [weight] of options) total += weight;
    let r = w.random() * total;
    for (const [weight, act] of options) {
      r -= weight;
      if (r <= 0) return act();
    }
    this.sit();
  }

  private wander() {
    const b = this.world.bounds;
    this.walkTo(this.rand(b.left, b.right), this.rand(b.top, b.bottom), "walk", null);
  }

  private goSleep() {
    const spot = this.world.spots.nap[this.persona.name === "tabby" ? 0 : 1]!;
    this.walkTo(spot.x + this.rand(-6, 6), spot.y + this.rand(-2, 2), "walk", () => {
      const relaxed = this.world.random() < 0.45;
      this.set({ kind: "sleep", until: this.rand(15, 40), belly: relaxed });
    });
  }

  private goRoll() {
    const dirt = this.world.spots.dirt;
    this.walkTo(dirt.x + this.rand(-5, 5), dirt.y, "walk", () => this.set({ kind: "roll", until: this.rand(3, 6) }));
  }

  private watchBird(bird: Bird) {
    // Sit near the back of the yard under the bird and stare up at it, chattering.
    const b = this.world.bounds;
    this.walkTo(bird.x + this.rand(-14, 14), b.top + this.rand(2, 10), "walk", () =>
      this.set({ kind: "stare", at: () => (bird.perched ? bird : null), until: this.rand(5, 12), chatter: true }),
    );
  }

  private stalk(bird: Bird) {
    const side = this.x < bird.x ? -1 : 1;
    this.walkTo(bird.x + side * 18, bird.y, "stalk", () => {
      if (!bird.onGround) return this.afterMiss(bird);
      this.facing = bird.x > this.x ? 1 : -1;
      this.set({ kind: "wiggle", bird, until: this.rand(0.6, 1.3) });
    });
  }

  private pounce(bird: Bird) {
    bird.startle(this.world, true);
    this.set({
      kind: "leap", x0: this.x, y0: this.y, x1: bird.x - this.facing * 4, y1: bird.y, height: 9, dur: 0.45,
      then: () => {
        this.world.dust(this.x, this.y, 5);
        // Chase a couple of bounds after it, then pretend it never happened.
        const x = this.x + this.facing * 16;
        this.set({
          kind: "leap", x0: this.x, y0: this.y, x1: x, y1: this.y, height: 6, dur: 0.35,
          then: () => this.afterMiss(bird),
        });
      },
    });
  }

  private afterMiss(bird: Bird) {
    this.set({ kind: "stare", at: () => (bird.gone ? null : bird), until: this.rand(2, 4), chatter: false });
    this.activityThen = () => this.groom();
  }

  private chaseMoth(moth: Moth) {
    this.walkTo(moth.x, clamp(this.y, this.world.bounds.top, this.world.bounds.bottom), "trot", () =>
      this.set({ kind: "bat", moth, until: this.rand(4, 9) }),
    );
  }

  private pickFight(other: Cat) {
    this.walkTo(other.x - Math.sign(other.x - this.x || 1) * 8, other.y, "trot", () => {
      if (other.busy || Math.hypot(other.x - this.x, other.y - this.y) > 14) return this.sit();
      const until = this.rand(2.5, 4.5);
      this.set({ kind: "fight", other, until, leader: true });
      other.joinFight(this, until);
    });
  }

  joinFight(other: Cat, until: number) {
    this.z = 0;
    this.set({ kind: "fight", other, until, leader: false });
  }

  /** Something interesting appeared; maybe drop what we're doing. */
  private react() {
    const w = this.world;
    const a = this.activity;
    if (this.busy || a.kind === "bat") return;

    if (w.possum && !this.noticedPossum) {
      this.noticedPossum = true;
      if (a.kind !== "sleep" || w.random() < 0.4) {
        const possum = w.possum;
        this.set({ kind: "stare", at: () => (possum.gone ? null : { x: possum.x, y: w.wallTop }), until: 30, chatter: false });
        this.activityThen = () => this.sit("side");
      }
      return;
    }
    if (!w.possum) this.noticedPossum = false;

    const calm = a.kind === "sit" || a.kind === "loaf" || a.kind === "groom" || (a.kind === "walk" && a.gait === "walk" && !a.then);
    if (!calm) return;
    const bird = w.birds.find((b) => b.onGround && Math.abs(b.x - this.x) < 90);
    if (bird && w.random() < this.persona.hunt * 0.7) return this.stalk(bird);
    const moth = w.moths.find((m) => Math.abs(m.x - this.x) < 50);
    if (moth && w.random() < this.persona.hunt * 0.5) this.chaseMoth(moth);
  }

  private finish() {
    const next = this.activityThen;
    this.activityThen = null;
    if (next) next();
    else this.choose();
  }

  // ---- Simulation ----

  update(dt: number) {
    this.clock += dt;
    this.sensed += dt;
    if (this.sensed > 1) {
      this.sensed = 0;
      this.react();
    }
    const a = this.activity;
    switch (a.kind) {
      case "sit":
      case "loaf":
      case "groom":
      case "roll":
        if (a.kind === "roll" && this.world.random() < dt * 4) this.world.dust(this.x + this.rand(-6, 6), this.y, 1);
        if (this.clock > a.until) this.finish();
        break;
      case "sleep":
        if (this.clock > a.until || (this.world.light > 0.7 && this.persona.sleepy < 0.5 && this.clock > 10)) this.finish();
        break;
      case "walk": {
        const speed = this.persona.speed * (a.gait === "trot" ? 2.2 : a.gait === "stalk" ? 0.4 : 1);
        const dx = a.x - this.x;
        const dy = a.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
          this.x = a.x;
          this.y = a.y;
          if (a.then) a.then();
          else this.sit();
          break;
        }
        const move = Math.min(dist, speed * dt);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
        this.step += move;
        if (Math.abs(dx) > 0.5) this.facing = dx > 0 ? 1 : -1;
        break;
      }
      case "stare": {
        const target = a.at();
        if (target && Math.abs(target.x - this.x) > 2) this.facing = target.x > this.x ? 1 : -1;
        if (!target || this.clock > a.until) this.finish();
        break;
      }
      case "wiggle":
        if (!a.bird.onGround) this.afterMiss(a.bird);
        else if (this.clock > a.until) this.pounce(a.bird);
        break;
      case "leap": {
        const u = Math.min(1, this.clock / a.dur);
        this.x = a.x0 + (a.x1 - a.x0) * u;
        this.y = a.y0 + (a.y1 - a.y0) * u;
        this.z = a.height * 4 * u * (1 - u);
        if (u >= 1) {
          this.z = 0;
          a.then();
        }
        break;
      }
      case "bat": {
        const m = a.moth;
        if (m.gone || this.clock > a.until) {
          this.z = 0;
          if (m.gone) this.sit(this.persona.idle === "front" ? "front" : "side"); // proud
          else this.groom();
          break;
        }
        const dx = m.x - this.x;
        if (Math.abs(dx) > 3) {
          this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.persona.speed * 1.6 * dt);
          this.facing = dx > 0 ? 1 : -1;
        }
        // Hop and swat whenever it dips within reach.
        const hopT = this.clock % 0.9;
        const reach = this.y - 14 - m.y;
        this.z = reach < 16 && Math.abs(dx) < 10 ? Math.max(0, 7 * Math.sin((hopT / 0.5) * Math.PI)) * (hopT < 0.5 ? 1 : 0) : 0;
        if (this.z > 5 && Math.abs(dx) < 4 && reach < 8 && this.world.random() < dt * 0.8) m.catch();
        break;
      }
      case "fight":
        if (a.leader && this.world.random() < dt * 6) this.world.dust(this.x + this.rand(-8, 8), this.y, 1);
        if (this.clock > a.until) {
          // Spring apart, then groom as if nothing happened.
          this.x += a.leader ? -9 : 9;
          this.facing = a.leader ? -1 : 1;
          this.x = clamp(this.x, this.world.bounds.left, this.world.bounds.right);
          this.groom();
        }
        break;
    }
    // Whatever happened, stay in the yard.
    const b = this.world.bounds;
    this.x = clamp(this.x, b.left, b.right);
    this.y = clamp(this.y, b.top, b.bottom);
  }

  // ---- Drawing ----

  /** Where the cat's head is, in screen pixels (for effects). */
  private headAt(s: Shape): [number, number] {
    const left = Math.round(this.x - s.width / 2);
    const top = Math.round(this.y - this.z) - s.rows.length;
    const hx = this.facing > 0 ? s.head[0] : s.width - 1 - s.head[0];
    return [left + hx, top + s.head[1]];
  }

  private pose(t: number): {
    shape: Shape;
    closed: boolean;
    tongue?: boolean;
    legs?: number[];
    frontSit?: boolean;
    tabbyLoaf?: boolean;
  } {
    const a = this.activity;
    const blink = (t + this.x) % 4.7 < 0.15;
    switch (a.kind) {
      case "sit":
        if (a.pose === "front" && this.persona.name === "calico") return { shape: SHAPES.sit, closed: blink, frontSit: true };
        return { shape: SHAPES.sit, closed: blink };
      case "loaf":
        return { shape: SHAPES.loaf, closed: blink || this.clock > 6, tabbyLoaf: this.persona.name === "tabby" };
      case "groom":
        return { shape: Math.floor(t * 3) % 2 ? SHAPES.groomA : SHAPES.groomB, closed: true, tongue: true };
      case "walk": {
        if (a.gait === "stalk") return { shape: Math.floor(this.step / 1.5) % 2 ? SHAPES.crouchA : SHAPES.crouchB, closed: false };
        const frame = Math.floor(this.step / (a.gait === "trot" ? 3 : 2.5)) % 4;
        return { shape: SHAPES.walk, closed: false, legs: LEGS[frame] };
      }
      case "sleep":
        return { shape: a.belly && this.clock > 5 ? SHAPES.bellyA : SHAPES.curl, closed: true };
      case "roll": {
        const f = Math.floor(this.clock * 4) % 4;
        return { shape: f === 0 || f === 2 ? SHAPES.sideLie : f === 1 ? SHAPES.bellyA : SHAPES.bellyB, closed: false };
      }
      case "stare":
        return { shape: SHAPES.lookUp, closed: false };
      case "wiggle":
        return { shape: SHAPES.crouchB, closed: false };
      case "leap":
        return { shape: SHAPES.pounce, closed: false };
      case "bat":
        return { shape: this.z > 1 ? SHAPES.pounce : SHAPES.lookUp, closed: false };
      case "fight":
        return { shape: SHAPES.curl, closed: true };
    }
  }

  /** A depth-sorted drawable for the yard, or null while hidden in a fight cloud. */
  drawable(paint: Paint, t: number): { depth: number; draw: (px: Pixels) => void } | null {
    const a = this.activity;
    if (a.kind === "fight") {
      if (!a.leader) return null;
      return { depth: (this.y + a.other.y) / 2, draw: (px) => this.drawFight(px, paint, t, a.other) };
    }
    return { depth: this.y, draw: (px) => this.draw(px, paint, t) };
  }

  private draw(px: Pixels, paint: Paint, t: number) {
    const pose = this.pose(t);
    const s = pose.shape;
    const shadowW = Math.round(s.width * 0.35);
    px.rect(Math.round(this.x) - shadowW, Math.round(this.y) - 1, shadowW * 2 + 1, 2, paint(SHADOW));

    if (pose.frontSit) return this.drawFront(px, paint, t, pose.closed);
    if (pose.tabbyLoaf) return this.drawTabbyLoaf(px, paint, t, pose.closed);

    const skin = this.skin;
    const colors = {
      fur: paint(skin.fur), dark: paint(skin.dark), accent: paint(skin.accent), light: paint(skin.light),
      ear: paint(skin.ear), eye: paint(skin.eye), nose: paint(skin.nose), tongue: paint(skin.tongue),
    };
    const left = Math.round(this.x - s.width / 2);
    const bottom = Math.round(this.y - this.z);
    const top = bottom - s.rows.length;
    const flip = this.facing < 0;
    const col = (c: number) => (flip ? s.width - 1 - c : c);

    // Tail first, so the body overlaps its root.
    if (s.tail) {
      const a = this.activity;
      const twitch = a.kind === "stare" || a.kind === "wiggle" ? Math.sin(t * 14) : Math.sin(t * 2 + this.x * 0.1);
      const n = s.tail.length;
      let prev: [number, number] | null = null;
      s.tail.forEach(([tx, ty], i) => {
        const sway = i >= n - 2 ? Math.round(twitch * (i - n + 3)) : 0;
        const x = left + col(tx);
        const y = top + ty + (a.kind === "walk" ? 0 : sway);
        const colorKey = skin.tail(i, n);
        if (prev) px.line(prev[0], prev[1], x + (a.kind === "walk" ? sway * (flip ? -1 : 1) : 0), y, colors[colorKey]);
        prev = [x + (a.kind === "walk" ? sway * (flip ? -1 : 1) : 0), y];
      });
    }

    s.rows.forEach((row, r) => {
      for (let c = 0; c < s.width; c++) {
        const key = row[c]!;
        if (key === ".") continue;
        let color: number;
        if (key === "B") color = colors[skin.pattern(c, r)];
        else if (key === "L") color = colors.light;
        else if (key === "A") color = colors.ear;
        else if (key === "E") color = pose.closed ? colors.dark : colors.eye;
        else if (key === "K") color = colors.dark;
        else if (key === "N") color = colors.nose;
        else color = pose.tongue ? colors.tongue : colors.light;
        px.set(left + col(c), top + r, color);
      }
    });

    if (pose.legs) {
      for (const lx of pose.legs) {
        px.rect(left + col(lx), top + 8, 1, 2, colors[skin.pattern(lx, 8)]);
        px.set(left + col(lx), top + 10, colors.light);
      }
    }

    const [hx, hy] = this.headAt(s);
    const a = this.activity;
    if (a.kind === "sleep") this.drawZ(px, paint, t, hx, hy);
    if (a.kind === "stare" && a.chatter && Math.floor(t * 8) % 2) {
      // Chattering at the bird: little marks by the mouth.
      const mx = hx + this.facing * 4;
      px.set(mx, hy - 1, colors.light);
      px.set(mx + this.facing, hy - 2, colors.light);
    }
  }

  private drawFront(px: Pixels, paint: Paint, t: number, closed: boolean) {
    const colors = Object.fromEntries(Object.entries(CALICO_COLORS).map(([k, v]) => [k, paint(v)])) as Record<string, number>;
    const x = Math.round(this.x) - 7;
    const base = Math.round(this.y);
    const swish = Math.sin(t * 1.7);
    const tail = colors.O!;
    px.line(x + 11, base - 2, x + 16, base - 3, tail);
    px.line(x + 16, base - 3, x + 17 + Math.round(swish), base - 8, tail);
    px.line(x + 17 + Math.round(swish), base - 8, x + 16 + Math.round(swish * 2.5), base - 12, tail);
    px.line(x + 12, base - 1, x + 16, base - 2, tail);
    const top = base - CALICO_FRONT.length;
    CALICO_FRONT.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const key = row[c]!;
        if (key === ".") continue;
        px.set(x + c, top + r, key === "E" && closed ? colors.s! : colors[key]!);
      }
    });
  }

  private drawTabbyLoaf(px: Pixels, paint: Paint, t: number, closed: boolean) {
    const colors = Object.fromEntries(Object.entries(TABBY_COLORS).map(([k, v]) => [k, paint(v)])) as Record<string, number>;
    const width = TABBY_LOAF[0]!.length;
    const x = Math.round(this.x) - width / 2;
    const base = Math.round(this.y);
    const flip = this.facing > 0; // drawn facing left
    const top = base - TABBY_LOAF.length;
    TABBY_LOAF.forEach((row, r) => {
      for (let c = 0; c < width; c++) {
        const key = row[flip ? width - 1 - c : c]!;
        if (key !== ".") px.set(x + c, top + r, key === "E" && closed ? colors.D! : colors[key]!);
      }
    });
    const at = (c: number) => x + (flip ? width - 1 - c : c);
    if (!closed && Math.sin(t * 1.3 + this.y) > 0.6) px.rect(Math.min(at(1), at(2)), base - 3, 2, 1, colors.T!); // tail flick
    if (!closed && (t + this.y) % 7 < 0.3) px.set(at(2), base - 11, colors.G!); // ear twitch
  }

  private drawZ(px: Pixels, paint: Paint, t: number, hx: number, hy: number) {
    const phase = (t * 0.45 + this.x * 0.01) % 1;
    const zx = Math.round(hx + this.facing * (2 + phase * 5));
    const zy = Math.round(hy - 4 - phase * 10);
    const z = paint(Z_COLOR);
    px.rect(zx, zy, 3, 1, z);
    px.set(zx + 1, zy + 1, z);
    px.rect(zx, zy + 2, 3, 1, z);
  }

  private drawFight(px: Pixels, paint: Paint, t: number, other: Cat) {
    const cx = Math.round((this.x + other.x) / 2 + Math.sin(t * 9) * 2);
    const cy = Math.round((this.y + other.y) / 2) - 8;
    const dust = paint(DUST);
    const light = paint(hex("#d8c4a0"));
    const shadowW = 10;
    px.rect(cx - shadowW, Math.round((this.y + other.y) / 2) - 1, shadowW * 2 + 1, 2, paint(SHADOW));
    // Billowing cloud.
    for (let y = -9; y <= 9; y++) {
      for (let x = -13; x <= 13; x++) {
        const angle = Math.atan2(y, x);
        const r = 10 + 1.6 * Math.sin(angle * 5 + t * 18) + 1.2 * Math.sin(angle * 3 - t * 11);
        const d = Math.hypot(x, y / 0.72);
        if (d < r) px.set(cx + x, cy + y, d > r - 1.5 || hash2(x, y, Math.floor(t * 10)) < 0.08 ? dust : light);
      }
    }
    // Paws, tails and ears poking out, reshuffled ten times a second.
    const tick = Math.floor(t * 10);
    const cats: Cat[] = [this, other];
    for (let i = 0; i < 5; i++) {
      const who = cats[i % 2]!;
      const skin = who.skin;
      const angle = hash2(i, tick, 3) * Math.PI * 2;
      const ex = cx + Math.round(Math.cos(angle) * 12);
      const ey = cy + Math.round(Math.sin(angle) * 8);
      const kind = Math.floor(hash2(i, tick, 4) * 3);
      if (kind === 0) {
        px.rect(ex, ey, 2, 2, paint(skin.light)); // paw
      } else if (kind === 1) {
        px.line(ex, ey, ex + Math.round(Math.cos(angle) * 4), ey + Math.round(Math.sin(angle) * 3), paint(skin.accent === skin.fur ? skin.dark : skin.accent)); // tail
      } else {
        px.set(ex, ey, paint(skin.ear));
        px.set(ex + 1, ey + 1, paint(skin.ear)); // ear
      }
    }
    if (tick % 3 === 0) px.set(cx + Math.round(Math.sin(t * 7) * 6), cy - 11, paint(Z_COLOR)); // impact spark
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
