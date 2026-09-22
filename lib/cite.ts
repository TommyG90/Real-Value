/** Publisher from the cite URL host only. Never a score, never a CSV label. */
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
  const name = productName.trim();
  if (!name) return `Source: ${publisher}`;
  return `Source: ${publisher} — ${name} review`;
}

function publisherFromHost(host: string): string {
  const label = host.split(".")[0] ?? host;
  if (label.length <= 5) return label.toUpperCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}
