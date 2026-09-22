# Real Value · Enough

Enough answers one question: **what is the cheapest over-ear pair that meets this bar?**

It does not rank a top five, republish lab scores, or talk you into a more expensive model. You pick a job, set must-have thresholds, and get one winner, the street price, the cheaper pairs that missed (and which bar they missed), provenance with `as_of`, and a copyable JSON record.

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run build` produces the production build. No environment variables and no account are required. The decision runs on the seed in `data/catalog.ts`.

## Jobs

Presets live in `data/presets.ts`.

| Job | Must-haves | Nice to have (never pass/fail) | Max price |
| --- | --- | --- | --- |
| Commute ANC | ANC, Bluetooth, battery ≥ 20 h, weight ≤ 300 g, warranty ≥ 1 year | Foldable | $200 |
| WFH calls | Call mic, Bluetooth, battery ≥ 20 h, warranty ≥ 1 year | ANC, weight ≤ 320 g | $250 |
| Travel | ANC, foldable, wired 3.5 mm, Bluetooth, battery ≥ 30 h, warranty ≥ 1 year | Weight ≤ 280 g | $300 |
| Custom | All bars start empty and editable | None | None |

A missing must-have fails that bar. Codecs and multipoint are stored when the cite has them and are never part of the bar.

## Seed

Twenty-five over-ear ANC headphones. Battery hours are SoundGuys **Battery Life Anc On** from each product page, captured 2026-09-22. That is a cited duration, not a SoundGuys or RTINGS score. Street price is the Amazon US price printed on the same page, because Best Buy did not respond from this environment. The price row names the retailer (`amazon`) and links the page.

Warranty years:

- Sony, Bose, Sennheiser, Anker, Apple, and Beats: [SoundGuys warranty guide](https://www.soundguys.com/headphones-warranty-coverage-guide-62736/) (updated 2022-11-04; 18 months for Anker is stored as 1.5 years)
- JBL: the Harman one-year limited warranty card
- Skullcandy: the one-year limited warranty policy

If a brand is not in those cites, warranty is missing and any warranty bar fails the SKU. Wired 3.5 mm is set only when the page names that jack, or names a different wired connection and does not name 3.5 mm. The WH-1000XM6 analog jack is cited to Sony’s spec page because the lab connection field only said Bluetooth.

Bose QuietComfort Ultra (1st gen) is omitted. On the capture date its SoundGuys product page was mixed with earbud spec fields.

## Decision

`enough()` in `lib/enough.ts` is the only decision function. The page calls it through the `decide` server action. There is no public API.

The copied JSON has `job`, `thresholds`, `winner`, `price`, `rejects`, `provenance`, and `as_of`.

Each decision also writes one JSON log line (`enough_decision`) for learning. That is the whole instrumentation surface.

## Supabase

`supabase/migrations/20260922120000_catalog.sql` maps the seed onto:

- `products`
- `product_attributes` (`key`, `value`, `source`, `as_of`)
- `prices` (`retailer`, `amount_cents`, `source`, `as_of`)

RLS is on. `anon` and `authenticated` can select. They cannot write. The MVP does not connect to a hosted database; apply the migration when a Real Value project exists, then load `data/catalog.ts` into those tables.

## Out of scope

Public API or MCP, a browser extension, a ranked compare hub, accounts, scrapers, a multi-retailer price graph, and republished lab scores.
