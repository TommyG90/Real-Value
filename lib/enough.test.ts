import assert from "node:assert/strict";
import test from "node:test";
import { presetById, thresholdsFromPreset } from "../data/presets";
import { enough } from "./enough";
import { CSV_HEADERS, loadSeed, parseCsv } from "./seed";
import { readFileSync } from "node:fs";
import { seedPath } from "./seed";

const seed = loadSeed();
const products = [...seed.eligible, ...seed.excluded];

function run(id: string) {
  const preset = presetById(id);
  assert.ok(preset);
  return enough({ id: preset.id, name: preset.name }, thresholdsFromPreset(preset), products);
}

test("csv headers match the Data contract", () => {
  const text = readFileSync(seedPath("headphones.csv"), "utf8");
  const header = parseCsv(`${text.split(/\r?\n/)[0]}\n`).length;
  const first = text.split(/\r?\n/)[0].split(",");
  assert.deepEqual(first, [...CSV_HEADERS]);
  assert.equal(header, 0);
  assert.equal(seed.eligible.length, 4);
  assert.deepEqual(
    seed.excluded.map((item) => item.sku_id),
    ["fixture-gap"],
  );
});

test("commute picks the cheapest eligible pair and rejects the heavier cheaper one", () => {
  const result = run("commute");
  assert.equal(result.record.winner?.id, "fixture-budget");
  assert.equal(result.record.winner?.price, 89);
  assert.deepEqual(
    result.record.cheaper_rejects.map((item) => item.id),
    ["fixture-heavy"],
  );
  assert.equal(result.record.cheaper_rejects[0]?.failed_bars[0]?.key, "weight_g");
  assert.equal(result.excluded_ids.includes("fixture-gap"), true);
  assert.equal(
    result.record.cheaper_rejects.some((item) => item.id === "fixture-gap"),
    false,
  );
  assert.ok(result.record.provenance.some((item) => item.attr_key === "street_price_usd"));
});

test("wfh requires the mic and still lands on Fixture Budget", () => {
  const result = run("wfh");
  assert.equal(result.record.winner?.id, "fixture-budget");
  assert.equal(result.record.cheaper_rejects[0]?.id, "fixture-heavy");
  assert.ok(result.record.cheaper_rejects[0]?.failed_bars.some((bar) => bar.key === "call_mic"));
});

test("travel skips cheaper pairs that miss fold, wired, or battery", () => {
  const result = run("travel");
  assert.equal(result.record.winner?.id, "fixture-travel");
  assert.equal(result.record.winner?.price, 159);
  assert.deepEqual(
    result.record.cheaper_rejects.map((item) => item.id),
    ["fixture-heavy", "fixture-budget"],
  );
});

test("soft defaults do not change the winner", () => {
  const preset = presetById("travel");
  assert.ok(preset);
  const result = enough(
    { id: preset.id, name: preset.name },
    thresholdsFromPreset(preset),
    products,
  );
  assert.equal(result.record.winner?.id, "fixture-travel");
  assert.equal(preset.soft.call_mic, false);
  assert.equal(preset.soft.weight_g_max, 280);
});

test("custom with empty bars returns the cheapest eligible SKU", () => {
  const result = run("custom");
  assert.equal(result.record.winner?.id, "fixture-heavy");
  assert.equal(result.record.winner?.price, 59);
  assert.equal(result.cleared, 4);
  assert.equal(result.record.cheaper_rejects.length, 0);
  assert.deepEqual(result.record.thresholds.anc, null);
  assert.equal(result.record.thresholds.max_price_usd, null);
});
