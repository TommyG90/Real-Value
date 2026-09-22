import type { Cited, Product } from "@/lib/types";

/**
 * Over-ear ANC seed. Facts are copied from the cited page on 2026-09-22.
 * Battery hours are SoundGuys "Battery Life Anc On", not a lab score.
 * Street price is the Amazon US price printed on that same SoundGuys page
 * (Best Buy did not respond from this environment). No review scores,
 * no star ratings, no attenuation curves.
 *
 * Wired 3.5 mm is set only when the page names that jack, or names another
 * wired connection and does not name 3.5 mm. A connection field that only
 * says "Bluetooth" is left missing — several lab pages omit an analog jack
 * the manufacturer still ships.
 *
 * Bose QuietComfort Ultra (1st gen) is omitted: on 2026-09-22 its SoundGuys
 * product page was mixed with earbud spec fields.
 */

export const CATALOG_AS_OF = "2026-09-22";

const WARRANTY_GUIDE =
  "https://www.soundguys.com/headphones-warranty-coverage-guide-62736/";
const WARRANTY_GUIDE_AS_OF = "2022-11-04";

const JBL_WARRANTY =
  "https://www.jbl.com/on/demandware.static/-/Library-Sites-SharedLibrary-JB/default/dwde9ae716/glp/warrantyandsafetybooks/images/TR04082_JBL_Global_Warranty_card_K_V15_EN.pdf";

const SKULLCANDY_WARRANTY =
  "https://support.skullcandy.com/hc/en-gb/articles/360008551494-Warranty-Policy";

const SONY_XM6_SPECS =
  "https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm6/specifications";

function page(slug: string): string {
  return `https://www.soundguys.com/product/${slug}/`;
}

function cited<T>(slug: string, value: T): Cited<T> {
  return { value, source: page(slug), as_of: CATALOG_AS_OF };
}

function warranty(
  years: number,
  source: string,
  asOf: string,
): Cited<number> {
  return { value: years, source, as_of: asOf };
}

const sonyWarranty = warranty(1, WARRANTY_GUIDE, WARRANTY_GUIDE_AS_OF);
const ankerWarranty = warranty(1.5, WARRANTY_GUIDE, WARRANTY_GUIDE_AS_OF);
const boseWarranty = warranty(1, WARRANTY_GUIDE, WARRANTY_GUIDE_AS_OF);
const sennheiserWarranty = warranty(2, WARRANTY_GUIDE, WARRANTY_GUIDE_AS_OF);
const appleWarranty = warranty(1, WARRANTY_GUIDE, WARRANTY_GUIDE_AS_OF);
const jblWarranty = warranty(1, JBL_WARRANTY, CATALOG_AS_OF);
const skullcandyWarranty = warranty(1, SKULLCANDY_WARRANTY, CATALOG_AS_OF);

type Row = {
  id: string;
  brand: string;
  name: string;
  price: number;
  battery: number;
  weight?: number;
  fold?: boolean;
  mic?: boolean;
  wired?: boolean;
  wiredSource?: Cited<boolean>;
  codecs?: string;
  multipoint?: string;
  warranty?: Cited<number>;
};

function product(row: Row): Product {
  const item: Product = {
    id: row.id,
    brand: row.brand,
    name: row.name,
    form: "over-ear",
    price: {
      amount_usd: row.price,
      currency: "USD",
      retailer: "amazon",
      source: page(row.id),
      as_of: CATALOG_AS_OF,
    },
    anc: cited(row.id, true),
    battery_hours: cited(row.id, row.battery),
    bluetooth: cited(row.id, true),
  };

  if (row.weight !== undefined) item.weight_g = cited(row.id, row.weight);
  if (row.fold !== undefined) item.foldable = cited(row.id, row.fold);
  if (row.mic !== undefined) item.call_mic = cited(row.id, row.mic);
  if (row.wiredSource) item.wired_3_5mm = row.wiredSource;
  else if (row.wired !== undefined) item.wired_3_5mm = cited(row.id, row.wired);
  if (row.warranty) item.warranty_years = row.warranty;
  if (row.codecs) item.codecs = cited(row.id, row.codecs);
  if (row.multipoint) item.multipoint = cited(row.id, row.multipoint);

  return item;
}

const rows: Row[] = [
  {
    id: "anker-soundcore-life-q30",
    brand: "Anker",
    name: "Soundcore Life Q30",
    price: 59.99,
    battery: 44.18,
    weight: 260,
    fold: true,
    mic: true,
    codecs: "AAC",
    multipoint: "2 devices",
    warranty: ankerWarranty,
  },
  {
    id: "edifier-w820nb-plus",
    brand: "Edifier",
    name: "W820NB Plus",
    price: 69.99,
    battery: 40,
    weight: 238,
    fold: false,
    mic: true,
    wired: false,
    codecs: "SBC, LDAC",
    multipoint: "2 devices",
  },
  {
    id: "jbl-tune-770nc",
    brand: "JBL",
    name: "Tune 770NC",
    price: 89.95,
    battery: 44,
    weight: 232,
    fold: true,
    mic: true,
    wired: true,
    codecs: "AAC, SBC",
    multipoint: "2 devices",
    warranty: jblWarranty,
  },
  {
    id: "sony-wh-ch720n",
    brand: "Sony",
    name: "WH-CH720N",
    price: 97.42,
    battery: 40,
    weight: 192,
    fold: false,
    mic: true,
    codecs: "SBC, AAC, LDAC",
    multipoint: "2 devices",
    warranty: sonyWarranty,
  },
  {
    id: "anker-soundcore-space-one",
    brand: "Anker",
    name: "Soundcore Space One",
    price: 99.99,
    battery: 40,
    weight: 263,
    fold: true,
    mic: true,
    wired: true,
    codecs: "LDAC",
    multipoint: "2 devices",
    warranty: ankerWarranty,
  },
  {
    id: "1more-sonoflow",
    brand: "1MORE",
    name: "SonoFlow",
    price: 113.04,
    battery: 50,
    weight: 255,
    fold: true,
    mic: true,
    codecs: "LDAC",
    multipoint: "2 devices",
  },
  {
    id: "jbl-live-770nc",
    brand: "JBL",
    name: "Live 770NC",
    price: 119.95,
    battery: 50,
    weight: 256,
    fold: true,
    mic: true,
    multipoint: "2 devices",
    warranty: jblWarranty,
  },
  {
    id: "anker-soundcore-space-q45",
    brand: "Anker",
    name: "Soundcore Space Q45",
    price: 139.99,
    battery: 50,
    weight: 292,
    fold: true,
    mic: true,
    wired: true,
    codecs: "SBC, AAC, LDAC",
    multipoint: "2 devices",
    warranty: ankerWarranty,
  },
  {
    id: "sony-ult-wear",
    brand: "Sony",
    name: "ULT WEAR",
    price: 144.95,
    battery: 30,
    weight: 255,
    fold: true,
    mic: true,
    wired: true,
    codecs: "SBC, AAC, LDAC",
    multipoint: "2 devices",
    warranty: sonyWarranty,
  },
  {
    id: "beats-studio-pro",
    brand: "Beats",
    name: "Studio Pro",
    price: 169.95,
    battery: 24,
    weight: 270,
    fold: true,
    mic: true,
    codecs: "SBC, AAC",
    multipoint: "2 devices",
    warranty: appleWarranty,
  },
  {
    id: "skullcandy-crusher-anc-2",
    brand: "Skullcandy",
    name: "Crusher ANC 2",
    price: 199.94,
    battery: 50,
    weight: 332,
    fold: true,
    mic: true,
    wired: true,
    codecs: "AAC, SBC",
    multipoint: "2 devices",
    warranty: skullcandyWarranty,
  },
  {
    id: "nothing-headphone-1",
    brand: "Nothing",
    name: "Headphone (1)",
    price: 219,
    battery: 42.88,
    weight: 310,
    fold: false,
    mic: true,
    codecs: "SBC, AAC, LDAC",
    multipoint: "2 devices",
  },
  {
    id: "sennheiser-momentum-4",
    brand: "Sennheiser",
    name: "MOMENTUM 4 Wireless",
    price: 229.95,
    battery: 60,
    weight: 293,
    fold: true,
    mic: true,
    codecs: "SBC, AAC, aptX, aptX Adaptive",
    multipoint: "2 devices",
    warranty: sennheiserWarranty,
  },
  {
    id: "sony-wh-1000xm5",
    brand: "Sony",
    name: "WH-1000XM5",
    price: 239.99,
    battery: 30,
    weight: 250,
    fold: false,
    mic: true,
    codecs: "AAC, LDAC, SBC",
    multipoint: "2 devices",
    warranty: sonyWarranty,
  },
  {
    id: "bowers-and-wilkins-px7-s2e",
    brand: "Bowers & Wilkins",
    name: "Px7 S2e",
    price: 286,
    battery: 41.17,
    weight: 309,
    fold: false,
    mic: true,
    codecs: "SBC, AAC, aptX, aptX HD, aptX Adaptive",
  },
  {
    id: "sonos-ace",
    brand: "Sonos",
    name: "Ace",
    price: 349,
    battery: 32,
    weight: 312,
    fold: false,
    mic: true,
    codecs: "SBC, AAC, aptX Lossless",
    multipoint: "2 devices",
  },
  {
    id: "sony-wh-1000xm4",
    brand: "Sony",
    name: "WH-1000XM4",
    price: 349.99,
    battery: 20,
    fold: true,
    codecs: "SBC, AAC, LDAC",
    multipoint: "2 devices",
    warranty: sonyWarranty,
  },
  {
    id: "bose-quietcomfort",
    brand: "Bose",
    name: "QuietComfort",
    price: 359,
    battery: 24,
    weight: 240,
    fold: true,
    mic: true,
    wired: true,
    codecs: "SBC, AAC, aptX, aptX Lossless",
    multipoint: "2 devices",
    warranty: boseWarranty,
  },
  {
    id: "technics-eah-a800",
    brand: "Technics",
    name: "EAH-A800",
    price: 365,
    battery: 30,
    weight: 298,
    fold: true,
    mic: true,
    codecs: "LDAC",
    multipoint: "2 devices",
  },
  {
    id: "shure-aonic-50-gen-2",
    brand: "Shure",
    name: "AONIC 50 Gen 2",
    price: 379.98,
    battery: 41.48,
    weight: 334,
    fold: false,
    mic: true,
    codecs: "SBC, AAC, LDAC, aptX, aptX HD, aptX Adaptive",
  },
  {
    id: "sony-wh-1000xm6",
    brand: "Sony",
    name: "WH-1000XM6",
    price: 390,
    battery: 30,
    weight: 254,
    fold: true,
    mic: true,
    wiredSource: {
      value: true,
      source: SONY_XM6_SPECS,
      as_of: CATALOG_AS_OF,
    },
    codecs: "SBC, AAC, LDAC, LC3",
    multipoint: "2 devices",
    warranty: sonyWarranty,
  },
  {
    id: "bose-quietcomfort-ultra-2nd-gen",
    brand: "Bose",
    name: "QuietComfort Ultra Headphones (2nd Gen)",
    price: 399.99,
    battery: 27.2,
    weight: 250,
    fold: true,
    mic: true,
    wired: true,
    codecs: "SBC, AAC, aptX Adaptive",
    multipoint: "2 devices",
    warranty: boseWarranty,
  },
  {
    id: "sennheiser-momentum-5",
    brand: "Sennheiser",
    name: "MOMENTUM 5 Wireless",
    price: 399.95,
    battery: 57,
    weight: 291,
    fold: false,
    mic: true,
    wired: true,
    codecs: "SBC, AAC, aptX, aptX Adaptive",
    multipoint: "2 devices",
    warranty: sennheiserWarranty,
  },
  {
    id: "apple-airpods-max-1st-gen",
    brand: "Apple",
    name: "AirPods Max (1st gen)",
    price: 449,
    battery: 20,
    weight: 384.8,
    fold: false,
    mic: true,
    wired: true,
    codecs: "AAC",
    multipoint: "2 devices",
    warranty: appleWarranty,
  },
  {
    id: "apple-airpods-max-2nd-gen",
    brand: "Apple",
    name: "AirPods Max (2nd gen)",
    price: 479,
    battery: 20,
    weight: 386,
    fold: false,
    mic: true,
    codecs: "SBC, AAC",
    multipoint: "2 devices",
    warranty: appleWarranty,
  },
];

export const catalog: Product[] = rows.map(product);
