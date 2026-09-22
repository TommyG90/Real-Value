import { createClient } from "@supabase/supabase-js";
import presets from "../data/seed/job_presets.json";
import { MUST_HAVE_ATTRS, type AttrKey, type JobPreset } from "../lib/types";
import { loadSeed, missingMustHaves } from "../lib/seed";

const seed = loadSeed();
const all = [...seed.eligible, ...seed.excluded];

console.info(
  `headphones.csv: ${seed.eligible.length} eligible, ${seed.excluded.length} excluded for a missing must-have`,
);
for (const product of seed.excluded) {
  console.info(`  excluded ${product.sku_id}: ${missingMustHaves(product).join(", ")}`);
}

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.info(
    "SUPABASE_URL and SUPABASE_SECRET_KEY are unset. Validated the seed only. Set both to load project real-value.",
  );
  process.exit(0);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function load(): Promise<void> {
  const skuIds = all.map((product) => product.sku_id);

  const clearedAttrs = await supabase.from("product_attributes").delete().in("sku_id", skuIds);
  if (clearedAttrs.error) throw clearedAttrs.error;
  const clearedPrices = await supabase.from("prices").delete().in("sku_id", skuIds);
  if (clearedPrices.error) throw clearedPrices.error;

  const products = all.map((product) => ({
    sku_id: product.sku_id,
    name: product.name,
    brand: product.brand,
    asin: product.asin,
    bestbuy_sku: product.bestbuy_sku,
  }));
  const upsertedProducts = await supabase.from("products").upsert(products);
  if (upsertedProducts.error) throw upsertedProducts.error;

  const attributes = all.flatMap((product) =>
    (
      Object.entries(product.attrs) as Array<
        [AttrKey, { value: boolean | number | string; source: string; as_of: string }]
      >
    ).map(([attr_key, attr]) => ({
      sku_id: product.sku_id,
      attr_key,
      value: attr.value,
      source: attr.source,
      as_of: attr.as_of,
    })),
  );
  const insertedAttrs = await supabase.from("product_attributes").insert(attributes);
  if (insertedAttrs.error) throw insertedAttrs.error;

  const prices = all
    .filter((product) => product.price)
    .map((product) => ({
      sku_id: product.sku_id,
      street_price_usd: product.price!.street_price_usd,
      source: product.price!.source,
      as_of: product.price!.as_of,
    }));
  const insertedPrices = await supabase.from("prices").insert(prices);
  if (insertedPrices.error) throw insertedPrices.error;

  const jobRows = (presets as JobPreset[]).map((preset) => ({
    id: preset.id,
    name: preset.name,
    required: preset.required,
    soft: preset.soft,
    default_max_usd: preset.default_max_usd,
  }));
  const upsertedJobs = await supabase.from("job_presets").upsert(jobRows);
  if (upsertedJobs.error) throw upsertedJobs.error;

  console.info(
    `Loaded ${products.length} products, ${attributes.length} attributes, ${prices.length} prices, ${jobRows.length} presets.`,
  );
  console.info(`Must-have attrs: ${MUST_HAVE_ATTRS.join(", ")}`);
}

load().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
