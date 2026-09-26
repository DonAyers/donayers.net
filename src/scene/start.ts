// Boot the scene: size a low-res canvas to the screen at an integer pixel
// scale, then redraw at 30fps (pixel art doesn't need 60, and it's kinder to
// batteries).
import { SceneClock, formatLA } from "./clock.ts";
import { Life } from "./life.ts";
import { Pixels } from "./pixels.ts";
import { type Layout, createLayout, drawScene, geometry } from "./scene.ts";
import { skyAt } from "./sky.ts";
import { sunPosition } from "./sun.ts";
import { fitPixels } from "./viewport.ts";

const FRAME_MS = 1000 / 30;

export function startScene({ still }: { still: boolean }) {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const clockLabel = document.getElementById("clock")!;
  const ctx = canvas.getContext("2d")!;
  const clock = SceneClock.fromLocation(location.search);

  const params = new URLSearchParams(location.search);
  const visitors = { possumSoon: params.has("possum"), planeSoon: params.has("plane"), helicopterSoon: params.has("helicopter"), crowSoon: params.has("crow") };
  let px: Pixels | null = null;
  let layout: Layout;
  let life: Life | null = null;
  let label = "";
  let lastMs: number | null = null;

  const render = (ms: number) => {
    const date = clock.now();
    const sun = sunPosition(date);
    const sky = skyAt(sun.altitude);
    if (!px || !life) return;
    if (!still && lastMs !== null) life.update(Math.min(0.1, (ms - lastMs) / 1000), sky.light);
    lastMs = ms;
    drawScene(px, layout, sky, sun, still ? 0 : ms / 1000, life);
    ctx.putImageData(px.image, 0, 0);
    const next = `${formatLA(date)} · Los Angeles${clock.preview ? " (preview)" : ""}`;
    if (next !== label) clockLabel.textContent = label = next;
  };

  const resize = () => {
    // Scale in device pixels so every scene pixel is an exact square. Portrait
    // screens get a taller scene (and a stacked yard) rather than a cropped one.
    const dpr = devicePixelRatio || 1;
    const { scale, width, height } = fitPixels(innerWidth, innerHeight, dpr);
    canvas.style.width = `${(width * scale) / dpr}px`;
    canvas.style.height = `${(height * scale) / dpr}px`;
    // Same pixel grid (e.g. a tiny resize, or the address bar settling)? Nothing to rebuild.
    if (px && px.width === width && px.height === height) return;
    canvas.width = width;
    canvas.height = height;
    px = new Pixels(width, height);
    layout = createLayout(width, height);
    // Keep the cats and birds where they were (in proportion) instead of respawning them.
    if (life) life.resize(geometry(layout));
    else life = new Life(geometry(layout), skyAt(sunPosition(clock.now()).altitude).light, visitors);
    lastMs = null;
    render(performance.now());
  };
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("keydown", (e) => {
    if (e.key === "[") clock.nudge(-15);
    if (e.key === "]") clock.nudge(15);
    if (still) render(0);
  });

  if (still) {
    setInterval(() => render(0), 60_000);
    return;
  }
  let last = -Infinity;
  const loop = (ms: number) => {
    requestAnimationFrame(loop);
    if (ms - last < FRAME_MS - 2) return;
    last = ms;
    render(ms);
  };
  requestAnimationFrame(loop);
}
