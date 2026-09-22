import type { JobPreset, Thresholds } from "@/lib/types";

export const emptyThresholds: Thresholds = {
  anc: null,
  bluetooth: null,
  call_mic: null,
  wired_3_5mm: null,
  foldable: null,
  battery_hours_min: null,
  weight_g_max: null,
  warranty_years_min: null,
  max_price_usd: null,
};

/**
 * Locked jobs live in data, not in the component tree.
 * `thresholds` are must-have bars. `soft` is never a pass/fail.
 */
export const presets: JobPreset[] = [
  {
    id: "commute",
    label: "Commute ANC",
    summary: "Noise cancelling on the train. Foldable is nice, not required.",
    thresholds: {
      ...emptyThresholds,
      anc: true,
      bluetooth: true,
      battery_hours_min: 20,
      weight_g_max: 300,
      warranty_years_min: 1,
      max_price_usd: 200,
    },
    soft: { foldable: true },
  },
  {
    id: "wfh",
    label: "WFH calls",
    summary: "A mic you can take a call on. ANC and a lighter pair are nice.",
    thresholds: {
      ...emptyThresholds,
      call_mic: true,
      bluetooth: true,
      battery_hours_min: 20,
      warranty_years_min: 1,
      max_price_usd: 250,
    },
    soft: { anc: true, weight_g_max: 320 },
  },
  {
    id: "travel",
    label: "Travel",
    summary: "ANC, folds, and a wired jack for the plane. Lighter is nice.",
    thresholds: {
      ...emptyThresholds,
      anc: true,
      foldable: true,
      wired_3_5mm: true,
      bluetooth: true,
      battery_hours_min: 30,
      warranty_years_min: 1,
      max_price_usd: 300,
    },
    soft: { weight_g_max: 280 },
  },
  {
    id: "custom",
    label: "Custom",
    summary: "Every must-have starts empty. Turn on only the bars you mean.",
    thresholds: { ...emptyThresholds },
    soft: {},
  },
];

export function presetById(id: string): JobPreset | undefined {
  return presets.find((preset) => preset.id === id);
}
