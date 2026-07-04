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

/* -------------------------------------------------------------------------- */
/*  Login-day tracking — a real, per-device record of the distinct days the    */
/*  parent has opened Tutur, so the "Kemajuan {bulan}" counter reflects actual  */
/*  engagement (1 on first login, +1 each new calendar day) instead of the      */
/*  calendar date. Stored locally; move to Supabase later for cross-device.     */
/* -------------------------------------------------------------------------- */

const LOGIN_DAYS_KEY = "tutur.loginDays.v1"

/** Device-local YYYY-MM-DD (matches how the calendar labels its day cells). */
function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function readLoginDays(): string[] {
  try {
    const raw = localStorage.getItem(LOGIN_DAYS_KEY)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

/** Record today as a login day (idempotent). Call once a session is live. */
export function recordLoginDay(): void {
  try {
    const today = isoDay(new Date())
    const days = readLoginDays()
    if (!days.includes(today)) {
      days.push(today)
      localStorage.setItem(LOGIN_DAYS_KEY, JSON.stringify(days))
    }
  } catch {
    /* ignore persistence failures */
  }
}

/** Distinct login days in the current month — 1 on the first login, then +1 for
 *  each new calendar day the parent logs in. Never 0, so the counter reads
 *  "1 / {daysInMonth}" the very first time. */
export function loginDaysThisMonth(): number {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`
  const count = readLoginDays().filter((d) => d.startsWith(prefix)).length
  return Math.max(1, count)
}

/** Human-readable Malay duration, e.g. 95 → "1 minit 35 saat". */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 saat"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} saat`
  if (s === 0) return `${m} minit`
  return `${m} minit ${s} saat`
}
