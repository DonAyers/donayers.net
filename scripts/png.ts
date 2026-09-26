// Minimal PNG encode/decode: 8-bit, non-interlaced, which is what Aseprite
// writes. Enough to round-trip sprites without any image libraries.
import { deflateSync, inflateSync } from "node:zlib";

export interface Image {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  rgba: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode RGBA, optionally upscaled by `zoom` (nearest neighbour). */
export function encodePng({ width, height, rgba }: Image, zoom = 1): Uint8Array {
  const w = width * zoom;
  const h = height * zoom;
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    for (let x = 0; x < w; x++) {
      const src = (Math.floor(y / zoom) * width + Math.floor(x / zoom)) * 4;
      raw.set(rgba.subarray(src, src + 4), row + 1 + x * 4);
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, w);
  view.setUint32(4, h);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const parts = [
    new Uint8Array(SIGNATURE),
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode an 8-bit, non-interlaced PNG (RGBA, RGB, indexed, grey, grey+alpha). */
export function decodePng(bytes: Uint8Array): Image {
  if (!SIGNATURE.every((b, i) => bytes[i] === b)) throw new Error("Not a PNG file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  let alphas: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  for (let at = 8; at < bytes.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const depth = data[8];
      colorType = data[9]!;
      if (depth !== 8) throw new Error(`Only 8-bit PNGs are supported (got ${depth}-bit)`);
      if (data[12] !== 0) throw new Error("Interlaced PNGs are not supported");
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") alphas = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    at += 12 + length;
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${colorType}`);
  const compressed = new Uint8Array(idat.reduce((n, d) => n + d.length, 0));
  let offset = 0;
  for (const d of idat) {
    compressed.set(d, offset);
    offset += d.length;
  }
  const raw = new Uint8Array(inflateSync(compressed));

  // Undo the per-row filters.
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[i - channels]! : 0;
      const b = prev ? prev[i]! : 0;
      const c = prev && i >= channels ? prev[i - channels]! : 0;
      const x = src[i]!;
      out[i] = (filter === 0 ? x : filter === 1 ? x + a : filter === 2 ? x + b : filter === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 255;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = pixels.subarray(i * channels, (i + 1) * channels);
    let r: number, g: number, b: number, a: number;
    if (colorType === 6) [r, g, b, a] = [p[0]!, p[1]!, p[2]!, p[3]!];
    else if (colorType === 2) [r, g, b, a] = [p[0]!, p[1]!, p[2]!, 255];
    else if (colorType === 4) [r, g, b, a] = [p[0]!, p[0]!, p[0]!, p[1]!];
    else if (colorType === 0) [r, g, b, a] = [p[0]!, p[0]!, p[0]!, 255];
    else {
      const k = p[0]!;
      [r, g, b] = [palette![k * 3]!, palette![k * 3 + 1]!, palette![k * 3 + 2]!];
      a = alphas && k < alphas.length ? alphas[k]! : 255;
    }
    rgba.set([r, g, b, a], i * 4);
  }
  return { width, height, rgba };
}
