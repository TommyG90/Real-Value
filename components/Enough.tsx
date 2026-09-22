"use client";

import { useEffect, useState, useTransition } from "react";
import { decide } from "@/app/actions";
import { emptyThresholds, presets, thresholdsFromPreset } from "@/data/presets";
import { whyLine } from "@/lib/why";
import { track } from "@/lib/track";
import type { CatalogSpan, EnoughOutcome, EnoughRecord, JobPreset, SoftDefaults, Thresholds } from "@/lib/types";

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function softNotes(soft: SoftDefaults): { on: string[]; off: string[] } {
  const on: string[] = [];
  const off: string[] = [];
  const flags: Array<[keyof SoftDefaults, string]> = [
    ["anc", "ANC"],
    ["bluetooth", "Bluetooth"],
    ["call_mic", "Call mic"],
    ["wired_3_5mm", "Wired 3.5 mm"],
    ["foldable", "Foldable"],
  ];
  for (const [key, label] of flags) {
    if (soft[key] === true) on.push(label);
    if (soft[key] === false) off.push(label);
  }
  if (soft.weight_g_max !== undefined) on.push(`Weight at most ${soft.weight_g_max} g`);
  return { on, off };
}

export function Enough() {
  const [preset, setPreset] = useState<JobPreset | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds>(emptyThresholds);
  const [step, setStep] = useState<"job" | "bars" | "result">("job");
  const [result, setResult] = useState<EnoughOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    track("session_started");
  }, []);

  useEffect(() => {
    if (step === "job" || step === "result") window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    if (step === "result" && result) {
      track("result_shown", {
        job: result.record.job.id,
        winner: result.record.winner?.id ?? null,
      });
    }
  }, [step, result]);

  function choose(next: JobPreset) {
    setPreset(next);
    setThresholds(thresholdsFromPreset(next));
    setResult(null);
    setError(null);
    setStep("bars");
  }

  function edit(next: Thresholds) {
    setThresholds(next);
    track("thresholds_changed", { job: preset?.id ?? null });
  }

  function updateNumber(key: keyof Thresholds, raw: string) {
    edit({
      ...thresholds,
      [key]: raw.trim() === "" ? null : Number(raw),
    });
  }

  function run() {
    if (!preset) return;
    setError(null);
    startTransition(async () => {
      try {
        const next = await decide({ jobId: preset.id, thresholds });
        setResult(next);
        setStep("result");
      } catch {
        setError("Enough couldn't finish that decision. Try the bar again.");
      }
    });
  }

  const soft = softNotes(preset?.soft ?? {});

  return (
    <main className="app">
      <header className="mark">
        <div>
          <p className="eyebrow">Real Value</p>
          <strong>Enough</strong>
        </div>
        <p>Cheapest that meets the bar</p>
      </header>

      {step === "job" && (
        <section>
          <h1>What are the headphones for?</h1>
          <p className="lede">
            Pick a job, set the bar, and get the one cheapest pair that clears it.
          </p>
          <div className="jobs">
            {presets.map((job) => (
              <button key={job.id} className="job" type="button" onClick={() => choose(job)}>
                <span>Job</span>
                <strong>{job.name}</strong>
                <em>{job.blurb}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "bars" && preset && (
        <section>
          <div className="toolbar">
            <button className="ghost" type="button" onClick={() => setStep("job")}>
              Jobs
            </button>
            <p className="meta">{preset.name}</p>
          </div>
          <h1>Set the bar</h1>
          <p className="lede">
            Checked rows are must-haves. A SKU missing any must-have attribute is
            excluded. Empty numbers turn that bar off.
          </p>
          <div className="bars">
            <BooleanBar
              label="Active noise cancelling"
              checked={thresholds.anc === true}
              onChange={(on) => edit({ ...thresholds, anc: on ? true : null })}
            />
            <BooleanBar
              label="ANC cited"
              checked={thresholds.anc_cited === true}
              onChange={(on) => edit({ ...thresholds, anc_cited: on ? true : null })}
            />
            <BooleanBar
              label="Bluetooth"
              checked={thresholds.bluetooth === true}
              onChange={(on) => edit({ ...thresholds, bluetooth: on ? true : null })}
            />
            <BooleanBar
              label="Call mic"
              checked={thresholds.call_mic === true}
              onChange={(on) => edit({ ...thresholds, call_mic: on ? true : null })}
            />
            <BooleanBar
              label="Wired 3.5 mm"
              checked={thresholds.wired_3_5mm === true}
              onChange={(on) => edit({ ...thresholds, wired_3_5mm: on ? true : null })}
            />
            <BooleanBar
              label="Foldable"
              checked={thresholds.foldable === true}
              onChange={(on) => edit({ ...thresholds, foldable: on ? true : null })}
            />
            <NumberBar
              label="Battery at least"
              suffix="hours"
              value={thresholds.battery_hours_min}
              onChange={(raw) => updateNumber("battery_hours_min", raw)}
            />
            <NumberBar
              label="Weight at most"
              suffix="grams"
              value={thresholds.weight_g_max}
              onChange={(raw) => updateNumber("weight_g_max", raw)}
            />
            <NumberBar
              label="Warranty at least"
              suffix="years"
              value={thresholds.warranty_years_min}
              onChange={(raw) => updateNumber("warranty_years_min", raw)}
            />
            <NumberBar
              label="Street price at most"
              suffix="USD"
              value={thresholds.max_price_usd}
              onChange={(raw) => updateNumber("max_price_usd", raw)}
            />
          </div>
          <aside className="soft">
            <strong>Nice to have</strong>
            {soft.on.length === 0 && soft.off.length === 0 ? (
              <p>None for this job. Nice-to-haves never pass or fail.</p>
            ) : (
              <>
                <p>Shown for context. They do not decide the pick.</p>
                {soft.on.length > 0 && (
                  <p>On: {soft.on.join(", ")}</p>
                )}
                {soft.off.length > 0 && <p>Off: {soft.off.join(", ")}</p>}
              </>
            )}
          </aside>
          {error && <p className="fail">{error}</p>}
          <button className="primary" type="button" onClick={run} disabled={pending}>
            {pending ? "Checking the bar…" : "Find what’s enough"}
          </button>
        </section>
      )}

      {step === "result" && result && preset && (
        <Result preset={preset} result={result} onEdit={() => setStep("bars")} />
      )}
    </main>
  );
}

function Result({
  preset,
  result,
  onEdit,
}: {
  preset: JobPreset;
  result: EnoughOutcome;
  onEdit: () => void;
}) {
  const winner = result.record.winner;
  const cite = citeHref(result);

  return (
    <section className="result">
      <div className="toolbar">
        <button className="ghost" type="button" onClick={onEdit}>
          Edit bar
        </button>
        <p className="meta">{preset.name}</p>
      </div>

      <article className={winner ? "hero" : "hero empty"}>
        {winner ? (
          <ProductPhoto name={winner.name} url={result.image_url} />
        ) : null}
        <p className="kicker">{winner ? "Enough" : "Nothing cleared the bar"}</p>
        <h1>{winner ? winner.name : "No pair was enough"}</h1>
        {winner && <p className="price">{money(winner.price)}</p>}
        <p className="why">{whyLine(result)}</p>
        {cite && (
          <a className="cite" href={cite}>
            lab cite
          </a>
        )}
      </article>

      <p className="pool-line">
        {result.eligible} considered · {result.cleared} cleared the bar
      </p>
      {result.fail_reasons.length > 0 && (
        <p className="hint">Didn’t clear: {result.fail_reasons.join(" / ")}</p>
      )}

      {(result.ranges.battery_hours || result.ranges.weight_g) && (
        <section className="spans">
          {result.ranges.battery_hours && (
            <SpanBar
              label="Battery"
              unit="h"
              span={result.ranges.battery_hours}
              catalogSize={result.eligible}
            />
          )}
          {result.ranges.weight_g && (
            <SpanBar
              label="Weight"
              unit="g"
              span={result.ranges.weight_g}
              catalogSize={result.eligible}
            />
          )}
        </section>
      )}

      <CopyResult record={result.record} />
    </section>
  );
}

function citeHref(result: EnoughOutcome): string | null {
  const entry = result.record.provenance.find((item) => item.attr_key === "anc_quality_cite_url");
  if (!entry || typeof entry.value !== "string") return null;
  const url = entry.value.trim();
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return null;
}

function ProductPhoto({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img className="photo photo-hero" src={url} alt="" />;
  }
  return (
    <div className="photo photo-hero placeholder" role="img" aria-label={`No photo for ${name}`}>
      <strong>{initials(name)}</strong>
      <span>No photo</span>
    </div>
  );
}

function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.map((word) => word[0]).slice(0, 2);
  return letters.join("").toUpperCase() || "—";
}

function SpanBar({
  label,
  unit,
  span,
  catalogSize,
}: {
  label: string;
  unit: string;
  span: CatalogSpan;
  catalogSize: number;
}) {
  const width = span.high - span.low;
  const pct = width === 0 ? 50 : ((span.winner - span.low) / width) * 100;
  const caption = `${label} ${formatStat(span.winner)} ${unit}. In our catalog of ${catalogSize}, the range is ${formatStat(span.low)} to ${formatStat(span.high)}.`;
  return (
    <div className="span">
      <div className="span-top">
        <span>{label}</span>
        <span>in our catalog of {catalogSize}</span>
      </div>
      <div className="track" role="img" aria-label={caption}>
        <span className="tick tick-start" />
        <span className="tick tick-end" />
        <span className="marker" style={{ left: `${pct}%` }}>
          <span className="mark-value">
            {formatStat(span.winner)} {unit}
          </span>
        </span>
      </div>
      <div className="span-ends">
        <span>{formatStat(span.low)}</span>
        <span>{formatStat(span.high)}</span>
      </div>
    </div>
  );
}

function CopyResult({ record }: { record: EnoughRecord }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(record, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="copy" type="button" onClick={copy}>
      {copied ? "Copied" : "Copy structured result"}
    </button>
  );
}

function formatStat(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function barSummary(thresholds: Thresholds): string {
  const parts: string[] = [];
  if (thresholds.anc) parts.push("ANC");
  if (thresholds.anc_cited) parts.push("ANC cited");
  if (thresholds.bluetooth) parts.push("Bluetooth");
  if (thresholds.call_mic) parts.push("call mic");
  if (thresholds.wired_3_5mm) parts.push("wired 3.5 mm");
  if (thresholds.foldable) parts.push("foldable");
  if (thresholds.battery_hours_min !== null) {
    parts.push(`battery ≥ ${thresholds.battery_hours_min} h`);
  }
  if (thresholds.weight_g_max !== null) parts.push(`weight ≤ ${thresholds.weight_g_max} g`);
  if (thresholds.warranty_years_min !== null) {
    parts.push(`warranty ≥ ${thresholds.warranty_years_min} y`);
  }
  if (thresholds.max_price_usd !== null) parts.push(`at most ${money(thresholds.max_price_usd)}`);
  if (parts.length === 0) return "No must-have bars. The cheapest eligible pair wins.";
  return `Must-haves: ${parts.join(", ")}.`;
}

function BooleanBar({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <fieldset className="bar">
      <label className="check">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </fieldset>
  );
}

function NumberBar({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number | null;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="bar">
      <span>
        {label}
        <small> {suffix}</small>
      </span>
      <input
        inputMode="decimal"
        type="number"
        min={0}
        step="any"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
