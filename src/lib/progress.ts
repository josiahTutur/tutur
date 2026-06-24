/* ========================================================================== *
 *  Daily-completion data — single source of truth for progress views.
 *
 *  Both surfaces that show a day grid read from here, so they can never drift:
 *    • Aktiviti Harian  → "Kemajuan {bulan}" month calendar (by day-of-month)
 *    • Analisis         → "Konsistensi 30 Hari" rolling heatmap (by days-ago)
 *
 *  Representative placeholder until a backend records real sessions — replacing
 *  ACTIVITIES_DONE_BY_DAYS_AGO with live data updates every view at once.
 * ========================================================================== */

/** Daily dose: 3 activities × 5 min = 15 min. */
export const DAILY_TARGET_ACTIVITIES = 3

// How many of the day's 3 activities were completed, indexed by "days ago":
// index 0 = today, 1 = yesterday, … A 0 means a scheduled day was missed.
// 31 entries so the calendar covers any month length.
const ACTIVITIES_DONE_BY_DAYS_AGO = [
  2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 0, 3, 3, 2, 3, 3, 3, 3, 1, 3, 3, 2, 3, 3, 0,
  3, 3, 1, 3, 2,
]

/** Activities completed `k` days ago (0 = today); 0 for out-of-range days. */
export function activitiesDoneDaysAgo(k: number): number {
  if (k < 0) return 0
  return ACTIVITIES_DONE_BY_DAYS_AGO[k] ?? 0
}

/** Completion counts for the last `n` days, oldest-first (for heatmaps). */
export function lastNDaysCompletion(n: number): number[] {
  return Array.from({ length: n }, (_, i) => activitiesDoneDaysAgo(n - 1 - i))
}

/** Consecutive days up to today with at least one activity completed. */
export function currentStreak(): number {
  let streak = 0
  for (let k = 0; activitiesDoneDaysAgo(k) > 0; k++) streak++
  return streak
}
