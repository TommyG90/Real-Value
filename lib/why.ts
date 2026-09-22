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

/** Locked hero line. M is how many pairs cleared. */
export function whyLine(outcome: EnoughOutcome): string {
  if (!outcome.record.winner) return "No pair cleared every bar.";
  return `Cheapest of the ${outcome.cleared} that cleared every bar.`;
}
