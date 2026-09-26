// Boot: show the LA scene, or the plain page for ?plain. Reduced-motion
// visitors get the scene frozen (no sway or drift), refreshed once a minute.
export {};

const params = new URLSearchParams(location.search);
const fallback = document.getElementById("fallback")!;

async function ensureFallback() {
  // Production bakes the fallback into index.html; the dev server can't, so fetch it.
  if (fallback.firstElementChild) return;
  const res = await fetch("/fallback.html");
  if (res.ok) fallback.innerHTML = await res.text();
}

async function showScene() {
  document.documentElement.classList.add("scene");
  document.getElementById("stage")!.hidden = false;
  try {
    const { startScene } = await import("./scene/start.ts");
    startScene({ still: matchMedia("(prefers-reduced-motion: reduce)").matches });
  } catch (error) {
    console.error("Scene failed to start, showing the plain site.", error);
    document.documentElement.classList.remove("scene");
    document.getElementById("stage")!.hidden = true;
    await ensureFallback();
  }
}

if (params.has("plain")) await ensureFallback();
else await showScene();
