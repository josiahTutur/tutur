/* ========================================================================== *
 *  Day-config registry — the 14 days of Modul 1.
 *
 *  Each JSON is type-checked against `AnyDayConfig` at COMPILE time by the
 *  `satisfies` clauses below. A content file that drifts from the schema fails
 *  `npm run lint`, so a malformed day can never reach a parent.
 *
 *  Runtime asset checks (audio_id / video_id / storyboard_id resolve, ≤6
 *  observation questions, milestone ids referenced exist) live in
 *  `scripts/validate-content.ts`.
 * ========================================================================== */

import { type AnyDayConfig, type DayConfig, type RecapConfig } from "@/lib/dayConfig"

import day01 from "./day-01"

/* Days 2–14 land here as content authors them. Add the import + the entry
 * below — each day file ends with `satisfies DayConfig`, so a malformed day is
 * a BUILD failure, not a runtime surprise.
 *
 *   import day02 from "./day-02"
 *   …
 *   import recap07 from "./recap-07"
 *   import recap14 from "./recap-14"
 *
 * NOTE: these are .ts, not .json, on purpose. A JSON import widens string
 * literals ("activity" -> string), so it can only be forced to fit the schema
 * with an `as` cast — which silently disables every check. Content files are
 * plain object literals; the only difference from JSON is the wrapper line.
 */

export const DAYS: AnyDayConfig[] = [day01]

/** Total content days in Modul 1. Days 7 and 14 are recaps. */
export const TOTAL_DAYS = 14

/** The day the parent should see, 1-based. Returns undefined if not authored. */
export function dayConfig(dayNumber: number): AnyDayConfig | undefined {
  return DAYS.find((d) => d.day_number === dayNumber)
}

/** Narrowing helpers — the player branches on these. */
export function isRecap(d: AnyDayConfig): d is RecapConfig {
  return d.kind === "recap"
}
export function isActivity(d: AnyDayConfig): d is DayConfig {
  return d.kind === "activity"
}
