// A tiny software framebuffer: draw integer pixels into a Uint32Array, then
// blit it with one putImageData. No anti-aliasing, ever.

/** 4×4 ordered-dither thresholds in [0, 1). */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);

export class Pixels {
  readonly data: Uint32Array;
  private imageData: ImageData | null = null;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint32Array(width * height);
  }

  /** ImageData sharing this buffer (created lazily — it's browser-only). */
  get image(): ImageData {
    this.imageData ??= new ImageData(new Uint8ClampedArray(this.data.buffer as ArrayBuffer), this.width, this.height);
    return this.imageData;
  }

  set(x: number, y: number, color: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) this.data[y * this.width + x] = color;
  }

  rect(x: number, y: number, w: number, h: number, color: number) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.width, Math.round(x + w));
    const y1 = Math.min(this.height, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) this.data.fill(color, yy * this.width + x0, yy * this.width + x1);
  }

  /** Bresenham line, inclusive of both ends. */
  line(x0: number, y0: number, x1: number, y1: number, color: number) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  disk(cx: number, cy: number, r: number, color: number) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y) + 0.3);
      this.rect(cx - half, cy + y, half * 2 + 1, 1, color);
    }
  }
}

/** Stable per-pixel noise in [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Draw a sprite given as rows of characters; each character is a key into
 * `colors`, and "." is transparent. (x, bottom) is the sprite's bottom-left.
 */
export function sprite(px: Pixels, rows: readonly string[], x: number, bottom: number, colors: Record<string, number>, flip = false) {
  const top = Math.round(bottom) - rows.length;
  x = Math.round(x);
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const key = row[flip ? row.length - 1 - c : c]!;
      if (key !== ".") px.set(x + c, top + r, colors[key]!);
    }
  });
}

/** Deterministic PRNG so the layout is stable across reloads. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
