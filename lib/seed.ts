import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogImage } from "@/lib/images";
import { MUST_HAVE_ATTRS, type Attr, type AttrKey, type Product } from "@/lib/types";

const BOOLEAN_ATTRS = new Set<AttrKey>([
  "anc",
  "bluetooth",
  "wired_3_5mm",
  "call_mic",
  "foldable",
]);

const NUMBER_ATTRS = new Set<AttrKey>(["battery_hours", "weight_g", "warranty_years"]);

const TEXT_ATTRS = new Set<AttrKey>(["anc_quality_cite_url", "anc_quality_note"]);

export const CSV_HEADERS = [
  "sku_id",
  "name",
  "brand",
  "asin",
  "bestbuy_sku",
  "street_price_usd",
  "street_price_source",
  "street_price_as_of",
  "anc",
  "anc_source",
  "anc_as_of",
  "anc_quality_cite_url",
  "anc_quality_note",
  "battery_hours",
  "battery_hours_source",
  "battery_hours_as_of",
  "weight_g",
  "weight_g_source",
  "weight_g_as_of",
  "bluetooth",
  "bluetooth_source",
  "bluetooth_as_of",
  "wired_3_5mm",
  "wired_3_5mm_source",
  "wired_3_5mm_as_of",
  "call_mic",
  "call_mic_source",
  "call_mic_as_of",
  "warranty_years",
  "warranty_years_source",
  "warranty_years_as_of",
  "foldable",
  "foldable_source",
  "foldable_as_of",
  "image_url",
  "image_source_url",
  "image_rights",
  "image_as_of",
] as const;

export function seedPath(name: string): string {
  return path.join(process.cwd(), "data", "seed", name);
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows = parseRows(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return [];
  const headers = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseBool(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "yes" || value === "1") return true;
  if (value === "false" || value === "no" || value === "0") return false;
  return null;
}

function parseNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function cited(row: Record<string, string>, key: AttrKey): Attr | null {
  const raw = row[key] ?? "";
  if (raw.trim() === "") return null;
  const source = row[`${key}_source`] ?? "";
  const asOf = row[`${key}_as_of`] ?? "";
  if (BOOLEAN_ATTRS.has(key)) {
    const value = parseBool(raw);
    if (value === null || source === "" || asOf === "") return null;
    return { value, source, as_of: asOf };
  }
  if (NUMBER_ATTRS.has(key)) {
    const value = parseNumber(raw);
    if (value === null || source === "" || asOf === "") return null;
    return { value, source, as_of: asOf };
  }
  if (TEXT_ATTRS.has(key)) {
    if (source === "" || asOf === "") return { value: raw, source: "fixture", as_of: row.street_price_as_of };
    return { value: raw, source, as_of: asOf };
  }
  return null;
}

export function productFromRow(row: Record<string, string>): Product {
  const price = parseNumber(row.street_price_usd ?? "");
  const attrs: Product["attrs"] = {};
  for (const key of [...MUST_HAVE_ATTRS, "anc_quality_cite_url", "anc_quality_note"] as AttrKey[]) {
    if (key === "anc_quality_cite_url" || key === "anc_quality_note") {
      const raw = (row[key] ?? "").trim();
      if (raw === "") continue;
      attrs[key] = {
        value: raw,
        source: row.anc_source || "fixture",
        as_of: row.anc_as_of || row.street_price_as_of || "",
      };
      continue;
    }
    const attr = cited(row, key);
    if (attr) attrs[key] = attr;
  }
  const cite = (row.anc_quality_cite_url ?? "").trim();
  attrs.anc_cited = {
    value: cite.length > 0,
    source: cite.length > 0 ? cite : "derived from empty anc_quality_cite_url",
    as_of: row.anc_as_of || row.street_price_as_of || "",
  };
  return {
    sku_id: row.sku_id,
    name: row.name,
    brand: row.brand,
    asin: row.asin || null,
    bestbuy_sku: row.bestbuy_sku || null,
    image_url: catalogImage({ image: row.image_url ?? "" }, "image"),
    price:
      price === null || !row.street_price_source || !row.street_price_as_of
        ? null
        : {
            street_price_usd: price,
            source: row.street_price_source,
            as_of: row.street_price_as_of,
          },
    attrs,
  };
}

export function missingMustHaves(product: Product): string[] {
  const missing: string[] = [];
  if (!product.price) missing.push("street_price_usd");
  for (const key of MUST_HAVE_ATTRS) {
    if (!product.attrs[key]) missing.push(key);
  }
  return missing;
}

export function catalogFromCsv(text: string): { eligible: Product[]; excluded: Product[] } {
  const products = parseCsv(text).map(productFromRow).filter((product) => product.sku_id);
  return {
    eligible: products.filter((product) => missingMustHaves(product).length === 0),
    excluded: products.filter((product) => missingMustHaves(product).length > 0),
  };
}

export function loadSeed(): { eligible: Product[]; excluded: Product[] } {
  return catalogFromCsv(readFileSync(seedPath("headphones.csv"), "utf8"));
}
