/** Must-have bars. Null means the bar is off and cannot pass or fail a SKU. */
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

/** Shown with the job. Never used to pass or fail in v1. */
export type SoftPrefs = {
  anc?: boolean;
  call_mic?: boolean;
  wired_3_5mm?: boolean;
  foldable?: boolean;
  weight_g_max?: number;
};

export type JobId = "commute" | "wfh" | "travel" | "custom";

export type JobPreset = {
  id: JobId;
  label: string;
  summary: string;
  thresholds: Thresholds;
  soft: SoftPrefs;
};

export type Cited<T> = {
  value: T;
  source: string;
  as_of: string;
};

export type Price = {
  amount_usd: number;
  currency: "USD";
  retailer: string;
  source: string;
  as_of: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  form: "over-ear";
  price: Price;
  anc?: Cited<boolean>;
  battery_hours?: Cited<number>;
  weight_g?: Cited<number>;
  bluetooth?: Cited<boolean>;
  wired_3_5mm?: Cited<boolean>;
  call_mic?: Cited<boolean>;
  warranty_years?: Cited<number>;
  foldable?: Cited<boolean>;
  codecs?: Cited<string>;
  multipoint?: Cited<string>;
};

export type ProvenanceField = {
  value: boolean | number | string | null;
  source: string | null;
  as_of: string | null;
};

export type FailedBar = {
  key: string;
  message: string;
};

export type Reject = {
  id: string;
  brand: string;
  name: string;
  price: Price;
  failed_bars: FailedBar[];
};

/** Copyable decision record. Nice-to-haves are not pass/fail fields. */
export type EnoughRecord = {
  job: {
    id: JobId;
    label: string;
    soft: SoftPrefs;
  };
  thresholds: Thresholds;
  winner: {
    id: string;
    brand: string;
    name: string;
  } | null;
  price: Price | null;
  rejects: Reject[];
  provenance: {
    street_price: ProvenanceField;
    anc: ProvenanceField;
    battery_hours: ProvenanceField;
    weight_g: ProvenanceField;
    bluetooth: ProvenanceField;
    wired_3_5mm: ProvenanceField;
    call_mic: ProvenanceField;
    warranty_years: ProvenanceField;
    foldable: ProvenanceField;
  } | null;
  as_of: string;
};

export type EnoughResult = {
  record: EnoughRecord;
  cleared: number;
  considered: number;
  nice: {
    codecs: ProvenanceField | null;
    multipoint: ProvenanceField | null;
  } | null;
};
