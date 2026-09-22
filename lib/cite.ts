/** Visible cite line. Host and page title only — never a numeric score. */
const PUBLISHERS: Record<string, string> = {
  "soundguys.com": "SoundGuys",
  "rtings.com": "RTINGS",
};

export function citeSourceLabel(url: string, productName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Source";
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const publisher = PUBLISHERS[host] ?? publisherFromHost(host);
  const review = /review/i.test(parsed.pathname);
  const name = productName.trim();
  const page = name || pageFromPath(parsed.pathname);
  if (!page) return `Source: ${publisher}`;
  return `Source: ${publisher} — ${page}${review ? " review" : ""}`;
}

function publisherFromHost(host: string): string {
  const label = host.split(".")[0] ?? host;
  if (label.length <= 5) return label.toUpperCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function pageFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  const words = decodeURIComponent(segment)
    .replace(/-\d+$/, "")
    .replace(/-review$/i, "")
    .split(/[-_]+/)
    .filter((word) => word && !/^\d+$/.test(word));
  if (words.length === 0) return "";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
