export type EnoughEvent = "session_started" | "result_shown" | "thresholds_changed";

/** Client-side learning events. Console only until a later sink exists. */
export function track(event: EnoughEvent, detail: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({ event, ...detail }));
}
