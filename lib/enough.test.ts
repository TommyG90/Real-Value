import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { presetById, thresholdsFromPreset } from "../data/presets";
import { enough } from "./enough";
import { whyLine } from "./why";
import { catalogImage } from "./images";
import { CSV_HEADERS, loadSeed, parseCsv, productFromRow, seedPath } from "./seed";

const seed = loadSeed();
const products = [...seed.eligible, ...seed.excluded];

function run(id: string) {
  const preset = presetById(id);
  assert.ok(preset);
  return enough({ id: preset.id, name: preset.name }, thresholdsFromPreset(preset), products);
}

function reject(result: ReturnType<typeof run>, id: string) {
  return result.record.cheaper_rejects.find((item) => item.id === id);
}

test("csv is the 23-SKU catalog", () => {
  const text = readFileSync(seedPath("headphones.csv"), "utf8");
  const first = text.split(/\r?\n/)[0].split(",");
  assert.deepEqual(first, [...CSV_HEADERS]);
  const rows = parseCsv(text);
  assert.equal(rows.length, 23);
  assert.equal(seed.eligible.length, 23);
  assert.deepEqual(seed.excluded, []);
  const cited = products.filter((item) => item.attrs.anc_cited?.value === true);
  assert.equal(cited.length, 17);
  assert.equal(products.length - cited.length, 6);
  assert.equal(
    products.some((item) => item.sku_id.startsWith("fixture-")),
    false,
  );
});

test("anc_cited is true only when the cite url is non-empty", () => {
  const cited = products.find((item) => item.sku_id === "soundcore-life-q30");
  const empty = products.find((item) => item.sku_id === "edifier-wh700nb");
  assert.equal(cited?.attrs.anc_cited?.value, true);
  assert.equal(typeof cited?.attrs.anc_cited?.value, "boolean");
  assert.equal(empty?.attrs.anc_cited?.value, false);
  const blank = productFromRow({
    sku_id: "blank-cite",
    name: "Blank",
    brand: "Blank",
    anc_quality_cite_url: "   ",
    anc_as_of: "2026-09-21",
  });
  assert.equal(blank.attrs.anc_cited?.value, false);
});

test("commute requires a cite and skips the empty-cite $40 pairs", () => {
  const result = run("commute");
  assert.equal(result.record.thresholds.anc_cited, true);
  assert.equal(result.record.winner?.id, "earfun-wave-pro");
  assert.equal(result.record.winner?.price, 79.99);
  assert.equal(result.cleared, 10);
  assert.equal(result.record.provenance.find((item) => item.attr_key === "anc_cited")?.value, true);
  for (const id of ["edifier-wh700nb", "tozo-ht2"]) {
    const missed = reject(result, id);
    assert.ok(missed);
    assert.ok(missed.failed_bars.some((bar) => bar.key === "anc_cited"));
  }
  assert.equal(reject(result, "soundcore-life-q30"), undefined);
});

test("wfh stays mic-first and does not require anc_cited", () => {
  const preset = presetById("wfh");
  assert.ok(preset);
  assert.equal(preset.required.anc_cited, undefined);
  const result = run("wfh");
  assert.equal(result.record.thresholds.anc_cited, null);
  assert.equal(result.record.winner?.id, "edifier-wh700nb");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 18);
  assert.deepEqual(result.record.cheaper_rejects, []);
});

test("travel requires a cite and does not crown TOZO HT2", () => {
  const result = run("travel");
  assert.equal(result.record.thresholds.anc_cited, true);
  assert.equal(result.record.winner?.id, "earfun-wave-pro");
  assert.equal(result.record.winner?.price, 79.99);
  assert.equal(result.cleared, 11);
  const tozo = reject(result, "tozo-ht2");
  const wh = reject(result, "edifier-wh700nb");
  assert.ok(tozo?.failed_bars.some((bar) => bar.key === "anc_cited"));
  assert.ok(wh?.failed_bars.some((bar) => bar.key === "anc_cited"));
  assert.ok(wh?.failed_bars.some((bar) => bar.key === "wired_3_5mm"));
});

test("soft defaults do not change the winner", () => {
  const preset = presetById("travel");
  assert.ok(preset);
  const result = enough(
    { id: preset.id, name: preset.name },
    thresholdsFromPreset(preset),
    products,
  );
  assert.equal(result.record.winner?.id, "earfun-wave-pro");
  assert.equal(preset.soft.call_mic, false);
  assert.equal(preset.soft.weight_g_max, 280);
  assert.equal(Object.hasOwn(preset.soft, "anc_cited"), false);
});

test("custom with empty bars returns the cheapest eligible SKU", () => {
  const result = run("custom");
  assert.equal(result.record.winner?.id, "edifier-wh700nb");
  assert.equal(result.record.winner?.price, 39.99);
  assert.equal(result.cleared, 23);
  assert.equal(result.record.cheaper_rejects.length, 0);
  assert.equal(result.record.thresholds.anc, null);
  assert.equal(result.record.thresholds.anc_cited, null);
  assert.equal(result.record.thresholds.max_price_usd, null);
});

test("ranges are the considered catalog and blank photos stay blank", () => {
  const result = run("commute");
  const winner = products.find((item) => item.sku_id === result.record.winner?.id);
  assert.ok(winner);
  for (const key of ["battery_hours", "weight_g"] as const) {
    const values = products.flatMap((item) => {
      const value = item.attrs[key]?.value;
      return typeof value === "number" ? [value] : [];
    });
    const span = result.ranges[key];
    assert.ok(span);
    assert.equal(span.low, Math.min(...values));
    assert.equal(span.high, Math.max(...values));
    assert.equal(span.winner, winner.attrs[key]?.value);
  }
  assert.equal(result.same_price_count, 2);
  assert.equal(result.ranges.battery_hours?.low, 24);
  assert.equal(result.ranges.battery_hours?.high, 65);
  assert.equal(result.ranges.weight_g?.low, 193);
  assert.equal(result.ranges.weight_g?.high, 296);
  assert.equal(result.image_url, winner.image_url);
  assert.match(result.image_url ?? "", /^https:\/\//);
  assert.equal(
    products.filter((item) => item.image_url?.startsWith("https://")).length,
    23,
  );
  assert.ok(result.fail_reasons.includes("missing cited ANC"));
  assert.equal(whyLine(result), `Cheapest of the ${result.cleared} that cleared every bar.`);
  for (const id of ["edifier-wh700nb", "tozo-ht2", "1more-sonoflow-pro"]) {
    const missed = reject(result, id);
    assert.ok(missed?.failed_bars.some((bar) => bar.key === "anc_cited"));
  }
  const withPhoto = productFromRow({
    sku_id: "photo",
    name: "Photo",
    brand: "Photo",
    image_url: "https://cdn.example/earfun.jpg",
    anc_quality_cite_url: "   ",
    anc_as_of: "2026-09-21",
  });
  assert.equal(withPhoto.image_url, "https://cdn.example/earfun.jpg");
  assert.equal(productFromRow({ sku_id: "blank", name: "Blank", brand: "Blank", image_url: " " }).image_url, null);
  assert.equal(productFromRow({ sku_id: "none", name: "None", brand: "None" }).image_url, null);
  assert.equal(catalogImage({ sku: "javascript:alert(1)" }, "sku"), null);
  assert.equal(catalogImage({ sku: "/catalog/earfun-wave-pro.jpg" }, "sku"), "/catalog/earfun-wave-pro.jpg");
});
