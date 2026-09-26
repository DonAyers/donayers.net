import { expect, test } from "bun:test";
import { Life } from "./life.ts";
import { Pixels, rng } from "./pixels.ts";
import { createLayout, drawScene, geometry } from "./scene.ts";
import { skyAt } from "./sky.ts";

const DT = 1 / 30;

/** Run the yard for `seconds`, drawing every so often, and report what happened. */
function simulate(altitude: number, seconds: number, seed: number, possumSoon = false) {
  const layout = createLayout(384, 216);
  const sky = skyAt(altitude);
  const life = new Life(geometry(layout), sky.light, { random: rng(seed), possumSoon });
  const px = new Pixels(384, 216);
  const seen = { calico: new Set<string>(), tabby: new Set<string>() };
  let maxBirds = 0;
  let groundBirds = 0;
  let maxMoths = 0;
  let possum = false;
  let outOfBounds = 0;

  for (let i = 0; i < seconds / DT; i++) {
    life.update(DT, sky.light);
    for (const cat of life.cats) {
      seen[cat.persona.name as "calico" | "tabby"].add(cat.activity.kind);
      const b = life.bounds;
      if (cat.x < b.left - 1 || cat.x > b.right + 1 || cat.y < b.top - 1 || cat.y > b.bottom + 1 || Number.isNaN(cat.x)) outOfBounds++;
    }
    maxBirds = Math.max(maxBirds, life.birds.length);
    groundBirds += life.birds.filter((b) => b.onGround).length;
    maxMoths = Math.max(maxMoths, life.moths.length);
    possum ||= !!life.possum;
    if (i % 90 === 0) drawScene(px, layout, sky, { altitude, azimuth: 268 }, i * DT, life);
  }
  return { life, seen, maxBirds, groundBirds, maxMoths, possum, outOfBounds };
}

test("by day the cats get up to all sorts, and the birds come down to the yard", () => {
  const run = simulate(20, 600, 7);
  expect(run.outOfBounds).toBe(0);
  const all = new Set([...run.seen.calico, ...run.seen.tabby]);
  for (const kind of ["sit", "walk", "groom", "stare", "wiggle", "leap", "fight", "roll"]) expect(all).toContain(kind);
  expect(run.maxBirds).toBeGreaterThan(0);
  expect(run.maxBirds).toBeLessThanOrEqual(5);
  expect(run.groundBirds).toBeGreaterThan(0);
  expect(run.maxMoths).toBe(0);
});

test("at night the birds roost, moths come out, and the cats sleep a lot", () => {
  const run = simulate(-25, 600, 11);
  expect(run.outOfBounds).toBe(0);
  expect(run.life.birds.length).toBe(0);
  expect(run.maxMoths).toBeGreaterThan(0);
  expect(run.seen.tabby).toContain("sleep");
  expect(run.seen.calico).toContain("bat"); // chasing moths
});

test("a possum can be summoned, and it walks off the other side", () => {
  const run = simulate(-25, 120, 3, true);
  expect(run.possum).toBe(true);
  expect(run.life.possum).toBeNull(); // gone again: ~420px at 7px/s plus pauses
});

test("rotating the phone keeps everyone, in the yard, mid-story", () => {
  const random = rng(21);
  const wide = createLayout(384, 216);
  const life = new Life(geometry(wide), skyAt(20).light, { random });
  for (let i = 0; i < 30 / DT; i++) life.update(DT, skyAt(20).light);
  const birds = life.birds.length;

  const tall = createLayout(168, 362);
  life.resize(geometry(tall));
  for (let i = 0; i < 120 / DT; i++) {
    life.update(DT, skyAt(20).light);
    for (const cat of life.cats) {
      expect(cat.x).toBeGreaterThanOrEqual(life.bounds.left);
      expect(cat.x).toBeLessThanOrEqual(life.bounds.right);
      expect(cat.y).toBeGreaterThanOrEqual(life.bounds.top);
      expect(cat.y).toBeLessThanOrEqual(life.bounds.bottom);
    }
  }
  expect(life.cats).toHaveLength(2);
  expect(birds).toBeGreaterThan(0);
  for (const bird of life.birds) expect(bird.x).toBeLessThan(200);
  // And it still draws.
  drawScene(new Pixels(168, 362), tall, skyAt(20), { altitude: 20, azimuth: 268 }, 1, life);
});

test("the same seed tells the same story", () => {
  const a = simulate(20, 60, 42);
  const b = simulate(20, 60, 42);
  expect(a.life.cats.map((c) => [c.x, c.y, c.activity.kind])).toEqual(b.life.cats.map((c) => [c.x, c.y, c.activity.kind]));
});
