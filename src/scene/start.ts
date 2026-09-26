// Boot the scene: size a low-res canvas to the screen at an integer pixel
// scale, then redraw at 30fps (pixel art doesn't need 60, and it's kinder to
// batteries).
import { SceneClock, formatLA } from "./clock.ts";
import { Pixels } from "./pixels.ts";
import { type Layout, createLayout, drawScene } from "./scene.ts";
import { skyAt } from "./sky.ts";
import { sunPosition } from "./sun.ts";

/** Roughly how many virtual pixels tall the scene is. */
const TARGET_HEIGHT = 200;
const FRAME_MS = 1000 / 30;

export function startScene({ still }: { still: boolean }) {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const clockLabel = document.getElementById("clock")!;
  const ctx = canvas.getContext("2d")!;
  const clock = SceneClock.fromLocation(location.search);

  let px: Pixels;
  let layout: Layout;
  let label = "";

  const render = (ms: number) => {
    const date = clock.now();
    const sun = sunPosition(date);
    drawScene(px, layout, skyAt(sun.altitude), sun, still ? 0 : ms / 1000);
    ctx.putImageData(px.image, 0, 0);
    const next = `${formatLA(date)} · Los Angeles${clock.preview ? " (preview)" : ""}`;
    if (next !== label) clockLabel.textContent = label = next;
  };

  const resize = () => {
    // Scale in device pixels so every virtual pixel is an exact square.
    const dpr = devicePixelRatio || 1;
    const scale = Math.max(2, Math.round((innerHeight * dpr) / TARGET_HEIGHT));
    const width = Math.ceil((innerWidth * dpr) / scale);
    const height = Math.ceil((innerHeight * dpr) / scale);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${(width * scale) / dpr}px`;
    canvas.style.height = `${(height * scale) / dpr}px`;
    px = new Pixels(width, height);
    layout = createLayout(width, height);
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
