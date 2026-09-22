import { CATALOG_AS_OF } from "@/data/catalog";
import type {
  Cited,
  EnoughRecord,
  EnoughResult,
  FailedBar,
  Price,
  Product,
  ProvenanceField,
  SoftPrefs,
  Thresholds,
} from "@/lib/types";
import type { JobId } from "@/lib/types";

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

export type EnoughInput = {
  job: {
    id: JobId;
    label: string;
    soft: SoftPrefs;
  };
  thresholds: Thresholds;
  catalog?: Product[];
};

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function hours(value: number): string {
  const text = Number.isInteger(value) ? String(value) : String(value);
  return `${text} h`;
}

function cite(field: Cited<boolean | number | string> | undefined): ProvenanceField {
  if (!field) return { value: null, source: null, as_of: null };
  return { value: field.value, source: field.source, as_of: field.as_of };
}

function priceField(price: Price): ProvenanceField {
  return {
    value: price.amount_usd,
    source: price.source,
    as_of: price.as_of,
  };
}

function requireBoolean(
  key: BarKey,
  label: string,
  required: boolean | null,
  field: Cited<boolean> | undefined,
): FailedBar | null {
  if (required !== true) return null;
  if (!field) {
    return {
      key,
      message: `${label} is missing, so this pair can't clear a bar that requires it.`,
    };
  }
  if (field.value !== true) {
    return {
      key,
      message: `${label} is no. The bar requires it.`,
    };
  }
  return null;
}

function requireMin(
  key: BarKey,
  label: string,
  min: number | null,
  field: Cited<number> | undefined,
  format: (value: number) => string,
): FailedBar | null {
  if (min === null) return null;
  if (!field) {
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
  field: Cited<number> | undefined,
  format: (value: number) => string,
): FailedBar | null {
  if (max === null) return null;
  if (!field) {
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
  const checks: Array<FailedBar | null> = [
    thresholds.max_price_usd === null
      ? null
      : cents(product.price.amount_usd) > cents(thresholds.max_price_usd)
        ? {
            key: "max_price_usd",
            message: `Street price is ${money(product.price.amount_usd)}. The bar is at most ${money(thresholds.max_price_usd)}.`,
          }
        : null,
    requireBoolean("anc", "Active noise cancelling", thresholds.anc, product.anc),
    requireBoolean("bluetooth", "Bluetooth", thresholds.bluetooth, product.bluetooth),
    requireBoolean("call_mic", "Call mic", thresholds.call_mic, product.call_mic),
    requireBoolean(
      "wired_3_5mm",
      "Wired 3.5 mm",
      thresholds.wired_3_5mm,
      product.wired_3_5mm,
    ),
    requireBoolean("foldable", "Foldable", thresholds.foldable, product.foldable),
    requireMin(
      "battery_hours",
      "Battery",
      thresholds.battery_hours_min,
      product.battery_hours,
      hours,
    ),
    requireMax(
      "weight_g",
      "Weight",
      thresholds.weight_g_max,
      product.weight_g,
      (value) => `${value} g`,
    ),
    requireMin(
      "warranty_years",
      "Warranty",
      thresholds.warranty_years_min,
      product.warranty_years,
      (value) => `${value} years`,
    ),
  ];

  const failed = checks.filter((item): item is FailedBar => item !== null);
  return failed.sort(
    (a, b) => BAR_ORDER.indexOf(a.key as BarKey) - BAR_ORDER.indexOf(b.key as BarKey),
  );
}

function provenanceFor(product: Product): EnoughRecord["provenance"] {
  return {
    street_price: priceField(product.price),
    anc: cite(product.anc),
    battery_hours: cite(product.battery_hours),
    weight_g: cite(product.weight_g),
    bluetooth: cite(product.bluetooth),
    wired_3_5mm: cite(product.wired_3_5mm),
    call_mic: cite(product.call_mic),
    warranty_years: cite(product.warranty_years),
    foldable: cite(product.foldable),
  };
}

function byPrice(a: Product, b: Product): number {
  const delta = cents(a.price.amount_usd) - cents(b.price.amount_usd);
  if (delta !== 0) return delta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Cheapest SKU that clears every active must-have bar.
 * A missing must-have fails that bar. Nice-to-haves are not read.
 */
export function enough(input: EnoughInput, products: Product[]): EnoughResult {
  const judged = products.map((product) => ({
    product,
    failed: failedBars(product, input.thresholds),
  }));
  const passers = judged
    .filter((item) => item.failed.length === 0)
    .map((item) => item.product)
    .sort(byPrice);
  const winner = passers[0] ?? null;
  const winnerCents = winner ? cents(winner.price.amount_usd) : null;

  const rejects = judged
    .filter((item) => item.failed.length > 0)
    .filter((item) => {
      if (winnerCents === null) return true;
      return cents(item.product.price.amount_usd) < winnerCents;
    })
    .sort((a, b) => byPrice(a.product, b.product))
    .map((item) => ({
      id: item.product.id,
      brand: item.product.brand,
      name: item.product.name,
      price: item.product.price,
      failed_bars: item.failed,
    }));

  const record: EnoughRecord = {
    job: input.job,
    thresholds: input.thresholds,
    winner: winner
      ? { id: winner.id, brand: winner.brand, name: winner.name }
      : null,
    price: winner ? winner.price : null,
    rejects,
    provenance: winner ? provenanceFor(winner) : null,
    as_of: CATALOG_AS_OF,
  };

  return {
    record,
    cleared: passers.length,
    considered: products.length,
    nice: winner
      ? {
          codecs: winner.codecs ? cite(winner.codecs) : null,
          multipoint: winner.multipoint ? cite(winner.multipoint) : null,
        }
      : null,
  };
}
