import { expect, test } from "bun:test";
import { fromLab, hex, pack, toLab } from "./color.ts";
import { Pixels } from "./pixels.ts";
import { createLayout, drawScene } from "./scene.ts";
import { skyAt } from "./sky.ts";

test("colour helpers round-trip", () => {
  expect(pack(hex("#ff8000"))).toBe(0xff0080ff);
  const back = fromLab(toLab(hex("#6a4a92")));
  expect(back.map((c) => Math.round(c * 255))).toEqual([0x6a, 0x4a, 0x92]);
});

test("dusk is warm at the horizon and deep blue overhead", () => {
  const dusk = skyAt(-1);
  const [topR, , topB] = fromLab(dusk.sky[0]!);
  const [horizonR, , horizonB] = fromLab(dusk.sky[4]!);
  expect(topB).toBeGreaterThan(topR);
  expect(horizonR).toBeGreaterThan(horizonB);
});

test("light and brightness rise with the sun", () => {
  let previous = -1;
  for (let altitude = -25; altitude <= 40; altitude += 1) {
    const { light } = skyAt(altitude);
    expect(light).toBeGreaterThanOrEqual(previous);
    previous = light;
  }
  expect(skyAt(-20).sky[0]![0]).toBeLessThan(skyAt(20).sky[0]![0]);
  expect(skyAt(-20).stars).toBe(1);
  expect(skyAt(20).stars).toBe(0);
});

test("the whole scene draws at dusk, night and noon", () => {
  const layout = createLayout(384, 216);
  const frames = [
    { altitude: -1, azimuth: 268 },
    { altitude: -30, azimuth: 330 },
    { altitude: 60, azimuth: 180 },
  ].map((sun) => {
    const px = new Pixels(384, 216);
    drawScene(px, layout, skyAt(sun.altitude), sun, 12.5);
    expect(px.data.every((v) => v >>> 24 === 255)).toBe(true); // every pixel painted, opaque
    return px;
  });
  // Top-left sky pixel differs between times of day; the wall is not sky-coloured.
  const [dusk, night, noon] = frames;
  expect(new Set([dusk!.data[0], night!.data[0], noon!.data[0]]).size).toBe(3);
  expect(dusk!.data[215 * 384 + 10]).not.toBe(dusk!.data[0]);
});
