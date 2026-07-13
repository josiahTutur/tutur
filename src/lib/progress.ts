/* ========================================================================== *
 *  Progress — pure helpers over the family's real Preverb history.
 *
 *  Every progress surface reads from here, so they can never disagree:
 *    • Aktiviti Harian  → "Kemajuan {bulan}" month calendar
 *    • Analisis         → "Konsistensi 30 Hari" rolling heatmap
 *
 *  ── WHAT CHANGED, AND WHY ─────────────────────────────────────────────────
 *  This file used to hold a hand-written array of "activities completed N days
 *  ago" — invented data, drawn as if it were the family's own history. It is
 *  gone. Every number below is now derived from preverb_activity_run.
 *
 *  ── WE COUNT TIME, NOT ACTIVITIES ─────────────────────────────────────────
 *  The old model was a dose: 3 activities × 5 minutes, and a day was "partial"
 *  if you did 2 of 3. Preverb has ONE activity per day, which the parent may
 *  repeat. So "2 of 3 done" is not a thing that can happen, and counting
 *  activities would only ever print 1.
 *
 *  What is worth measuring — and what a parent actually wants to be told — is
 *  the TIME they spent with their child. That is the headline. A day is simply
 *  done or not done; the number that grows is the clock.
 * ========================================================================== */

import { isoDate, type PreverbProgress } from "@/lib/preverbDb"

/** What happened on the date `k` days before today (0 = today). */
export function progressDaysAgo(
  progress: PreverbProgress,
  k: number
): { seconds: number; completed: boolean } {
  if (k < 0) return { seconds: 0, completed: false }
  const d = new Date()
  d.setDate(d.getDate() - k)
  const day = progress[isoDate(d)]
  return { seconds: day?.seconds ?? 0, completed: day?.completed ?? false }
}

/** Seconds practised on each of the last `n` days, oldest-first (heatmaps). */
export function lastNDaysSeconds(progress: PreverbProgress, n: number): number[] {
  return Array.from({ length: n }, (_, i) => progressDaysAgo(progress, n - 1 - i).seconds)
}

/**
 * Consecutive days up to today with time logged.
 *
 * Today counts only if they have already practised — an untouched today is not
 * a broken streak, it is a day that hasn't happened yet. Starting the count at
 * yesterday when today is empty is what stops the streak from appearing to
 * reset itself every midnight.
 */
export function currentStreak(progress: PreverbProgress): number {
  const start = progressDaysAgo(progress, 0).seconds > 0 ? 0 : 1
  let streak = 0
  for (let k = start; progressDaysAgo(progress, k).seconds > 0; k++) streak++
  return streak
}

/** Every date in `progress` that falls in the given month (0-indexed month). */
function datesInMonth(progress: PreverbProgress, year: number, month: number): string[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`
  return Object.keys(progress).filter((d) => d.startsWith(prefix))
}

/** Days practised this month, and the total time — the two headline numbers. */
export function monthTotals(
  progress: PreverbProgress,
  year: number,
  month: number
): { activeDays: number; seconds: number } {
  const dates = datesInMonth(progress, year, month)
  return {
    activeDays: dates.length,
    seconds: dates.reduce((sum, d) => sum + progress[d].seconds, 0),
  }
}

/** Total time ever spent, across every day of the programme. */
export function totalSeconds(progress: PreverbProgress): number {
  return Object.values(progress).reduce((sum, d) => sum + d.seconds, 0)
}

/** Human-readable duration, e.g. 95 → "1 minit 35 saat" / "1 min 35 sec". */
export function formatDuration(seconds: number, lang: "ms" | "en" = "ms"): string {
  const s = Math.max(0, Math.round(seconds))
  const min = Math.floor(s / 60)
  const sec = s % 60
  if (lang === "en") {
    if (s === 0) return "0 sec"
    if (min === 0) return `${sec} sec`
    if (sec === 0) return `${min} min`
    return `${min} min ${sec} sec`
  }
  if (s === 0) return "0 saat"
  if (min === 0) return `${sec} saat`
  if (sec === 0) return `${min} minit`
  return `${min} minit ${sec} saat`
}

/** Compact duration for tight spaces (chips): 95 → "2m", 3900 → "1j 5m". */
export function formatDurationShort(seconds: number, lang: "ms" | "en" = "ms"): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return lang === "en" ? `${s}s` : `${s}s`
  const min = Math.round(s / 60)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const rem = min % 60
  const hour = lang === "en" ? "h" : "j" // jam
  return rem === 0 ? `${h}${hour}` : `${h}${hour} ${rem}m`
}
