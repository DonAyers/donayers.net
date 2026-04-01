export function withBase(path = "") {
  const normalizedBaseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  if (!path || path === "/") {
    return normalizedBaseUrl;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("#")) {
    return path;
  }

  return `${normalizedBaseUrl}${path.replace(/^\//, "")}`;
}
