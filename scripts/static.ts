import { resolve, sep } from "node:path";

/** Resolve a URL path inside `root`, or null if it escapes it. */
export function within(root: string, urlPath: string): string | null {
  const full = resolve(root, `.${urlPath}`);
  return full === root || full.startsWith(root + sep) ? full : null;
}

export const html = (body: string | Blob, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
