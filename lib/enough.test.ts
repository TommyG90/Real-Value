import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../data/catalog";
import { presetById } from "../data/presets";
import { enough, failedBars } from "./enough";
import type { Product, Thresholds } from "./types";

function run(id: "commute" | "wfh" | "travel" | "custom") {
  const preset = presetById(id);
  assert.ok(preset);
  return enough(
    {
      job: { id: preset.id, label: preset.label, soft: preset.soft },
      thresholds: preset.thresholds,
    },
    catalog,
  );
}

test("seed has 25 over-ear SKUs and no lab scores", () => {
  assert.equal(catalog.length, 25);
  const blob = JSON.stringify(catalog);
  assert.equal(blob.includes("rtings"), false);
  assert.equal(/\/\s*10/.test(blob), false);
  assert.equal(blob.toLowerCase().includes("stars"), false);
});

test("commute picks the cheapest pair that clears the bar", () => {
  const result = run("commute");
  assert.equal(result.record.winner?.id, "anker-soundcore-life-q30");
  assert.equal(result.record.price?.amount_usd, 59.99);
  assert.equal(result.record.rejects.length, 0);
  assert.ok(result.cleared >= 1);
  assert.equal(result.record.provenance?.anc.value, true);
  assert.equal(result.record.provenance?.warranty_years.value, 1.5);
});

test("wfh also lands on Life Q30 because the mic bar is met", () => {
  const result = run("wfh");
  assert.equal(result.record.winner?.id, "anker-soundcore-life-q30");
  assert.equal(result.record.price?.amount_usd, 59.99);
});

test("travel skips cheaper pairs that miss wired, fold, or warranty", () => {
  const result = run("travel");
  assert.equal(result.record.winner?.id, "jbl-tune-770nc");
  assert.equal(result.record.price?.amount_usd, 89.95);
  const ids = result.record.rejects.map((item) => item.id);
  assert.deepEqual(ids, ["anker-soundcore-life-q30", "edifier-w820nb-plus"]);
  const q30 = result.record.rejects[0];
  assert.ok(q30.failed_bars.some((bar) => bar.key === "wired_3_5mm"));
  const edifier = result.record.rejects[1];
  assert.ok(edifier.failed_bars.some((bar) => bar.key === "wired_3_5mm"));
  assert.ok(edifier.failed_bars.some((bar) => bar.key === "foldable"));
  assert.ok(edifier.failed_bars.some((bar) => bar.key === "warranty_years"));
});

test("soft weight does not knock out a heavier pair that clears travel", () => {
  const result = run("travel");
  const crusher = catalog.find((item) => item.id === "skullcandy-crusher-anc-2");
  assert.ok(crusher);
  assert.equal(failedBars(crusher, result.record.thresholds).length, 0);
  assert.equal(
    result.record.rejects.some((item) => item.id === crusher.id),
    false,
  );
  assert.notEqual(result.record.winner?.id, crusher.id);
});

test("QC Ultra 2 misses the travel battery bar on the lab ANC-on figure", () => {
  const preset = presetById("travel");
  assert.ok(preset);
  const ultra = catalog.find((item) => item.id === "bose-quietcomfort-ultra-2nd-gen");
  assert.ok(ultra);
  const failed = failedBars(ultra, preset.thresholds).map((bar) => bar.key);
  assert.ok(failed.includes("battery_hours"));
  assert.ok(failed.includes("max_price_usd"));
});

test("XM5 does not fold, so it misses travel even with 30 h and ANC", () => {
  const preset = presetById("travel");
  assert.ok(preset);
  const xm5 = catalog.find((item) => item.id === "sony-wh-1000xm5");
  assert.ok(xm5);
  const failed = failedBars(xm5, preset.thresholds).map((bar) => bar.key);
  assert.ok(failed.includes("foldable"));
  assert.ok(failed.includes("wired_3_5mm"));
});

test("custom with empty bars returns the cheapest SKU", () => {
  const result = run("custom");
  assert.equal(result.record.winner?.id, "anker-soundcore-life-q30");
  assert.equal(result.cleared, catalog.length);
  assert.equal(result.record.rejects.length, 0);
});

test("a price cap under every SKU returns no winner and lists the cap miss", () => {
  const preset = presetById("custom");
  assert.ok(preset);
  const thresholds: Thresholds = { ...preset.thresholds, max_price_usd: 40 };
  const result = enough(
    { job: { id: "custom", label: "Custom", soft: {} }, thresholds },
    catalog,
  );
  assert.equal(result.record.winner, null);
  assert.equal(result.record.price, null);
  assert.equal(result.record.provenance, null);
  assert.equal(result.record.rejects[0]?.id, "anker-soundcore-life-q30");
  assert.equal(result.record.rejects[0]?.failed_bars[0]?.key, "max_price_usd");
  assert.equal(result.record.rejects.length, catalog.length);
});

test("soft preferences do not change the winner", () => {
  const preset = presetById("commute");
  assert.ok(preset);
  const flipped = enough(
    {
      job: {
        id: "commute",
        label: preset.label,
        soft: { foldable: false, anc: false, weight_g_max: 1 },
      },
      thresholds: preset.thresholds,
    },
    catalog,
  );
  assert.equal(flipped.record.winner?.id, "anker-soundcore-life-q30");
});

test("tie breaks on id and a missing must-have fails only when the bar is on", () => {
  const cheap: Product = {
    id: "b-cheap",
    brand: "B",
    name: "Cheap",
    form: "over-ear",
    price: {
      amount_usd: 50,
      currency: "USD",
      retailer: "amazon",
      source: "https://example.test/b",
      as_of: "2026-09-22",
    },
    anc: { value: true, source: "https://example.test/b", as_of: "2026-09-22" },
    bluetooth: { value: true, source: "https://example.test/b", as_of: "2026-09-22" },
  };
  const also: Product = {
    ...cheap,
    id: "a-also",
    brand: "A",
    name: "Also",
    price: { ...cheap.price, source: "https://example.test/a" },
  };
  const thresholds: Thresholds = {
    anc: true,
    bluetooth: null,
    call_mic: null,
    wired_3_5mm: null,
    foldable: null,
    battery_hours_min: null,
    weight_g_max: null,
    warranty_years_min: null,
    max_price_usd: null,
  };
  const result = enough(
    { job: { id: "custom", label: "Custom", soft: {} }, thresholds },
    [cheap, also],
  );
  assert.equal(result.record.winner?.id, "a-also");
  assert.equal(failedBars(cheap, { ...thresholds, call_mic: true })[0]?.key, "call_mic");
  assert.equal(failedBars(cheap, thresholds).length, 0);
});
