// Fitting the pixel-art scene to any screen shape.
//
// We pick one integer pixel scale (device pixels per scene pixel) so the scene
// is at least MIN_HEIGHT tall and MIN_WIDTH wide, whichever is tighter. On a
// landscape screen that's the height (the classic ~384×216 view); on a
// portrait phone it's the width, which buys a much taller scene instead of a
// cropped one. The layout then re-arranges itself when the scene is "tall".

export const MIN_HEIGHT = 200;
export const MIN_WIDTH = 168;

export interface Fit {
  /** Device pixels per scene pixel. */
  scale: number;
  /** Scene size in scene pixels. */
  width: number;
  height: number;
}

export function fitPixels(cssWidth: number, cssHeight: number, dpr: number): Fit {
  const w = cssWidth * dpr;
  const h = cssHeight * dpr;
  const scale = Math.max(2, Math.round(Math.min(h / MIN_HEIGHT, w / MIN_WIDTH)));
  return { scale, width: Math.ceil(w / scale), height: Math.ceil(h / scale) };
}

/** Portrait-ish: use the stacked composition. */
export const isTall = (width: number, height: number) => width / height < 0.8;
