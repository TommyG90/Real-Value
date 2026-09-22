"use server";

import { catalog } from "@/data/catalog";
import { presetById } from "@/data/presets";
import { enough } from "@/lib/enough";
import type { EnoughResult, JobId, Thresholds } from "@/lib/types";

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function boolOrNull(value: unknown): boolean | null {
  return value === true ? true : null;
}

export async function decide(input: {
  jobId: JobId;
  thresholds: Thresholds;
}): Promise<EnoughResult> {
  const preset = presetById(input.jobId);
  if (!preset) {
    throw new Error("Unknown job");
  }

  const thresholds: Thresholds = {
    anc: boolOrNull(input.thresholds.anc),
    bluetooth: boolOrNull(input.thresholds.bluetooth),
    call_mic: boolOrNull(input.thresholds.call_mic),
    wired_3_5mm: boolOrNull(input.thresholds.wired_3_5mm),
    foldable: boolOrNull(input.thresholds.foldable),
    battery_hours_min: finiteOrNull(input.thresholds.battery_hours_min),
    weight_g_max: finiteOrNull(input.thresholds.weight_g_max),
    warranty_years_min: finiteOrNull(input.thresholds.warranty_years_min),
    max_price_usd: finiteOrNull(input.thresholds.max_price_usd),
  };

  const result = enough(
    {
      job: { id: preset.id, label: preset.label, soft: preset.soft },
      thresholds,
    },
    catalog,
  );

  console.info(
    JSON.stringify({
      event: "enough_decision",
      job: preset.id,
      winner: result.record.winner?.id ?? null,
      price: result.record.price?.amount_usd ?? null,
      cleared: result.cleared,
      rejects: result.record.rejects.length,
    }),
  );

  return result;
}
