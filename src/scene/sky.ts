// LA sky palettes keyed by sun altitude, blended in OKLab. Each key describes
// the whole scene's lighting at that moment: the sky gradient plus how clouds,
// silhouettes and lit surfaces should look.
import { type Lab, hex, mixLab, toLab } from "./color.ts";

/** Where each gradient stop sits, top of sky (0) to horizon (1). */
export const STOP_POSITIONS = [0, 0.3, 0.55, 0.78, 1] as const;

interface SkyKey {
  altitude: number;
  /** Top of sky → horizon. */
  sky: [string, string, string, string, string];
  cloudLit: string;
  cloudShade: string;
  /** What unlit objects fade to (backlit palms, poles). */
  silhouette: string;
  /** Ambient light colour multiplied onto lit surfaces. */
  tint: string;
  /** 0 = pure silhouette, 1 = full daylight colour. */
  light: number;
  sun: string;
  /** Strength of the glow around the sun's position on the horizon. */
  glow: number;
  stars: number;
  /** Distant mountains. */
  haze: string;
}

// Hand-tuned. The dusk band (-9° to 4°) is where LA gets its colour.
const KEYS: SkyKey[] = [
  {
    altitude: -18,
    // LA never gets truly dark: city light warms the bottom of the sky.
    sky: ["#05071a", "#0a0f2b", "#12183c", "#241e48", "#44294a"],
    cloudLit: "#2c2442", cloudShade: "#16162e", silhouette: "#06050e", tint: "#3a4a8a",
    light: 0.06, sun: "#ff5a3a", glow: 0, stars: 1, haze: "#1b1a36",
  },
  {
    altitude: -9,
    sky: ["#0b1236", "#18205a", "#2f2c74", "#5a3a86", "#9a4f86"],
    cloudLit: "#8a4f92", cloudShade: "#2a2654", silhouette: "#0c0a1d", tint: "#6a5aa0",
    light: 0.14, sun: "#ff5a3a", glow: 0.25, stars: 0.6, haze: "#3b2f66",
  },
  {
    altitude: -4,
    sky: ["#17216c", "#36378e", "#8a4ca4", "#e8648a", "#ffa066"],
    cloudLit: "#ff8c96", cloudShade: "#5a3f8e", silhouette: "#140c28", tint: "#b07aa8",
    light: 0.22, sun: "#ff6a3a", glow: 0.6, stars: 0.15, haze: "#6a4a92",
  },
  {
    altitude: -0.5,
    sky: ["#24378a", "#5c4fa8", "#cc6aa4", "#ff8a6a", "#ffc766"],
    cloudLit: "#ffb27a", cloudShade: "#8e5aa2", silhouette: "#1b0f2e", tint: "#e89a8a",
    light: 0.32, sun: "#ff8a3a", glow: 0.95, stars: 0, haze: "#9a6a9a",
  },
  {
    altitude: 4,
    sky: ["#3558a6", "#6a86c4", "#e0a0a8", "#ffbe7a", "#ffe09a"],
    cloudLit: "#ffd4a4", cloudShade: "#b08aa8", silhouette: "#2a1c30", tint: "#ffc8a0",
    light: 0.6, sun: "#ffd070", glow: 0.7, stars: 0, haze: "#c09aa8",
  },
  {
    altitude: 12,
    sky: ["#3a78c8", "#62a0dc", "#9cc4e6", "#d0e0e6", "#f0e4cc"],
    cloudLit: "#ffffff", cloudShade: "#c8d4e4", silhouette: "#2a3036", tint: "#fff0dc",
    light: 0.9, sun: "#fff4d0", glow: 0.3, stars: 0, haze: "#b8c8d8",
  },
  {
    altitude: 30,
    sky: ["#2f78d6", "#5098e4", "#84b8ec", "#b4d4f0", "#d8e8f0"],
    cloudLit: "#ffffff", cloudShade: "#d8e2ee", silhouette: "#2e3436", tint: "#ffffff",
    light: 1, sun: "#fffbe8", glow: 0.15, stars: 0, haze: "#bcd0e0",
  },
];

export interface SkyState {
  sky: Lab[];
  cloudLit: Lab;
  cloudShade: Lab;
  silhouette: Lab;
  tint: Lab;
  light: number;
  sun: Lab;
  glow: number;
  stars: number;
  haze: Lab;
}

function toState(key: SkyKey): SkyState {
  return {
    sky: key.sky.map((c) => toLab(hex(c))),
    cloudLit: toLab(hex(key.cloudLit)),
    cloudShade: toLab(hex(key.cloudShade)),
    silhouette: toLab(hex(key.silhouette)),
    tint: toLab(hex(key.tint)),
    light: key.light,
    sun: toLab(hex(key.sun)),
    glow: key.glow,
    stars: key.stars,
    haze: toLab(hex(key.haze)),
  };
}

const STATES = KEYS.map((key) => ({ altitude: key.altitude, state: toState(key) }));

function blend(a: SkyState, b: SkyState, t: number): SkyState {
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    sky: a.sky.map((c, i) => mixLab(c, b.sky[i]!, t)),
    cloudLit: mixLab(a.cloudLit, b.cloudLit, t),
    cloudShade: mixLab(a.cloudShade, b.cloudShade, t),
    silhouette: mixLab(a.silhouette, b.silhouette, t),
    tint: mixLab(a.tint, b.tint, t),
    light: lerp(a.light, b.light),
    sun: mixLab(a.sun, b.sun, t),
    glow: lerp(a.glow, b.glow),
    stars: lerp(a.stars, b.stars),
    haze: mixLab(a.haze, b.haze, t),
  };
}

/** The scene's lighting for a given sun altitude (degrees). */
export function skyAt(altitude: number): SkyState {
  const first = STATES[0]!;
  const last = STATES[STATES.length - 1]!;
  if (altitude <= first.altitude) return first.state;
  if (altitude >= last.altitude) return last.state;
  const i = STATES.findIndex((s) => s.altitude > altitude);
  const lo = STATES[i - 1]!;
  const hi = STATES[i]!;
  const t = (altitude - lo.altitude) / (hi.altitude - lo.altitude);
  // Smoothstep so colours ease through each key rather than kinking at it.
  return blend(lo.state, hi.state, t * t * (3 - 2 * t));
}

/** Sky colour at `t` (0 = top, 1 = horizon). */
export function gradientAt(sky: Lab[], t: number): Lab {
  for (let i = 1; i < STOP_POSITIONS.length; i++) {
    const hi = STOP_POSITIONS[i]!;
    if (t <= hi || i === STOP_POSITIONS.length - 1) {
      const lo = STOP_POSITIONS[i - 1]!;
      return mixLab(sky[i - 1]!, sky[i]!, Math.min(1, Math.max(0, (t - lo) / (hi - lo))));
    }
  }
  return sky[sky.length - 1]!;
}
