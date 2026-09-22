import type { EnoughOutcome } from "@/lib/types";

export const FAIL_LABELS: Record<string, string> = {
  anc_cited: "missing cited ANC",
  anc: "no ANC",
  battery_hours: "failed battery",
  weight_g: "too heavy",
  bluetooth: "no Bluetooth",
  call_mic: "no call mic",
  wired_3_5mm: "no wired jack",
  foldable: "not foldable",
  warranty_years: "short warranty",
  max_price_usd: "over the price bar",
};

const LABEL_ORDER = [
  "max_price_usd",
  "anc",
  "anc_cited",
  "bluetooth",
  "call_mic",
  "wired_3_5mm",
  "foldable",
  "battery_hours",
  "weight_g",
  "warranty_years",
];

/** One sentence: cheapest that cleared, plus the cheaper pairs that did not. */
export function whyLine(outcome: EnoughOutcome): string {
  if (!outcome.record.winner) return "No pair cleared every required bar.";
  const rejects = outcome.record.cheaper_rejects;
  const others = outcome.same_price_count - 1;
  const tie =
    others > 0 ? `, tied with ${others} other ${others === 1 ? "pair" : "pairs"}` : "";
  if (rejects.length === 0) return `Cheapest that cleared every required bar${tie}.`;
  const names = joinNames(rejects.map((reject) => reject.name));
  const verb = rejects.length === 1 ? "was" : "were";
  const keys = [...new Set(rejects.flatMap((reject) => reject.failed_bars.map((bar) => bar.key)))].sort(
    (a, b) => LABEL_ORDER.indexOf(a) - LABEL_ORDER.indexOf(b),
  );
  const because = keys.map((key) => FAIL_LABELS[key] ?? key).join(" / ");
  return `Cheapest that cleared every required bar${tie}; ${names} ${verb} cheaper (${because}).`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
