/** Blank, missing, and non-URL values stay null so the page can show a placeholder. */
export function catalogImage(images: Record<string, string>, skuId: string): string | null {
  const raw = images[skuId];
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/")) return url;
  return null;
}
