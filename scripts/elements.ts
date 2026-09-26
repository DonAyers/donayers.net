// Scene elements that can be edited in Aseprite, and how to bake each one's
// current, code-drawn look into an image to start from.
import { CALICO_COLORS, CALICO_FRONT, TABBY_COLORS, TABBY_LOAF } from "../src/scene/cats.ts";
import { type RGB, pack } from "../src/scene/color.ts";
import { Pixels, sprite } from "../src/scene/pixels.ts";
import { createLayout, drawGate } from "../src/scene/scene.ts";

/** Daylight colours, straight: what the art is authored in. */
export const daylight = (c: RGB) => pack(c);

export interface Baked {
  px: Pixels;
  /** Anchor: becomes the image's bottom-centre pixel. */
  cx: number;
  bottom: number;
}

function bakeYardItem(id: string): Baked {
  const layout = createLayout(384, 216);
  const item = layout.yard.items.find((i) => i.art?.id === id);
  if (!item?.art) throw new Error(`No yard item "${id}"`);
  const px = new Pixels(384, 216);
  item.draw(px, daylight, 0, 0);
  return { px, cx: item.art.x, bottom: item.art.bottom };
}

function bakeRows(rows: string[], colors: Record<string, RGB>): Baked {
  const width = rows[0]!.length;
  const px = new Pixels(width + 8, rows.length + 4);
  sprite(px, rows, 4, rows.length + 2, Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, daylight(v)])));
  return { px, cx: 4 + Math.floor(width / 2), bottom: rows.length + 1 };
}

export const ELEMENTS: Record<string, { about: string; bake: () => Baked }> = {
  gate: {
    about: "the gate in the middle of the wall (doors and wooden top board)",
    bake: () => {
      const px = new Pixels(64, 48);
      drawGate(px, 32, 14, 46, daylight);
      return { px, cx: 32, bottom: 45 };
    },
  },
  "lime-tree": { about: "the lime tree (static once customised: no sway)", bake: () => bakeYardItem("lime-tree") },
  "lemon-tree": { about: "the potted lemon tree", bake: () => bakeYardItem("lemon-tree") },
  "bed-tomato": { about: "raised bed with the tomato and cucumber trellis", bake: () => bakeYardItem("bed-tomato") },
  "bed-peppers": { about: "raised bed with the chili plants", bake: () => bakeYardItem("bed-peppers") },
  bougainvillea: { about: "the bougainvillea spilling over the back-right corner", bake: () => bakeYardItem("bougainvillea") },
  calico: { about: "the calico sitting up, facing you (her tail stays animated)", bake: () => bakeRows(CALICO_FRONT, CALICO_COLORS) },
  tabby: { about: "the tabby's loaf pose (drawn facing left; flipped automatically)", bake: () => bakeRows(TABBY_LOAF, TABBY_COLORS) },
};
