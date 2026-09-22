export type Thresholds = {
  anc: boolean | null;
  bluetooth: boolean | null;
  call_mic: boolean | null;
  wired_3_5mm: boolean | null;
  foldable: boolean | null;
  battery_hours_min: number | null;
  weight_g_max: number | null;
  warranty_years_min: number | null;
  max_price_usd: number | null;
};

export type RequiredThresholds = {
  anc?: boolean;
  bluetooth?: boolean;
  call_mic?: boolean;
  wired_3_5mm?: boolean;
  foldable?: boolean;
  battery_hours_min?: number;
  weight_g_max?: number;
  warranty_years_min?: number;
};

export type SoftDefaults = {
  anc?: boolean;
  bluetooth?: boolean;
  call_mic?: boolean;
  wired_3_5mm?: boolean;
  foldable?: boolean;
  weight_g_max?: number;
};

export type JobPreset = {
  id: string;
  name: string;
  blurb: string;
  required: RequiredThresholds;
  soft: SoftDefaults;
  default_max_usd: number | null;
};

export const MUST_HAVE_ATTRS = [
  "anc",
  "battery_hours",
  "weight_g",
  "bluetooth",
  "wired_3_5mm",
  "call_mic",
  "warranty_years",
  "foldable",
] as const;

export type MustHaveAttr = (typeof MUST_HAVE_ATTRS)[number];

export type AttrKey = MustHaveAttr | "anc_quality_cite_url" | "anc_quality_note";

export type AttrValue = boolean | number | string;

export type Attr = {
  value: AttrValue;
  source: string;
  as_of: string;
};

export type Product = {
  sku_id: string;
  name: string;
  brand: string;
  asin: string | null;
  bestbuy_sku: string | null;
  price: {
    street_price_usd: number;
    source: string;
    as_of: string;
  } | null;
  attrs: Partial<Record<AttrKey, Attr>>;
};

export type FailedBar = {
  key: string;
  message: string;
};

export type ProvenanceEntry = {
  attr_key: string;
  value: AttrValue;
  source: string;
  as_of: string;
};

/** Copyable decision. Soft defaults are not pass/fail fields. */
export type EnoughRecord = {
  job: { id: string; name: string };
  thresholds: Thresholds;
  winner: { id: string; name: string; price: number; as_of: string } | null;
  cheaper_rejects: Array<{
    id: string;
    name: string;
    price: number;
    failed_bars: FailedBar[];
  }>;
  provenance: ProvenanceEntry[];
};

export type EnoughOutcome = {
  record: EnoughRecord;
  cleared: number;
  eligible: number;
  excluded_ids: string[];
};
