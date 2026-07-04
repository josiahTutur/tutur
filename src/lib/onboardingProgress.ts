/* ========================================================================== *
 *  Onboarding progress — a tiny localStorage store so an accidental refresh
 *  mid-onboarding resumes on the same screen instead of restarting.
 *
 *  App writes the current onboarding view (+ the answers/selections gathered so
 *  far) here on every step; on boot it restores from here. This is what lets a
 *  parent who picked their child's stage manually land back on the dashboard
 *  after a refresh, even though no goal/routines/activities were saved to the
 *  backend yet.
 *
 *  The Welcome sector additionally keeps its own finer-grained store (step +
 *  answers) — see @/components/Welcome.
 * ========================================================================== */

const KEY = "tutur.onboarding.v1"

/** Post-auth onboarding views worth resuming to (never "intro"/"auth"). */
export type OnboardingView =
  | "welcome"
  | "stageIntro"
  | "chat"
  | "results"
  | "goals"
  | "routines"
  | "activities"
  | "hub"

const RESUMABLE: OnboardingView[] = [
  "welcome",
  "stageIntro",
  "chat",
  "results",
  "goals",
  "routines",
  "activities",
  "hub",
]

export function isResumableView(v: string): v is OnboardingView {
  return (RESUMABLE as string[]).includes(v)
}

export interface OnboardingProgress {
  view: OnboardingView
  welcomeAnswers?: string[]
  profilingAnswers?: string[]
  goal?: string
  routines?: string[]
  activities?: string[]
  stage?: number
}

export function loadProgress(): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as OnboardingProgress
    if (p && typeof p.view === "string" && isResumableView(p.view)) return p
  } catch {
    /* corrupt or unavailable — start fresh */
  }
  return null
}

export function saveProgress(p: OnboardingProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* ignore persistence failures (private mode / quota) */
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
