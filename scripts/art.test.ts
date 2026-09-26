import { afterEach, expect, test } from "bun:test";
import { ART_DATA } from "../src/art/index.ts";
import { art, drawArt } from "../src/scene/art.ts";
import { Pixels } from "../src/scene/pixels.ts";
import { createLayout, drawGate } from "../src/scene/scene.ts";
import { artModule, cropToAnchor, indexModule, toArtData } from "./artlib.ts";
import { ELEMENTS, daylight } from "./elements.ts";
import { decodePng, encodePng } from "./png.ts";

afterEach(() => {
  for (const id of Object.keys(ART_DATA)) delete ART_DATA[id];
});

test("PNGs round-trip, including transparency", () => {
  const rgba = new Uint8Array(7 * 5 * 4).map((_, i) => (i * 37 + (i >> 2) * 11) & 255);
  const back = decodePng(encodePng({ width: 7, height: 5, rgba }));
  expect(back.width).toBe(7);
  expect(back.height).toBe(5);
  expect([...back.rgba]).toEqual([...rgba]);
});

test("every element can be baked into an image anchored at its bottom-centre", () => {
  for (const [id, element] of Object.entries(ELEMENTS)) {
    const { px, cx, bottom } = element.bake();
    const image = cropToAnchor(px, cx, bottom);
    expect({ id, oddWidth: image.width % 2 }).toEqual({ id, oddWidth: 1 });
    expect(image.height).toBeGreaterThan(5);
  }
});

/** Bake → image → art data → back in the game: must land pixel-for-pixel where it was. */
function roundTrip(id: string) {
  const { px, cx, bottom } = ELEMENTS[id]!.bake();
  ART_DATA[id] = toArtData(cropToAnchor(px, cx, bottom));
  return { px, cx, bottom };
}

test("unedited art drops back into the yard exactly where the original was", () => {
  const layout = createLayout(384, 216);
  for (const id of ["lime-tree", "lemon-tree", "bed-tomato", "bed-peppers", "bougainvillea"]) {
    const { px: original } = roundTrip(id);
    const slot = layout.yard.items.find((i) => i.art?.id === id)!.art!;
    const redrawn = new Pixels(384, 216);
    drawArt(redrawn, art(id)!, slot.x, slot.bottom, daylight);
    expect({ id, same: Buffer.compare(Buffer.from(original.data.buffer), Buffer.from(redrawn.data.buffer)) }).toEqual({ id, same: 0 });
  }
});

test("custom gate art replaces the code-drawn gate in the same place", () => {
  const { px: original } = roundTrip("gate");
  const redrawn = new Pixels(64, 48);
  drawGate(redrawn, 32, 14, 46, daylight); // now uses the custom art
  expect(Buffer.compare(Buffer.from(original.data.buffer), Buffer.from(redrawn.data.buffer))).toBe(0);
});

test("cat art keeps its anchor", () => {
  for (const id of ["calico", "tabby"]) {
    const { px: original, cx, bottom } = roundTrip(id);
    const redrawn = new Pixels(original.width, original.height);
    drawArt(redrawn, art(id)!, cx, bottom, daylight);
    expect({ id, same: Buffer.compare(Buffer.from(original.data.buffer), Buffer.from(redrawn.data.buffer)) }).toEqual({ id, same: 0 });
  }
});

test("generated modules hold the art data and register every id", () => {
  const data = toArtData(cropToAnchor(ELEMENTS.gate!.bake().px, 32, 45));
  const source = artModule("gate", data);
  const json = source.slice(source.indexOf("= ") + 2, source.lastIndexOf(";\n\nexport"));
  expect(JSON.parse(json)).toEqual(data);
  expect(indexModule([])).toContain("ART_DATA: Record<string, ArtData> = {}");
  const index = indexModule(["gate", "lime-tree"]);
  expect(index).toContain('import art_lime_tree from "./lime-tree.ts";');
  expect(index).toContain('"gate": art_gate,');
});

test("too many colours gives a helpful error", () => {
  const rgba = new Uint8Array(20 * 10 * 4);
  for (let i = 0; i < 200; i++) rgba.set([i, 255 - i, (i * 7) & 255, 255], i * 4);
  expect(() => toArtData({ width: 20, height: 10, rgba })).toThrow(/Too many colours/);
});
