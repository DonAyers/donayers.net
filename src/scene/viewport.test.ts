import { expect, test } from "bun:test";
import { fitPixels, isTall } from "./viewport.ts";

test("desktop keeps the classic 384×216 view", () => {
  expect(fitPixels(1920, 1080, 1)).toEqual({ scale: 5, width: 384, height: 216 });
  expect(isTall(384, 216)).toBe(false);
});

test("a portrait phone gets a narrow, tall scene instead of a cropped one", () => {
  const fit = fitPixels(390, 844, 3); // iPhone-sized
  expect(fit.width).toBeGreaterThanOrEqual(160);
  expect(fit.width).toBeLessThanOrEqual(200);
  expect(fit.height).toBeGreaterThan(fit.width * 2);
  expect(isTall(fit.width, fit.height)).toBe(true);
});

test("a landscape phone and a portrait tablet both land sensibly", () => {
  const landscape = fitPixels(844, 390, 3);
  expect(landscape.height).toBeGreaterThanOrEqual(190);
  expect(isTall(landscape.width, landscape.height)).toBe(false);

  const tablet = fitPixels(768, 1024, 2);
  expect(tablet.width).toBeGreaterThanOrEqual(160);
  expect(isTall(tablet.width, tablet.height)).toBe(true);
});

test("the scale is always a whole number of device pixels, at least 2", () => {
  for (const [w, h, dpr] of [[320, 568, 2], [1280, 720, 1.5], [2560, 1440, 2], [360, 800, 2.625]] as const) {
    const fit = fitPixels(w, h, dpr);
    expect(Number.isInteger(fit.scale)).toBe(true);
    expect(fit.scale).toBeGreaterThanOrEqual(2);
  }
});
