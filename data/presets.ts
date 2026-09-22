import seed from "@/data/seed/job_presets.json";
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

/** Presets are the seed file. The page only renders this list. */
export const presets = seed as JobPreset[];

export function presetById(id: string): JobPreset | undefined {
  return presets.find((preset) => preset.id === id);
}

export function thresholdsFromPreset(preset: JobPreset): Thresholds {
  const required = preset.required;
  return {
    anc: required.anc === true ? true : null,
    bluetooth: required.bluetooth === true ? true : null,
    call_mic: required.call_mic === true ? true : null,
    wired_3_5mm: required.wired_3_5mm === true ? true : null,
    foldable: required.foldable === true ? true : null,
    battery_hours_min: required.battery_hours_min ?? null,
    weight_g_max: required.weight_g_max ?? null,
    warranty_years_min: required.warranty_years_min ?? null,
    max_price_usd: preset.default_max_usd,
  };
}
