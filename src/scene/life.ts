// Everything alive in the scene: two cats, a few sparrows, moths after dark,
// and a rare possum. Life owns the shared world state the actors read, spawns
// and retires visitors, and sorts actors into the right draw layer.
import { Helicopter, Plane } from "./aircraft.ts";
import { Bird } from "./birds.ts";
import { Cat, PERSONALITIES } from "./cats.ts";
import { hex } from "./color.ts";
import { Butterfly, type Flower, Moth, Possum } from "./critters.ts";
import type { Pixels } from "./pixels.ts";
import type { Paint, Tuft } from "./yard.ts";

interface Point {
  x: number;
  y: number;
}

/** What the actors can see of the world. */
export interface World {
  readonly width: number;
  readonly height: number;
  readonly horizon: number;
  readonly wallTop: number;
  /** Where cats (and grounded birds) can be. */
  readonly bounds: { left: number; right: number; top: number; bottom: number };
  readonly spots: { nap: Point[]; dirt: Point; gate: Point };
  /** Long grass the tabby grazes on. */
  readonly tufts: Tuft[];
  readonly random: () => number;
  /** Sky light, 0 night … 1 full day. */
  readonly light: number;
  readonly cats: Cat[];
  readonly birds: Bird[];
  readonly moths: Moth[];
  readonly butterflies: Butterfly[];
  readonly possum: Possum | null;
  readonly helicopter: Helicopter | null;
  wireAt(wire: number, x: number): number;
  dust(x: number, y: number, count: number): void;
}

export interface Geometry {
  width: number;
  height: number;
  horizon: number;
  wallTop: number;
  yardTop: number;
  yardBottom: number;
  wireAt: (wire: number, x: number) => number;
  spots: { calico: Point; tabby: Point; nap: Point[]; dirt: Point; gate: Point };
  /** Where butterflies land. */
  flowers: Flower[];
  tufts: Tuft[];
}

export interface LifeOptions {
  random?: () => number;
  /** Send a possum over the wall within a few seconds (for previews). */
  possumSoon?: boolean;
  /** Same for a plane overhead, the LAPD helicopter, and a crow. */
  planeSoon?: boolean;
  crowSoon?: boolean;
  helicopterSoon?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const DUST = hex("#b89a72");

export class Life implements World {
  width: number;
  height: number;
  horizon: number;
  wallTop: number;
  bounds: World["bounds"];
  spots: World["spots"];
  readonly random: () => number;
  wireAt: (wire: number, x: number) => number;
  light = 1;
  cats: Cat[];
  birds: Bird[] = [];
  moths: Moth[] = [];
  butterflies: Butterfly[] = [];
  flowers: Flower[];
  tufts: Tuft[];
  possum: Possum | null = null;
  plane: Plane | null = null;
  helicopter: Helicopter | null = null;
  private particles: Particle[] = [];
  private possumCooldown: number;
  private possumSoon: boolean;
  private crowSoon: boolean;
  private planeCooldown: number;
  private helicopterCooldown: number;

  constructor(geo: Geometry, light: number, options: LifeOptions = {}) {
    this.width = geo.width;
    this.height = geo.height;
    this.horizon = geo.horizon;
    this.wallTop = geo.wallTop;
    this.wireAt = geo.wireAt;
    this.random = options.random ?? Math.random;
    this.bounds = { left: 10, right: geo.width - 10, top: geo.yardTop + 9, bottom: geo.yardBottom - 1 };
    this.spots = { nap: geo.spots.nap, dirt: geo.spots.dirt, gate: geo.spots.gate };
    this.flowers = geo.flowers;
    this.tufts = geo.tufts;
    this.light = light;
    this.possumSoon = !!options.possumSoon;
    this.crowSoon = !!options.crowSoon;
    this.possumCooldown = this.possumSoon ? 3 : 45;
    // Early enough that most visits see a plane; the helicopter takes longer to turn up.
    this.planeCooldown = options.planeSoon ? 1 : 8 + this.random() * 12;
    this.helicopterCooldown = options.helicopterSoon ? 1 : 40 + this.random() * 40;
    this.cats = [
      new Cat(PERSONALITIES.calico, geo.spots.calico.x, geo.spots.calico.y, this),
      new Cat(PERSONALITIES.tabby, geo.spots.tabby.x, geo.spots.tabby.y, this),
    ];
    // Start the scene already populated for the time of day.
    if (light > 0.3) for (let i = 0; i < 3; i++) this.birds.push(Bird.perchedOnWire(this));
    if (light < 0.35) for (let i = 0; i < 2; i++) this.spawnMoth();
    if (light > 0.45) this.butterflies.push(new Butterfly(this, this.flowers));
  }

  /**
   * The screen changed shape (rotation, resize): carry everyone over to the new
   * layout in proportion instead of starting the story again.
   */
  resize(geo: Geometry) {
    const sx = geo.width / this.width;
    const from = this.bounds;
    const to = { left: 10, right: geo.width - 10, top: geo.yardTop + 9, bottom: geo.yardBottom - 1 };
    const mapY = (y: number) => to.top + ((y - from.top) / Math.max(1, from.bottom - from.top)) * (to.bottom - to.top);
    const oldHorizon = this.horizon;

    this.width = geo.width;
    this.height = geo.height;
    this.horizon = geo.horizon;
    this.wallTop = geo.wallTop;
    this.wireAt = geo.wireAt;
    this.bounds = to;
    this.spots = { nap: geo.spots.nap, dirt: geo.spots.dirt, gate: geo.spots.gate };
    this.tufts = geo.tufts;

    for (const cat of this.cats) {
      cat.x = Math.min(to.right, Math.max(to.left, cat.x * sx));
      cat.y = Math.min(to.bottom, Math.max(to.top, mapY(cat.y)));
      // Anything heading for a spot in the old layout needs a new plan.
      if (cat.activity.kind === "walk" || cat.activity.kind === "leap") {
        cat.z = 0;
        cat.choose();
      }
    }
    for (const bird of this.birds) bird.rescale(this, sx, mapY);
    for (const moth of this.moths) {
      moth.x *= sx;
      moth.y = mapY(moth.y);
    }
    this.flowers = geo.flowers;
    for (const butterfly of this.butterflies) {
      butterfly.x *= sx;
      butterfly.gy = mapY(butterfly.gy);
    }
    if (this.possum) this.possum.x *= sx;
    const sy = geo.horizon / Math.max(1, oldHorizon);
    if (this.plane) {
      this.plane.x *= sx;
      this.plane.y *= sy;
    }
    this.helicopter?.rescale(sx, sy);
    this.particles = [];
  }

  dust(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (this.random() - 0.5) * 4, y: y - 1,
        vx: (this.random() - 0.5) * 16, vy: -4 - this.random() * 8, life: 0.4 + this.random() * 0.4,
      });
    }
  }

  private spawnMoth() {
    this.moths.push(new Moth(8 + this.random() * (this.width - 16), this.wallTop - 10 - this.random() * 20, this.random));
  }

  update(dt: number, light: number) {
    this.light = light;
    const r = this.random;

    const birdTarget = light > 0.3 ? 4 : 0;
    const sparrows = this.birds.filter((b) => b.species === "sparrow").length;
    if (sparrows < birdTarget && r() < dt / 5) this.birds.push(Bird.arrive(this));
    // Now and then, one big crow.
    if (light > 0.3 && !this.birds.some((b) => b.species === "crow") && r() < dt / (this.crowSoon ? 0.5 : 90)) {
      this.birds.push(Bird.arrive(this, "crow"));
      this.crowSoon = false;
    }
    const mothTarget = light < 0.35 ? 3 : 0;
    if (this.moths.length < mothTarget && r() < dt / 3) this.spawnMoth();
    // A butterfly or two drifting through by day.
    if (light > 0.45 && this.butterflies.length < 1 && r() < dt / 40) this.butterflies.push(new Butterfly(this, this.flowers));

    // Possums: night only, rare (about one every four minutes, never back to back).
    this.possumCooldown -= dt;
    if (!this.possum && this.possumCooldown <= 0 && (this.possumSoon || (light < 0.15 && r() < dt / 240))) {
      this.possum = new Possum(this);
      this.possumSoon = false;
    }

    // Planes: about one a minute. The helicopter: every few minutes, more often after dark.
    this.planeCooldown -= dt;
    if (!this.plane && this.planeCooldown <= 0) this.plane = new Plane(this);
    this.helicopterCooldown -= dt;
    if (!this.helicopter && this.helicopterCooldown <= 0) this.helicopter = new Helicopter(this);

    // Nibbled grass grows back over a few minutes.
    for (const tuft of this.tufts) tuft.length = Math.min(1, tuft.length + dt * 0.003);

    for (const cat of this.cats) cat.update(dt);
    for (const bird of this.birds) bird.update(dt, this);
    for (const moth of this.moths) moth.update(dt, this);
    for (const butterfly of this.butterflies) butterfly.update(dt, this, this.flowers);
    this.possum?.update(dt, this);
    this.plane?.update(dt, this);
    this.helicopter?.update(dt, this);
    if (this.plane?.gone) {
      this.plane = null;
      this.planeCooldown = 25 + r() * 60;
    }
    if (this.helicopter?.gone) {
      this.helicopter = null;
      this.helicopterCooldown = (light < 0.25 ? 90 : 180) + r() * 120;
    }

    this.birds = this.birds.filter((b) => !b.gone);
    this.moths = this.moths.filter((m) => !m.gone);
    this.butterflies = this.butterflies.filter((b) => !b.gone);
    if (this.possum?.gone) {
      this.possum = null;
      this.possumCooldown = 300;
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---- Layers, back to front ----

  /** Planes: far off, up with the clouds (behind palms and downtown). */
  drawHigh(px: Pixels, paint: Paint, t: number) {
    this.plane?.draw(px, paint, t, this.light);
  }

  /** The helicopter: over the neighbourhood, in front of the palms and wires. */
  drawAir(px: Pixels, paint: Paint, t: number) {
    this.helicopter?.draw(px, paint, t);
  }

  /** The searchlight, over everything it lights up. */
  drawBeam(px: Pixels) {
    this.helicopter?.drawBeam(px, this.light);
  }

  /** Birds on the wires or flying above the wall line, lit like the background. */
  drawBack(px: Pixels, paint: Paint, t: number) {
    for (const bird of this.birds) {
      if (bird.layer === "back" || (bird.layer === "front" && bird.y < this.wallTop)) bird.draw(px, paint, t);
    }
  }

  /** On top of the wall: the possum and any perched birds. */
  drawWall(px: Pixels, paint: Paint, t: number) {
    this.possum?.draw(px, paint, t, this.wallTop);
    for (const bird of this.birds) if (bird.layer === "wall") bird.draw(px, paint, t);
  }

  /** Cats and grounded birds, to be depth-sorted with the yard's plants. */
  yardDrawables(paint: Paint, t: number): { depth: number; draw: (px: Pixels) => void }[] {
    const out: { depth: number; draw: (px: Pixels) => void }[] = [];
    for (const cat of this.cats) {
      const d = cat.drawable(paint, t);
      if (d) out.push(d);
    }
    for (const bird of this.birds) {
      if (bird.layer === "yard") out.push({ depth: bird.y, draw: (px) => bird.draw(px, paint, t) });
    }
    // Butterflies sort by the ground under them, so they flit behind and in front of things.
    for (const butterfly of this.butterflies) out.push({ depth: butterfly.gy, draw: (px) => butterfly.draw(px, paint, t) });
    return out;
  }

  /** Moths, low-flying birds and dust, over everything. */
  drawFront(px: Pixels, paint: Paint, t: number) {
    for (const bird of this.birds) if (bird.layer === "front" && bird.y >= this.wallTop) bird.draw(px, paint, t);
    for (const moth of this.moths) moth.draw(px, paint, t);
    const dust = paint(DUST);
    for (const p of this.particles) px.set(p.x, p.y, dust);
  }
}
