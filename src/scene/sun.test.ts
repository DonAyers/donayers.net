import { expect, test } from "bun:test";
import { sunPosition } from "./sun.ts";

test("sun sets in the west around 6:47pm PDT in late September", () => {
  // 2026-09-25 18:47 PDT. Apparent sunset is at about -0.8° geometric altitude.
  const sun = sunPosition(new Date("2026-09-26T01:47:00Z"));
  expect(sun.altitude).toBeGreaterThan(-2.5);
  expect(sun.altitude).toBeLessThan(1);
  expect(sun.azimuth).toBeGreaterThan(255);
  expect(sun.azimuth).toBeLessThan(280);
});

test("summer solstice noon is high in the southern sky", () => {
  // Solar noon in LA on 2026-06-21 is about 12:54 PDT.
  const sun = sunPosition(new Date("2026-06-21T19:54:00Z"));
  expect(sun.altitude).toBeCloseTo(79.4, 0);
  expect(Math.abs(sun.azimuth - 180)).toBeLessThan(15);
});

test("it's dark at midnight and the sun rises in the east", () => {
  expect(sunPosition(new Date("2026-09-26T07:00:00Z")).altitude).toBeLessThan(-30); // midnight PDT
  const sunrise = sunPosition(new Date("2026-09-25T13:48:00Z")); // ~6:48am PDT
  expect(Math.abs(sunrise.altitude)).toBeLessThan(2.5);
  expect(sunrise.azimuth).toBeGreaterThan(80);
  expect(sunrise.azimuth).toBeLessThan(105);
});
