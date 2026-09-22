import {
  MUST_HAVE_ATTRS,
  type Attr,
  type EnoughOutcome,
  type FailedBar,
  type Product,
  type ProvenanceEntry,
  type Thresholds,
} from "@/lib/types";
import { missingMustHaves } from "@/lib/seed";

type BarKey =
  | "max_price_usd"
  | "anc"
  | "bluetooth"
  | "call_mic"
  | "wired_3_5mm"
  | "foldable"
  | "battery_hours"
  | "weight_g"
  | "warranty_years";

const BAR_ORDER: BarKey[] = [
  "max_price_usd",
  "anc",
  "bluetooth",
  "call_mic",
  "wired_3_5mm",
  "foldable",
  "battery_hours",
  "weight_g",
  "warranty_years",
];

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function requireBoolean(
  key: BarKey,
  label: string,
  required: boolean | null,
  field: Attr | undefined,
): FailedBar | null {
  if (required !== true) return null;
  if (!field || typeof field.value !== "boolean") {
    return { key, message: `${label} is missing, so this pair can't clear a bar that requires it.` };
  }
  if (field.value !== true) {
    return { key, message: `${label} is no. The bar requires it.` };
  }
  return null;
}

function requireMin(
  key: BarKey,
  label: string,
  min: number | null,
  field: Attr | undefined,
  format: (value: number) => string,
): FailedBar | null {
  if (min === null) return null;
  if (!field || typeof field.value !== "number") {
    return {
      key,
      message: `${label} is missing, so this pair can't clear a minimum of ${format(min)}.`,
    };
  }
  if (field.value < min) {
    return {
      key,
      message: `${label} is ${format(field.value)}. The bar is at least ${format(min)}.`,
    };
  }
  return null;
}

function requireMax(
  key: BarKey,
  label: string,
  max: number | null,
  field: Attr | undefined,
  format: (value: number) => string,
): FailedBar | null {
  if (max === null) return null;
  if (!field || typeof field.value !== "number") {
    return {
      key,
      message: `${label} is missing, so this pair can't clear a maximum of ${format(max)}.`,
    };
  }
  if (field.value > max) {
    return {
      key,
      message: `${label} is ${format(field.value)}. The bar is at most ${format(max)}.`,
    };
  }
  return null;
}

export function failedBars(product: Product, thresholds: Thresholds): FailedBar[] {
  const price = product.price?.street_price_usd;
  const checks: Array<FailedBar | null> = [
    thresholds.max_price_usd === null || price === undefined
      ? price === undefined && thresholds.max_price_usd !== null
        ? { key: "max_price_usd", message: "Street price is missing." }
        : null
      : cents(price) > cents(thresholds.max_price_usd)
        ? {
            key: "max_price_usd",
            message: `Street price is ${money(price)}. The bar is at most ${money(thresholds.max_price_usd)}.`,
          }
        : null,
    requireBoolean("anc", "Active noise cancelling", thresholds.anc, product.attrs.anc),
    requireBoolean("bluetooth", "Bluetooth", thresholds.bluetooth, product.attrs.bluetooth),
    requireBoolean("call_mic", "Call mic", thresholds.call_mic, product.attrs.call_mic),
    requireBoolean(
      "wired_3_5mm",
      "Wired 3.5 mm",
      thresholds.wired_3_5mm,
      product.attrs.wired_3_5mm,
    ),
    requireBoolean("foldable", "Foldable", thresholds.foldable, product.attrs.foldable),
    requireMin(
      "battery_hours",
      "Battery",
      thresholds.battery_hours_min,
      product.attrs.battery_hours,
      (value) => `${value} h`,
    ),
    requireMax(
      "weight_g",
      "Weight",
      thresholds.weight_g_max,
      product.attrs.weight_g,
      (value) => `${value} g`,
    ),
    requireMin(
      "warranty_years",
      "Warranty",
      thresholds.warranty_years_min,
      product.attrs.warranty_years,
      (value) => (value === 1 ? "1 year" : `${value} years`),
    ),
  ];
  return checks
    .filter((item): item is FailedBar => item !== null)
    .sort((a, b) => BAR_ORDER.indexOf(a.key as BarKey) - BAR_ORDER.indexOf(b.key as BarKey));
}

function provenanceFor(product: Product): ProvenanceEntry[] {
  const entries: ProvenanceEntry[] = [];
  if (product.price) {
    entries.push({
      attr_key: "street_price_usd",
      value: product.price.street_price_usd,
      source: product.price.source,
      as_of: product.price.as_of,
    });
  }
  for (const key of MUST_HAVE_ATTRS) {
    const attr = product.attrs[key];
    if (!attr) continue;
    entries.push({
      attr_key: key,
      value: attr.value,
      source: attr.source,
      as_of: attr.as_of,
    });
  }
  for (const key of ["anc_quality_cite_url", "anc_quality_note"] as const) {
    const attr = product.attrs[key];
    if (!attr) continue;
    entries.push({
      attr_key: key,
      value: attr.value,
      source: attr.source,
      as_of: attr.as_of,
    });
  }
  return entries;
}

function byPrice(a: Product, b: Product): number {
  const left = a.price?.street_price_usd ?? Number.POSITIVE_INFINITY;
  const right = b.price?.street_price_usd ?? Number.POSITIVE_INFINITY;
  const delta = cents(left) - cents(right);
  if (delta !== 0) return delta;
  return a.sku_id < b.sku_id ? -1 : a.sku_id > b.sku_id ? 1 : 0;
}

/**
 * Cheapest eligible SKU that clears the applied thresholds.
 * A SKU missing any must-have attribute is excluded before the bar runs.
 * Soft defaults are not read.
 */
export function enough(
  job: { id: string; name: string },
  thresholds: Thresholds,
  products: Product[],
): EnoughOutcome {
  const excluded = products.filter((product) => missingMustHaves(product).length > 0);
  const eligible = products.filter((product) => missingMustHaves(product).length === 0);
  const judged = eligible.map((product) => ({
    product,
    failed: failedBars(product, thresholds),
  }));
  const passers = judged
    .filter((item) => item.failed.length === 0)
    .map((item) => item.product)
    .sort(byPrice);
  const winner = passers[0] ?? null;
  const winnerCents = winner?.price ? cents(winner.price.street_price_usd) : null;

  const cheaper_rejects = judged
    .filter((item) => item.failed.length > 0)
    .filter((item) => {
      if (winnerCents === null) return true;
      const price = item.product.price?.street_price_usd;
      return price !== undefined && cents(price) < winnerCents;
    })
    .sort((a, b) => byPrice(a.product, b.product))
    .map((item) => ({
      id: item.product.sku_id,
      name: item.product.name,
      price: item.product.price?.street_price_usd ?? 0,
      failed_bars: item.failed,
    }));

  return {
    record: {
      job,
      thresholds,
      winner: winner?.price
        ? {
            id: winner.sku_id,
            name: winner.name,
            price: winner.price.street_price_usd,
            as_of: winner.price.as_of,
          }
        : null,
      cheaper_rejects,
      provenance: winner ? provenanceFor(winner) : [],
    },
    cleared: passers.length,
    eligible: eligible.length,
    excluded_ids: excluded.map((product) => product.sku_id),
  };
}
