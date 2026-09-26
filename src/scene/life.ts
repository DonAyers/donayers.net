// Everything alive in the scene: two cats, a few sparrows, moths after dark,
// and a rare possum. Life owns the shared world state the actors read, spawns
// and retires visitors, and sorts actors into the right draw layer.
import { Bird } from "./birds.ts";
import { Cat, PERSONALITIES } from "./cats.ts";
import { hex } from "./color.ts";
import { Moth, Possum } from "./critters.ts";
import type { Pixels } from "./pixels.ts";
import type { Paint } from "./yard.ts";

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
  readonly spots: { nap: Point[]; dirt: Point };
  readonly random: () => number;
  /** Sky light, 0 night … 1 full day. */
  readonly light: number;
  readonly cats: Cat[];
  readonly birds: Bird[];
  readonly moths: Moth[];
  readonly possum: Possum | null;
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
  spots: { calico: Point; tabby: Point; nap: Point[]; dirt: Point };
}

export interface LifeOptions {
  random?: () => number;
  /** Send a possum over the wall within a few seconds (for previews). */
  possumSoon?: boolean;
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
  readonly width: number;
  readonly height: number;
  readonly horizon: number;
  readonly wallTop: number;
  readonly bounds: World["bounds"];
  readonly spots: World["spots"];
  readonly random: () => number;
  readonly wireAt: (wire: number, x: number) => number;
  light = 1;
  cats: Cat[];
  birds: Bird[] = [];
  moths: Moth[] = [];
  possum: Possum | null = null;
  private particles: Particle[] = [];
  private possumCooldown: number;
  private possumSoon: boolean;

  constructor(geo: Geometry, light: number, options: LifeOptions = {}) {
    this.width = geo.width;
    this.height = geo.height;
    this.horizon = geo.horizon;
    this.wallTop = geo.wallTop;
    this.wireAt = geo.wireAt;
    this.random = options.random ?? Math.random;
    this.bounds = { left: 10, right: geo.width - 10, top: geo.yardTop + 9, bottom: geo.yardBottom - 1 };
    this.spots = { nap: geo.spots.nap, dirt: geo.spots.dirt };
    this.light = light;
    this.possumSoon = !!options.possumSoon;
    this.possumCooldown = this.possumSoon ? 3 : 45;
    this.cats = [
      new Cat(PERSONALITIES.calico, geo.spots.calico.x, geo.spots.calico.y, this),
      new Cat(PERSONALITIES.tabby, geo.spots.tabby.x, geo.spots.tabby.y, this),
    ];
    // Start the scene already populated for the time of day.
    if (light > 0.3) for (let i = 0; i < 3; i++) this.birds.push(Bird.perchedOnWire(this));
    if (light < 0.35) for (let i = 0; i < 2; i++) this.spawnMoth();
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
    if (this.birds.length < birdTarget && r() < dt / 5) this.birds.push(Bird.arrive(this));
    const mothTarget = light < 0.35 ? 3 : 0;
    if (this.moths.length < mothTarget && r() < dt / 3) this.spawnMoth();

    // Possums: night only, rare (about one every four minutes, never back to back).
    this.possumCooldown -= dt;
    if (!this.possum && this.possumCooldown <= 0 && (this.possumSoon || (light < 0.15 && r() < dt / 240))) {
      this.possum = new Possum(this);
      this.possumSoon = false;
    }

    for (const cat of this.cats) cat.update(dt);
    for (const bird of this.birds) bird.update(dt, this);
    for (const moth of this.moths) moth.update(dt, this);
    this.possum?.update(dt, this);

    this.birds = this.birds.filter((b) => !b.gone);
    this.moths = this.moths.filter((m) => !m.gone);
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
