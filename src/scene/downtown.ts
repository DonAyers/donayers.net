// Downtown LA on the horizon, a few miles off (as seen from around Jefferson
// Park, with some artistic licence on direction). Stylised, but the landmarks
// read: the Wilshire Grand's sail and spire, the U.S. Bank Tower's stepped
// round crown, the dark Aon slab, the City National Plaza twins and the Gas
// Company Tower's flame. Heights are roughly 1px per 10m.
import { type Lab, type RGB, hex, mixLab, packLab, toLab } from "./color.ts";
import { type Pixels, hash2 } from "./pixels.ts";
import type { SkyState } from "./sky.ts";

type Style = "flat" | "sail" | "crown" | "flame" | "slant" | "stepped";

interface Tower {
  /** Left edge, relative to the skyline's centre. */
  dx: number;
  w: number;
  h: number;
  style: Style;
  dark?: boolean;
  beacon?: boolean;
}

const TOWERS: Tower[] = [
  { dx: -40, w: 7, h: 8, style: "flat" },
  { dx: -33, w: 6, h: 13, style: "flat" },
  { dx: -27, w: 5, h: 17, style: "stepped" },
  { dx: -21, w: 5, h: 21, style: "flat", dark: true }, // City National Plaza twins
  { dx: -15, w: 5, h: 21, style: "flat", dark: true },
  { dx: -8, w: 7, h: 27, style: "sail", beacon: true }, // Wilshire Grand
  { dx: 0, w: 6, h: 25, style: "flat", dark: true }, // Aon Center
  { dx: 7, w: 7, h: 29, style: "crown", beacon: true }, // U.S. Bank Tower
  { dx: 14, w: 5, h: 22, style: "flame" }, // Gas Company Tower
  { dx: 19, w: 5, h: 20, style: "slant" }, // 777 Tower
  { dx: 25, w: 6, h: 22, style: "stepped" }, // Two California Plaza
  { dx: 31, w: 6, h: 15, style: "flat" },
  { dx: 37, w: 5, h: 10, style: "flat" },
];

const GLASS = hex("#6e7a8e");
const DARK = hex("#2e3444");
const WARM_WINDOW = toLab(hex("#ffd98a"));
const COOL_WINDOW = toLab(hex("#d8e8ff"));
const BEACON = toLab(hex("#ff3a30"));
const CROWN_LIGHT = toLab(hex("#bfe4ff"));
const SAIL_LIGHT = toLab(hex("#8fd0ff"));

/** [left inset, right inset] for row `d` counted down from the tower's top. */
function insets(style: Style, d: number): [number, number] {
  switch (style) {
    case "stepped":
      return d < 3 ? [2, 2] : d < 6 ? [1, 1] : [0, 0];
    case "crown":
      return d < 2 ? [2, 2] : d < 4 ? [1, 1] : [0, 0];
    case "sail":
      return d < 5 ? [5 - d, 0] : [0, 0]; // the slanted "sail" top
    case "flame":
      return d < 3 ? [1, 1] : [0, 0];
    case "slant":
      return d < 3 ? [3 - d, 0] : [0, 0];
    default:
      return [0, 0];
  }
}

/**
 * Draw the skyline centred on `cx`, standing on `base` (the horizon). `lit`
 * gives a daylight colour as it looks under this sky, before distance haze.
 */
export function drawDowntown(px: Pixels, cx: number, base: number, sky: SkyState, t: number, lit: (c: RGB) => Lab) {
  // Distance: a few miles of LA air between us and downtown.
  const far = (c: Lab) => mixLab(mixLab(c, sky.haze, 0.4), sky.sky[3]!, 0.15);
  const glass = far(lit(GLASS));
  const dark = far(lit(DARK));
  // West faces catch the low sun around golden hour and sunset.
  const glint = 0.15 + 0.4 * sky.glow;
  const bodies = { glass: packLab(glass), dark: packLab(dark) };
  const faces = { glass: packLab(mixLab(glass, sky.sun, glint)), dark: packLab(mixLab(dark, sky.sun, glint * 0.6)) };
  const night = Math.max(0, Math.min(1, (0.45 - sky.light) / 0.35)); // 0 by day → 1 after dark
  const windows = [packLab(mixLab(WARM_WINDOW, sky.haze, 0.25)), packLab(mixLab(COOL_WINDOW, sky.haze, 0.25))];

  // A band of low-rises underneath the towers.
  for (let x = -48; x <= 44; x++) {
    const h = 3 + Math.floor(hash2(Math.floor(x / 3), 0, 41) * 5);
    px.rect(cx + x, base - h, 1, h, bodies.glass);
    if (night && x % 2 === 0 && hash2(x, 1, 42) < night * 0.3) px.set(cx + x, base - h + 2, windows[0]!);
  }

  const order = [...TOWERS].sort((a, b) => a.h - b.h);
  for (const tower of order) {
    const left = cx + tower.dx;
    const top = base - tower.h;
    const kind = tower.dark ? "dark" : "glass";
    for (let d = 0; d < tower.h; d++) {
      const [l, r] = insets(tower.style, d);
      const x0 = left + l;
      const x1 = left + tower.w - r;
      if (x1 <= x0) continue;
      px.rect(x0, top + d, x1 - x0, 1, bodies[kind]);
      px.set(x0, top + d, faces[kind]); // sunlit west face
      if (tower.style === "crown" && d >= 4) px.set(x1 - 1, top + d, packLab(mixLab(dark, glass, 0.4))); // round shading
    }

    if (night > 0) {
      // Office windows: a stable pattern that slowly changes as people leave.
      const epoch = Math.floor(t / 9);
      for (let d = 3; d < tower.h - 1; d += 2) {
        const [l, r] = insets(tower.style, d);
        for (let x = left + l + 1; x < left + tower.w - r - 1; x += 2) {
          const on = hash2(x, top + d, 43) < night * (tower.dark ? 0.25 : 0.45);
          const flicker = hash2(x, top + d, 100 + epoch) < 0.04;
          if (on !== flicker) px.set(x, top + d, windows[hash2(x, d, 44) < 0.7 ? 0 : 1]!);
        }
      }
      // Landmark lighting.
      if (tower.style === "crown") {
        for (let d = 0; d < 4; d++) {
          const [l, r] = insets("crown", d);
          px.rect(left + l, top + d, tower.w - l - r, 1, packLab(mixLab(dark, CROWN_LIGHT, night * 0.8)));
        }
      }
      if (tower.style === "sail") {
        for (let d = 0; d < 5; d++) px.set(left + 5 - d, top + d, packLab(mixLab(dark, SAIL_LIGHT, night * 0.9)));
      }
    }

    if (tower.style === "sail") px.rect(left + tower.w - 2, top - 5, 1, 5, bodies.dark); // spire
    if (tower.style === "flame") px.rect(left + 2, top, 1, 3, faces.glass); // the flame crown

    // Red aircraft beacons, blinking, once the light starts to go.
    if (tower.beacon && sky.light < 0.6 && Math.floor(t * 1.2 + tower.dx) % 2 === 0) {
      const bx = tower.style === "sail" ? left + tower.w - 2 : left + Math.floor(tower.w / 2);
      const by = tower.style === "sail" ? top - 6 : top - 1;
      px.set(bx, by, packLab(BEACON));
    }
  }
}
