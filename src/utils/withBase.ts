export function withBase(path = "") {
  if (!path || path === "/") {
    return import.meta.env.BASE_URL;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("#")) {
    return path;
  }

  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
