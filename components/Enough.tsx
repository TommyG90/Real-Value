"use client";

import { useEffect, useState, useTransition } from "react";
import { decide } from "@/app/actions";
import { emptyThresholds, presets, thresholdsFromPreset } from "@/data/presets";
import { track } from "@/lib/track";
import type { CatalogSpan, EnoughOutcome, JobPreset, SoftDefaults, Thresholds } from "@/lib/types";

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
        <Result
          preset={preset}
          result={result}
          thresholds={thresholds}
          soft={soft}
          onEdit={() => setStep("bars")}
        />
      )}
    </main>
  );
}

function Result({
  preset,
  result,
  thresholds,
  soft,
  onEdit,
}: {
  preset: JobPreset;
  result: EnoughOutcome;
  thresholds: Thresholds;
  soft: { on: string[]; off: string[] };
  onEdit: () => void;
}) {
  const winner = result.record.winner;
  const missed = result.eligible - result.cleared;
  const cheaper = result.record.cheaper_rejects;

  return (
    <section className="result">
      <div className="toolbar">
        <button className="ghost" type="button" onClick={onEdit}>
          Edit bar
        </button>
        <p className="meta">{preset.name}</p>
      </div>

      {winner ? (
        <article className="hero">
          <ProductPhoto name={winner.name} url={result.images?.[winner.id] ?? null} size="hero" />
          <p className="kicker">Enough for {preset.name}</p>
          <h1>{winner.name}</h1>
          <p className="price">{money(winner.price)}</p>
          <p className="why">{decisionWhy(result)}</p>
        </article>
      ) : (
        <article className="hero empty">
          <p className="kicker">Nothing cleared the bar</p>
          <h1>No pair was enough</h1>
          <p className="why">No pair met every must-have. Loosen a bar, or leave a number blank to turn it off.</p>
        </article>
      )}

      <dl className="pool">
        <div>
          <dt>Considered</dt>
          <dd>{result.eligible}</dd>
        </div>
        <div>
          <dt>Cleared</dt>
          <dd>{result.cleared}</dd>
        </div>
        <div>
          <dt>Missed</dt>
          <dd>{missed}</dd>
        </div>
      </dl>
      <p className="hint pool-note">{barSummary(thresholds)}</p>
      {result.excluded_ids.length > 0 && (
        <p className="hint">
          {result.excluded_ids.length === 1
            ? "1 pair was left out because a must-have spec was missing."
            : `${result.excluded_ids.length} pairs were left out because a must-have spec was missing.`}
        </p>
      )}

      {(result.ranges.battery_hours || result.ranges.weight_g) && (
        <section className="spans">
          <h2>In this catalog</h2>
          <p className="hint">Low and high are the pairs that were considered. The mark is this pick.</p>
          {result.ranges.battery_hours && (
            <SpanBar label="Battery" unit="h" span={result.ranges.battery_hours} sense="longer" />
          )}
          {result.ranges.weight_g && (
            <SpanBar label="Weight" unit="g" span={result.ranges.weight_g} sense="heavier" />
          )}
        </section>
      )}

      <h2>{winner ? "Cheaper pairs that missed" : "What missed"}</h2>
      {cheaper.length === 0 ? (
        <p className="lede">
          {winner ? "No cheaper pair missed the bar." : "No considered pair missed a bar."}
        </p>
      ) : (
        <ul className="rejects">
          {cheaper.map((reject) => (
            <li key={reject.id} className="reject">
              <ProductPhoto name={reject.name} url={result.images?.[reject.id] ?? null} size="thumb" />
              <div>
                <header>
                  <strong>{reject.name}</strong>
                  <span>{money(reject.price)}</span>
                </header>
                {reject.failed_bars.map((bar) => (
                  <p key={bar.key}>{bar.message}</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {winner && missed > cheaper.length && (
        <p className="hint">
          {cheaper.length === 0
            ? "Other pairs missed and cost the same or more."
            : "Other pairs also missed. They cost the same or more, so they were not a cheaper way through."}
        </p>
      )}

      {(soft.on.length > 0 || soft.off.length > 0) && (
        <aside className="soft">
          <strong>Nice to have</strong>
          <p>Shown for context. They did not decide this pick.</p>
          {soft.on.length > 0 && <p>On: {soft.on.join(", ")}</p>}
          {soft.off.length > 0 && <p>Off: {soft.off.join(", ")}</p>}
        </aside>
      )}
    </section>
  );
}

function decisionWhy(result: EnoughOutcome): string {
  if (!result.record.winner) return "No pair met every must-have.";
  if (result.same_price_count > 1) {
    return `The cheapest price that met every must-have. ${result.same_price_count} pairs tie at this price, so the earlier catalog id is shown.`;
  }
  return "The cheapest pair that met every must-have.";
}

function ProductPhoto({
  name,
  url,
  size,
}: {
  name: string;
  url: string | null;
  size: "hero" | "thumb";
}) {
  const className = size === "hero" ? "photo photo-hero" : "photo photo-thumb";
  if (url) {
    return <img className={className} src={url} alt="" />;
  }
  return (
    <div className={`${className} placeholder`} role="img" aria-label={`No catalog photo for ${name}`}>
      <HeadphoneMark />
      {size === "hero" && <span>No catalog photo yet</span>}
    </div>
  );
}

function HeadphoneMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M12 34v-6a20 20 0 0 1 40 0v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="8" y="32" width="10" height="18" rx="3" fill="currentColor" />
      <rect x="46" y="32" width="10" height="18" rx="3" fill="currentColor" />
    </svg>
  );
}

function SpanBar({
  label,
  unit,
  span,
  sense,
}: {
  label: string;
  unit: string;
  span: CatalogSpan;
  sense: string;
}) {
  const width = span.high - span.low;
  const pct = width === 0 ? 50 : ((span.winner - span.low) / width) * 100;
  const caption = `${label} ${formatStat(span.winner)} ${unit}. Among the pairs considered, the range is ${formatStat(span.low)} to ${formatStat(span.high)} ${unit}.`;
  return (
    <div className="span">
      <div className="span-top">
        <span>{label}</span>
        <strong>
          {formatStat(span.winner)} {unit}
        </strong>
      </div>
      <div className="track" role="img" aria-label={caption}>
        <span className="marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="span-ends">
        <span>{formatStat(span.low)}</span>
        <span>{sense}</span>
        <span>{formatStat(span.high)}</span>
      </div>
    </div>
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
