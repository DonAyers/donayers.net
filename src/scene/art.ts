// Hand-drawn art overrides. Anything edited in Aseprite (`bun run art edit
// <id>`) lands in src/art/ as palette rows; when an element has custom art the
// game draws that instead of its procedural version. Colours are daylight
// colours, so custom art still takes the sky's lighting like everything else.
import { ART_DATA } from "../art/index.ts";
import { type RGB, hex } from "./color.ts";
import type { Pixels } from "./pixels.ts";

/** What a generated src/art/<id>.ts module contains. */
export interface ArtData {
  w: number;
  h: number;
  /** Colour per palette character, "#rrggbb". */
  palette: Record<string, string>;
  /** One string per row; "." is transparent. */
  rows: string[];
}

interface Art {
  w: number;
  h: number;
  colors: RGB[];
  /** Palette index per pixel, -1 for transparent. */
  pixels: Int16Array;
}

const decoded = new Map<ArtData, Art>();

function decode(data: ArtData): Art {
  const keys = Object.keys(data.palette);
  const index = new Map(keys.map((k, i) => [k, i]));
  const pixels = new Int16Array(data.w * data.h).fill(-1);
  data.rows.forEach((row, y) => {
    for (let x = 0; x < data.w; x++) pixels[y * data.w + x] = index.get(row[x] ?? ".") ?? -1;
  });
  return { w: data.w, h: data.h, colors: keys.map((k) => hex(data.palette[k]!)), pixels };
}

/** Custom art for an element, if someone has drawn it. */
export function art(id: string): Art | null {
  const data = ART_DATA[id];
  if (!data) return null;
  let a = decoded.get(data);
  if (!a) decoded.set(data, (a = decode(data)));
  return a;
}

/** Draw with the image's bottom-centre pixel at (cx, bottomRow). */
export function drawArt(px: Pixels, a: Art, cx: number, bottomRow: number, paint: (c: RGB) => number, flip = false) {
  const left = Math.round(cx) - Math.floor(a.w / 2);
  const top = Math.round(bottomRow) - a.h + 1;
  const painted = a.colors.map(paint);
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const i = a.pixels[y * a.w + (flip ? a.w - 1 - x : x)]!;
      if (i >= 0) px.set(left + x, top + y, painted[i]!);
    }
  }
}
