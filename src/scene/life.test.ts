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
  // Any single day is random; across a few days every behaviour should show up.
  const all = new Set<string>();
  for (const seed of [7, 13, 29]) {
    const run = simulate(20, 600, seed);
    expect(run.outOfBounds).toBe(0);
    for (const kind of [...run.seen.calico, ...run.seen.tabby]) all.add(kind);
    expect(run.maxBirds).toBeGreaterThan(0);
    expect(run.maxBirds).toBeLessThanOrEqual(5);
    expect(run.groundBirds).toBeGreaterThan(0);
    expect(run.maxMoths).toBe(0);
  }
  for (const kind of ["sit", "walk", "groom", "stare", "wiggle", "leap", "fight", "roll", "sleep"]) expect(all).toContain(kind);
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

test("cats never slide around while sitting, lying or grooming", () => {
  for (const [altitude, seed] of [[20, 7], [-25, 11], [-3, 5]] as const) {
    const layout = createLayout(384, 216);
    const light = skyAt(altitude).light;
    const life = new Life(geometry(layout), light, { random: rng(seed) });
    let slides = 0;
    let stationaryFrames = 0;
    for (let i = 0; i < 600 / DT; i++) {
      const before = life.cats.map((c) => ({ activity: c.activity, x: c.x, y: c.y }));
      life.update(DT, light);
      life.cats.forEach((cat, j) => {
        const prev = before[j]!;
        if (cat.activity !== prev.activity || !cat.stationary) return;
        stationaryFrames++;
        if (cat.x !== prev.x || cat.y !== prev.y) slides++;
      });
    }
    expect(stationaryFrames).toBeGreaterThan(1000);
    expect({ altitude, slides }).toEqual({ altitude, slides: 0 });
  }
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

test("the calico goes wild for butterflies (the tabby can't be bothered)", () => {
  const layout = createLayout(384, 216);
  const light = skyAt(20).light;
  const life = new Life(geometry(layout), light, { random: rng(23) });
  let longest = 0;
  let current = 0;
  let airborne = 0;
  let tumbling = 0;
  let tabbyChased = false;
  let butterflyFrames = 0;
  for (let i = 0; i < 600 / DT; i++) {
    life.update(DT, light);
    const [calico, tabby] = life.cats;
    if (life.butterflies.length) butterflyFrames++;
    if (calico!.chasing) {
      current += DT;
      longest = Math.max(longest, current);
      if (calico!.z > 2) airborne++;
      if (calico!.stationary) tumbling++;
    } else current = 0;
    tabbyChased ||= !!tabby!.chasing;
  }
  expect(butterflyFrames).toBeGreaterThan(0);
  expect(longest).toBeGreaterThan(15); // a long, proper chase
  expect(airborne).toBeGreaterThan(60); // lots of leaping
  expect(tumbling).toBeGreaterThan(0);
  expect(tabbyChased).toBe(false);
});

test("butterflies stay out of the night", () => {
  const layout = createLayout(384, 216);
  const life = new Life(geometry(layout), skyAt(-25).light, { random: rng(2) });
  for (let i = 0; i < 120 / DT; i++) life.update(DT, skyAt(-25).light);
  expect(life.butterflies).toHaveLength(0);
});

test("planes come over every minute or so; the helicopter every few", () => {
  const layout = createLayout(384, 216);
  const light = skyAt(20).light;
  const life = new Life(geometry(layout), light, { random: rng(17) });
  const planes = new Set<object>();
  const helicopters = new Set<object>();
  for (let i = 0; i < 900 / DT; i++) {
    life.update(DT, light);
    if (life.plane) planes.add(life.plane);
    if (life.helicopter) helicopters.add(life.helicopter);
  }
  expect(planes.size).toBeGreaterThanOrEqual(6);
  expect(planes.size).toBeLessThanOrEqual(25);
  expect(helicopters.size).toBeGreaterThanOrEqual(1);
  expect(helicopters.size).toBeLessThanOrEqual(5);
});

test("at night the helicopter circles, the cats look up, and its searchlight lights the yard", () => {
  const layout = createLayout(384, 216);
  const sky = skyAt(-25);
  const life = new Life(geometry(layout), sky.light, { random: rng(5), helicopterSoon: true });
  let hovered = false;
  let catsLookedUp = false;
  let litUp = false;
  for (let i = 0; i < 150 / DT && !(hovered && life.helicopter === null); i++) {
    life.update(DT, sky.light);
    const heli = life.helicopter;
    if (heli?.hovering) {
      hovered = true;
      catsLookedUp ||= life.cats.some((c) => c.activity.kind === "stare");
      const spotX = Math.round(heli.spot.x);
      if (!litUp && i % 30 === 0 && spotX > 0 && spotX < 384) {
        // Same frame drawn with and without the beam: the spot is brighter with it.
        const brightness = (c: number) => (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255);
        const at = Math.round(heli.spot.y) * 384 + spotX;
        const lit = new Pixels(384, 216);
        drawScene(lit, layout, sky, { altitude: -25, azimuth: 268 }, i * DT, life);
        const saved = life.light;
        life.light = 1; // searchlight is off in daylight
        const unlit = new Pixels(384, 216);
        drawScene(unlit, layout, sky, { altitude: -25, azimuth: 268 }, i * DT, life);
        life.light = saved;
        litUp = brightness(lit.data[at]!) > brightness(unlit.data[at]!) + 60;
      }
    }
  }
  expect(hovered).toBe(true);
  expect(catsLookedUp).toBe(true);
  expect(litUp).toBe(true);
  expect(life.helicopter).toBeNull(); // it left again
});

test("the same seed tells the same story", () => {
  const a = simulate(20, 60, 42);
  const b = simulate(20, 60, 42);
  expect(a.life.cats.map((c) => [c.x, c.y, c.activity.kind])).toEqual(b.life.cats.map((c) => [c.x, c.y, c.activity.kind]));
});
