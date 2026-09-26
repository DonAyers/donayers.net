import { expect, test } from "bun:test";
import { createLayout } from "./scene.ts";
import { fitPixels } from "./viewport.ts";
import { BED_A_WIDTH, BED_B_WIDTH, composition } from "./yard.ts";

/** Everything's horizontal extent, generously including canopies and pots. */
function extents(width: number, height: number) {
  const layout = createLayout(width, height);
  const c = composition(width, layout.yard.top, layout.yard.bottom);
  return {
    tall: c.tall,
    spans: {
      lime: [c.lime.x - 21, c.lime.x + 21],
      lemon: [c.lemon.x - 13, c.lemon.x + 13],
      bedA: [c.bedA.x - BED_A_WIDTH / 2, c.bedA.x + BED_A_WIDTH / 2],
      bedB: [c.bedB.x - BED_B_WIDTH / 2, c.bedB.x + BED_B_WIDTH / 2],
      calico: [c.spots.calico.x - 8, c.spots.calico.x + 8],
      tabby: [c.spots.tabby.x - 10, c.spots.tabby.x + 10],
      downtown: [layout.downtown - 48, layout.downtown + 44],
      patio: [c.patio.x - c.patio.front - 1, c.patio.x + c.patio.front + 1],
    },
  };
}

const PHONES: [string, number, number, number][] = [
  ["iPhone portrait", 390, 844, 3],
  ["small Android portrait", 360, 800, 2.625],
  ["iPhone SE portrait", 320, 568, 2],
  ["iPad portrait", 768, 1024, 2],
];

for (const [name, w, h, dpr] of PHONES) {
  test(`${name}: every tree, bed and cat is fully on screen`, () => {
    const fit = fitPixels(w, h, dpr);
    const { tall, spans } = extents(fit.width, fit.height);
    expect(tall).toBe(true);
    for (const [thing, [left, right]] of Object.entries(spans)) {
      expect({ thing, left: left! >= 0 }).toEqual({ thing, left: true });
      expect({ thing, right: right! <= fit.width }).toEqual({ thing, right: true });
    }
  });
}

test("desktop keeps the wide arrangement, with the lime tree clear of downtown", () => {
  const layout = createLayout(384, 216);
  const c = composition(384, layout.yard.top, layout.yard.bottom);
  expect(c.tall).toBe(false);
  expect([c.lime.x, c.lemon.x, c.bedA.x, c.bedB.x]).toEqual([322, 64, 122, 258]);
  expect(layout.downtown + 44).toBeLessThan(c.lime.x - 21); // skyline ends before the lime canopy starts
});

test("in portrait the beds are staggered front to back, not side by side", () => {
  const fit = fitPixels(390, 844, 3);
  const layout = createLayout(fit.width, fit.height);
  const c = composition(fit.width, layout.yard.top, layout.yard.bottom);
  expect(Math.abs(c.bedB.y - c.bedA.y)).toBeGreaterThan(15);
  // The tall tomato/cucumber bed is the front one, so its trellis can't hide the gate.
  expect(c.bedA.y).toBeGreaterThan(c.bedB.y);
  expect(c.lime.y).toBeLessThan(c.bedA.y); // trees at the back
  expect(c.spots.calico.y).toBeGreaterThan(Math.max(c.bedA.y, c.bedB.y)); // cats up front
  // Back to front down the middle: gate, terrazzo, then the path to the front.
  expect(c.patio.bottom).toBeLessThan(Math.min(c.bedA.y, c.bedB.y));
  expect(c.path.top).toBeGreaterThan(c.patio.bottom);
  expect(c.path.bottom).toBe(layout.yard.bottom);
});
