# Real Value · Enough

Enough answers one question: **what is the cheapest over-ear pair that meets this bar?**

Pick a job, edit the must-have thresholds, and get the cheapest pair that clears them. The page shows how many pairs were considered, why that one won, and where its battery and weight sit in this catalog. `enough()` still returns the structured record for later agents. There is no account, no public API, and no ranked compare list.

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run build` produces the production build.

The page reads `data/seed/` on the server. No environment variables are required until you load Postgres.

## Environment

Copy `.env.example` when the Supabase project **real-value** exists.

| Variable | Where it is used |
| --- | --- |
| `SUPABASE_URL` | `npm run load-seed` only |
| `SUPABASE_SECRET_KEY` | `npm run load-seed` only. Never expose this in the browser. |

Leave both blank until the project ref exists. The UI reads `data/seed/headphones.csv` offline.

## Jobs

Presets live in `data/seed/job_presets.json`, not in the React tree. Soft defaults never pass or fail.

| Job | Required | Soft on | Soft off | Max |
| --- | --- | --- | --- | --- |
| Commute ANC | ANC, ANC cited, Bluetooth, battery ≥ 20 h, weight ≤ 300 g, warranty ≥ 1 year | Foldable | Call mic, wired 3.5 mm | $200 |
| WFH calls | Call mic, Bluetooth, battery ≥ 20 h, warranty ≥ 1 year | ANC, weight ≤ 320 g | Foldable, wired 3.5 mm | $250 |
| Travel | ANC, ANC cited, foldable, wired 3.5 mm, Bluetooth, battery ≥ 30 h, warranty ≥ 1 year | Weight ≤ 280 g | Call mic | $300 |
| Custom | None | None | None | None |

## CSV ingest

Data lands in `data/seed/headphones.csv`. Headers:

```text
sku_id,name,brand,asin,bestbuy_sku,street_price_usd,street_price_source,street_price_as_of,anc,anc_source,anc_as_of,anc_quality_cite_url,anc_quality_note,battery_hours,battery_hours_source,battery_hours_as_of,weight_g,weight_g_source,weight_g_as_of,bluetooth,bluetooth_source,bluetooth_as_of,wired_3_5mm,wired_3_5mm_source,wired_3_5mm_as_of,call_mic,call_mic_source,call_mic_as_of,warranty_years,warranty_years_source,warranty_years_as_of,foldable,foldable_source,foldable_as_of,image_url,image_source_url,image_rights,image_as_of
```

Must-haves are street price, ANC, battery hours, weight, Bluetooth, wired 3.5 mm, call mic, warranty years, and foldable, each with `source` and `as_of`. `anc_quality_cite_url` and `anc_quality_note` are optional and are not scores. At catalog load, `anc_cited` is true only when that cite URL is non-empty after trim. Commute and Travel require it. An empty cite fails that bar and stays in the catalog. A blank must-have excludes that SKU from Enough.

The file is the validated 23-SKU catalog. Every row has the must-have attributes, so all 23 are eligible.

## Photos

`image_url` is optional for the decision. A missing or blank cell shows initials and “No photo”. The current catalog fills it for all 23 SKUs. `image_rights` is `prototype_hotlink`: fine to display from the source URL, not cleared to download and re-host. `anc_quality_cite_url`, when present, is a “lab cite” link. It is never shown as a numeric ANC score.

Apply the schema, then load the CSV and presets:

```bash
# In the real-value project: supabase/migrations/20260922120000_catalog.sql
export SUPABASE_URL=...
export SUPABASE_SECRET_KEY=...
npm run load-seed
```

Without those variables the script only validates the CSV. With them it upserts `products`, `product_attributes`, `prices`, and `job_presets`.

## Decision

`enough(job, thresholds)` in `lib/enough.ts` is the only decision function. The page calls it through the `decide` server action.

The record still has `job`, `thresholds`, `winner` (`id`, `name`, `price`, `as_of`), `cheaper_rejects`, and `provenance`. The results screen does not print that record or the `as_of` dates. A discreet “Copy structured result” control copies it. Battery and weight ranges are the low and high of the pairs that were considered.

The browser logs `session_started`, `thresholds_changed`, and `result_shown`.

## Tables

`supabase/migrations/20260922120000_catalog.sql`

- `products` — `sku_id`, `name`, `brand`, `asin`, `bestbuy_sku`
- `product_attributes` — `sku_id`, `attr_key`, `value`, `source`, `as_of`
- `prices` — `sku_id`, `street_price_usd`, `source`, `as_of`
- `job_presets` — `id`, `name`, `required`, `soft`, `default_max_usd`

RLS is on. `anon` and `authenticated` can select. They cannot write.

## Out of scope

Public API or MCP, a browser extension, a ranked compare hub, accounts, scrapers, and a multi-retailer price graph.
