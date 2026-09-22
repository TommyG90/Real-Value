"use client";

import { useEffect, useState, useTransition } from "react";
import { decide } from "@/app/actions";
import { emptyThresholds, presets, thresholdsFromPreset } from "@/data/presets";
import { track } from "@/lib/track";
import type {
  EnoughOutcome,
  JobPreset,
  ProvenanceEntry,
  SoftDefaults,
  Thresholds,
} from "@/lib/types";

const ATTR_LABELS: Record<string, string> = {
  street_price_usd: "Street price",
  anc: "Active noise cancelling",
  battery_hours: "Battery hours",
  weight_g: "Weight (g)",
  bluetooth: "Bluetooth",
  wired_3_5mm: "Wired 3.5 mm",
  call_mic: "Call mic",
  warranty_years: "Warranty years",
  foldable: "Foldable",
  anc_quality_cite_url: "ANC cite",
  anc_quality_note: "ANC note",
};

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatValue(value: ProvenanceEntry["value"]): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
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
  const [copied, setCopied] = useState(false);
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
    setCopied(false);
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
    setCopied(false);
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

  async function copyRecord() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.record, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
        <section>
          <div className="toolbar">
            <button className="ghost" type="button" onClick={() => setStep("bars")}>
              Edit bar
            </button>
            <p className="meta">
              {result.cleared} of {result.eligible} eligible clear
            </p>
          </div>
          <h1>{preset.name}</h1>
          <p className="lede">{barSummary(thresholds)}</p>
          {result.excluded_ids.length > 0 && (
            <p className="hint">
              Excluded for a missing must-have: {result.excluded_ids.join(", ")}.
            </p>
          )}
          {result.record.winner ? (
            <article className="card winner">
              <p className="kicker">The cheapest that clears your bar</p>
              <h2>{result.record.winner.name}</h2>
              <p className="price">{money(result.record.winner.price)}</p>
              <p className="hint">Street price as of {result.record.winner.as_of}</p>
            </article>
          ) : (
            <article className="card empty">
              <p className="kicker">Nothing cleared the bar</p>
              <p>Loosen a must-have, or leave a number blank to turn that bar off.</p>
            </article>
          )}

          <h2>{result.record.winner ? "Why not cheaper" : "What missed"}</h2>
          {result.record.cheaper_rejects.length === 0 ? (
            <p className="lede">No cheaper pair missed this bar.</p>
          ) : (
            <ul className="rejects">
              {result.record.cheaper_rejects.map((reject) => (
                <li key={reject.id} className="reject">
                  <header>
                    <strong>{reject.name}</strong>
                    <span>{money(reject.price)}</span>
                  </header>
                  {reject.failed_bars.map((bar) => (
                    <p key={bar.key} className="fail">
                      {bar.message}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}

          {result.record.provenance.length > 0 && (
            <>
              <h2>Provenance</h2>
              <ul className="provenance">
                {result.record.provenance.map((entry) => (
                  <li key={entry.attr_key}>
                    <strong>{ATTR_LABELS[entry.attr_key] ?? entry.attr_key}</strong>
                    <p>
                      {formatValue(entry.value)} · as of {entry.as_of}
                    </p>
                    <small>
                      {entry.source.startsWith("http") ? (
                        <a href={entry.source}>{entry.source}</a>
                      ) : (
                        entry.source
                      )}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(soft.on.length > 0 || soft.off.length > 0) && (
            <aside className="soft">
              <strong>Nice to have</strong>
              <p>Not used to pass or fail.</p>
              {soft.on.length > 0 && <p>On: {soft.on.join(", ")}</p>}
              {soft.off.length > 0 && <p>Off: {soft.off.join(", ")}</p>}
            </aside>
          )}

          <div className="json">
            <div className="toolbar">
              <h2>Decision record</h2>
              <button className="ghost" type="button" onClick={copyRecord}>
                Copy JSON
              </button>
            </div>
            {copied && <p className="copied">Copied.</p>}
            <pre>{JSON.stringify(result.record, null, 2)}</pre>
          </div>
        </section>
      )}
      <p className="meta">
        Fixture seed in data/seed/headphones.csv. A SKU missing a must-have is excluded.
      </p>
    </main>
  );
}

function barSummary(thresholds: Thresholds): string {
  const parts: string[] = [];
  if (thresholds.anc) parts.push("ANC");
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
