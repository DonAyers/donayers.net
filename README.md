# donayers.net

A pixel-art Los Angeles back yard, rendered live in the browser. The sky follows the real sun position over LA right now; palms sway, and two cats, some sparrows, moths and the odd possum go about their business.

## Stack

- **[Bun](https://bun.com/)**: runtime, dev server, bundler and test runner
- **Canvas 2D**: a low-res software framebuffer scaled up with sharp pixels; no rendering libraries
- **No runtime dependencies**: the whole site is about 20 KB gzipped

## Scripts

```bash
bun install
bun run dev        # http://localhost:7420 (PORT to override)
bun run build      # static site in dist/, prints gzip sizes
bun run preview    # serve dist/ like GitHub Pages, http://localhost:7421
bun test
bun run typecheck
bun run snapshot   # render time-of-day previews, behaviour sheets and a cat pose gallery to snapshots/
```

Preview any time of day with `?time=19:05` (LA time), time-lapse with `?speed=600`, or nudge with `[` and `]`. `?possum` sends a possum over the wall. `?plain` shows the plain HTML version.

## Editing art in Aseprite

```bash
bun run art                  # list editable elements (● = has custom art)
bun run art edit gate        # opens it in Aseprite; every save lands in the game
bun run art sync             # re-import everything in art/
bun run art reset gate       # back to the code-drawn version
```

The first `edit` bakes the element's current look into `art/<id>.aseprite`, so you start from what's on screen. On each save the tool exports `art/<id>.png` and generates `src/art/<id>.ts`, which the game draws instead of the procedural version. With `bun run dev` running, the page reloads with your change. Paint in daylight colours: the sky's lighting is applied on top. Art is drawn with its bottom-centre pixel on the element's spot, so resize the canvas anchored bottom-centre. Aseprite is found automatically; otherwise set `ASEPRITE=/path/to/aseprite` in `.env`.

## Layout

```
content/          markdown for the plain pages (dev projects, music, about)
public/           copied as-is (CNAME, favicon, site.css)
scripts/          dev server, build, preview, snapshot, content + fallback page rendering
src/
  main.ts         boot: scene, or plain page for ?plain
  scene/          sun, sky palettes, colour (OKLab), pixel buffer, backdrop, yard
                  life.ts + cats.ts / birds.ts / critters.ts: the NPCs
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, typecheck, build, then GitHub Pages (custom domain via `public/CNAME`).
