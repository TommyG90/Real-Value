import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { presetById, thresholdsFromPreset } from "../data/presets";
import { enough } from "./enough";
import { CSV_HEADERS, loadSeed, parseCsv, seedPath } from "./seed";

const seed = loadSeed();
const products = [...seed.eligible, ...seed.excluded];

function run(id: string) {
  const preset = presetById(id);
  assert.ok(preset);
  return enough({ id: preset.id, name: preset.name }, thresholdsFromPreset(preset), products);
}

test("csv is the 23-SKU catalog", () => {
  const text = readFileSync(seedPath("headphones.csv"), "utf8");
  const first = text.split(/\r?\n/)[0].split(",");
  assert.deepEqual(first, [...CSV_HEADERS]);
  const rows = parseCsv(text);
  assert.equal(rows.length, 23);
  assert.equal(seed.eligible.length, 23);
  assert.deepEqual(seed.excluded, []);
  assert.equal(
    products.some((item) => item.sku_id.startsWith("fixture-")),
    false,
  );
});

test("commute picks Edifier WH700NB at $39.99", () => {
  const result = run("commute");
  assert.equal(result.record.winner?.id, "edifier-wh700nb");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 15);
  assert.deepEqual(result.record.cheaper_rejects, []);
  assert.deepEqual(result.excluded_ids, []);
  assert.ok(result.record.provenance.some((item) => item.attr_key === "street_price_usd"));
});

test("wfh also lands on Edifier WH700NB", () => {
  const result = run("wfh");
  assert.equal(result.record.winner?.id, "edifier-wh700nb");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 18);
  assert.deepEqual(result.record.cheaper_rejects, []);
});

test("travel picks TOZO HT2, the cheapest pair that clears the wired bar", () => {
  const result = run("travel");
  assert.equal(result.record.winner?.id, "tozo-ht2");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 15);
  assert.deepEqual(result.record.cheaper_rejects, []);
});

test("soft defaults do not change the winner", () => {
  const preset = presetById("travel");
  assert.ok(preset);
  const result = enough(
    { id: preset.id, name: preset.name },
    thresholdsFromPreset(preset),
    products,
  );
  assert.equal(result.record.winner?.id, "tozo-ht2");
  assert.equal(preset.soft.call_mic, false);
  assert.equal(preset.soft.weight_g_max, 280);
});

test("custom with empty bars returns the cheapest eligible SKU", () => {
  const result = run("custom");
  assert.equal(result.record.winner?.id, "edifier-wh700nb");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 23);
  assert.equal(result.record.cheaper_rejects.length, 0);
  assert.deepEqual(result.record.thresholds.anc, null);
  assert.equal(result.record.thresholds.max_price_usd, null);
});
