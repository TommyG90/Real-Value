"use client";

import { useState, useTransition } from "react";
import { decide } from "@/app/actions";
import { emptyThresholds, presets } from "@/data/presets";
import type {
  EnoughResult,
  JobPreset,
  ProvenanceField,
  SoftPrefs,
  Thresholds,
} from "@/lib/types";

const provenanceLabels: Array<[keyof NonNullable<EnoughResult["record"]["provenance"]>, string]> = [
  ["street_price", "Street price"],
  ["anc", "Active noise cancelling"],
  ["battery_hours", "Battery"],
  ["weight_g", "Weight"],
  ["bluetooth", "Bluetooth"],
  ["wired_3_5mm", "Wired 3.5 mm"],
  ["call_mic", "Call mic"],
  ["warranty_years", "Warranty"],
  ["foldable", "Foldable"],
];

function money(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function fieldText(field: ProvenanceField): string {
  if (field.value === null) return "Missing";
  if (typeof field.value === "boolean") return field.value ? "Yes" : "No";
  if (typeof field.value === "number") return String(field.value);
  return field.value;
}

function softLines(soft: SoftPrefs): string[] {
  const lines: string[] = [];
  if (soft.anc) lines.push("ANC on");
  if (soft.call_mic) lines.push("Call mic");
  if (soft.wired_3_5mm) lines.push("Wired 3.5 mm");
  if (soft.foldable) lines.push("Foldable");
  if (soft.weight_g_max !== undefined) lines.push(`Weight at most ${soft.weight_g_max} g`);
  return lines;
}

export function Enough() {
  const [preset, setPreset] = useState<JobPreset | null>(null);
  const [thresholds, setThresholds] = useState<Thresholds>(emptyThresholds);
  const [step, setStep] = useState<"job" | "bars" | "result">("job");
  const [result, setResult] = useState<EnoughResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: JobPreset) {
    setPreset(next);
    setThresholds({ ...next.thresholds });
    setResult(null);
    setCopied(false);
    setError(null);
    setStep("bars");
  }

  function updateNumber(key: keyof Thresholds, raw: string) {
    setThresholds((current) => ({
      ...current,
      [key]: raw.trim() === "" ? null : Number(raw),
    }));
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
    const text = JSON.stringify(result.record, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const soft = softLines(preset?.soft ?? {});

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
            Set an honest bar. Enough returns the cheapest pair that clears it,
            plus the cheaper ones that missed.
          </p>
          <div className="jobs">
            {presets.map((job) => (
              <button key={job.id} className="job" type="button" onClick={() => choose(job)}>
                <span>Job</span>
                <strong>{job.label}</strong>
                <em>{job.summary}</em>
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
            <p className="meta">{preset.label}</p>
          </div>
          <h1>Set the bar</h1>
          <p className="lede">
            Checked rows are must-haves. A missing fact fails that bar. Empty
            numbers are off.
          </p>
          <div className="bars">
            <BooleanBar
              label="Active noise cancelling"
              checked={thresholds.anc === true}
              onChange={(on) => setThresholds({ ...thresholds, anc: on ? true : null })}
            />
            <BooleanBar
              label="Bluetooth"
              checked={thresholds.bluetooth === true}
              onChange={(on) =>
                setThresholds({ ...thresholds, bluetooth: on ? true : null })
              }
            />
            <BooleanBar
              label="Call mic"
              checked={thresholds.call_mic === true}
              onChange={(on) =>
                setThresholds({ ...thresholds, call_mic: on ? true : null })
              }
            />
            <BooleanBar
              label="Wired 3.5 mm"
              checked={thresholds.wired_3_5mm === true}
              onChange={(on) =>
                setThresholds({ ...thresholds, wired_3_5mm: on ? true : null })
              }
            />
            <BooleanBar
              label="Foldable"
              checked={thresholds.foldable === true}
              onChange={(on) =>
                setThresholds({ ...thresholds, foldable: on ? true : null })
              }
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
            {soft.length === 0 ? (
              <p>None for this job. Nice-to-haves never pass or fail.</p>
            ) : (
              <>
                <p>Shown for context. They do not decide the pick.</p>
                <ul>
                  {soft.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
          {error && <p className="fail">{error}</p>}
          <button className="primary" type="button" onClick={run} disabled={pending}>
            {pending ? "Checking the bar…" : "Find the cheapest that clears it"}
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
              {result.cleared} of {result.considered} clear
            </p>
          </div>
          <h1>{preset.label}</h1>
          <p className="lede">{barSummary(thresholds)}</p>
          {result.record.winner && result.record.price ? (
            <article className="card winner">
              <p className="kicker">The cheapest that clears your bar</p>
              <h2>
                {result.record.winner.brand} {result.record.winner.name}
              </h2>
              <p className="price">{money(result.record.price.amount_usd)}</p>
              <p className="hint">
                {result.record.price.retailer} street price, as of {result.record.price.as_of}
              </p>
            </article>
          ) : (
            <article className="card empty">
              <p className="kicker">Nothing cleared the bar</p>
              <p>Loosen a must-have, or leave a number blank to turn that bar off.</p>
            </article>
          )}

          <h2>{result.record.winner ? "Why not cheaper" : "What missed"}</h2>
          {result.record.rejects.length === 0 ? (
            <p className="lede">No cheaper pair in the seed missed this bar.</p>
          ) : (
            <ul className="rejects">
              {result.record.rejects.map((reject) => (
                <li key={reject.id} className="reject">
                  <header>
                    <strong>
                      {reject.brand} {reject.name}
                    </strong>
                    <span>{money(reject.price.amount_usd)}</span>
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

          {result.record.provenance && (
            <>
              <h2>Provenance</h2>
              <ul className="provenance">
                {provenanceLabels.map(([key, label]) => {
                  const field = result.record.provenance?.[key];
                  if (!field) return null;
                  return (
                    <li key={key}>
                      <strong>{label}</strong>
                      <p>
                        {fieldText(field)}
                        {field.as_of ? ` · as of ${field.as_of}` : ""}
                      </p>
                      {field.source ? (
                        <small>
                          <a href={field.source}>{field.source}</a>
                        </small>
                      ) : (
                        <small>No cite on file. Missing must-haves fail a bar that needs them.</small>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {(soft.length > 0 || result.nice?.codecs || result.nice?.multipoint) &&
            result.record.provenance && (
            <>
              <h2>Nice to have</h2>
              <ul className="nice">
                {preset.soft.foldable !== undefined && (
                  <NiceRow
                    label="Foldable"
                    field={result.record.provenance.foldable}
                  />
                )}
                {preset.soft.anc !== undefined && (
                  <NiceRow label="ANC" field={result.record.provenance.anc} />
                )}
                {preset.soft.weight_g_max !== undefined && (
                  <NiceRow
                    label={`Weight preference ≤ ${preset.soft.weight_g_max} g`}
                    field={result.record.provenance.weight_g}
                  />
                )}
                {result.nice?.codecs && (
                  <NiceRow label="Codecs" field={result.nice.codecs} />
                )}
                {result.nice?.multipoint && (
                  <NiceRow label="Multipoint" field={result.nice.multipoint} />
                )}
              </ul>
            </>
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
        25 over-ear ANC headphones in the seed. Facts cited as of 2026-09-22. No lab scores.
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
  if (parts.length === 0) return "No must-have bars. The cheapest pair in the seed wins.";
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

function NiceRow({ label, field }: { label: string; field: ProvenanceField }) {
  return (
    <li>
      <strong>{label}</strong>
      <p>
        {fieldText(field)}. Not used to pass or fail.
      </p>
    </li>
  );
}
