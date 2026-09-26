import { expect, test } from "bun:test";
import { SceneClock, laOffset, laTimeOn } from "./clock.ts";

test("LA offset follows daylight saving", () => {
  expect(laOffset(new Date("2026-09-25T20:00:00Z"))).toBe(-7 * 3_600_000);
  expect(laOffset(new Date("2026-12-15T20:00:00Z"))).toBe(-8 * 3_600_000);
});

test("?time=HH:MM means that time on the current LA day", () => {
  expect(laTimeOn(new Date("2026-09-25T20:00:00Z"), "18:45")?.toISOString()).toBe("2026-09-26T01:45:00.000Z");
  expect(laTimeOn(new Date("2026-12-15T20:00:00Z"), "16:45")?.toISOString()).toBe("2026-12-16T00:45:00.000Z");
  // 5pm UTC on the 26th is still the morning of the 26th in LA.
  expect(laTimeOn(new Date("2026-09-26T17:00:00Z"), "07:05")?.toISOString()).toBe("2026-09-26T14:05:00.000Z");
});

test("bad ?time values are ignored", () => {
  expect(laTimeOn(new Date(), "25:00")).toBeNull();
  expect(laTimeOn(new Date(), "dusk")).toBeNull();
  expect(SceneClock.fromLocation("?time=nope").preview).toBe(false);
});

test("preview flag tracks overrides", () => {
  expect(SceneClock.fromLocation("").preview).toBe(false);
  expect(SceneClock.fromLocation("?time=19:00").preview).toBe(true);
  expect(SceneClock.fromLocation("?speed=600").preview).toBe(true);
  const clock = SceneClock.fromLocation("");
  const before = clock.now().getTime();
  clock.nudge(15);
  expect(clock.now().getTime() - before).toBeGreaterThanOrEqual(15 * 60_000);
  expect(clock.preview).toBe(true);
});
