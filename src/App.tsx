import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  deleteAccount,
  ensureProfile,
  isAccountDeleted,
  loadMaintenance,
  loadOnboarding,
  recordLoginDay,
  saveProfile,
} from "@/lib/db"
import { MAINTENANCE } from "@/lib/config"
import {
  saveProgress,
  clearProgress,
  isResumableView,
} from "@/lib/onboardingProgress"
import Intro from "@/components/Intro"
import Auth from "@/components/Auth"
import { clearWelcomeProgress } from "@/components/Welcome"
import { clearStageIntroProgress } from "@/components/StageIntro"
import JoinChild from "@/components/JoinChild"
import { clearChatProgress } from "@/components/Chat"
import DashboardHub from "@/components/DashboardHub"
import AccountDeleted from "@/components/AccountDeleted"
import { PilotPreview } from "@/components/day/PilotPreview"
import {
  OnboardingFlow,
  type OnboardingResult,
} from "@/components/onboarding/OnboardingFlow"
import {
  loadPilotOnboarding,
  savePilotOnboarding,
  PILOT_DEFAULTS,
} from "@/lib/pilotDb"
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type Draft,
} from "@/lib/onboardingDraft"
import type { Profile } from "@/lib/types"

/**
 * Global view router for Tutur.
 *
 * A single `useState` — deliberately. Swap for a real router once URLs and
 * deep-linking are needed.
 *
 * Flow:  intro ─▶ auth ─▶ onboarding (A1–A14) ─▶ hub
 *
 * ── WHAT CHANGED, AND WHY ────────────────────────────────────────────────
 * The old chain (welcome → stageIntro → chat → results → goals → routines →
 * activities) assessed the child into a STAGE and served content per-stage. The
 * 14-day pilot is organised the other way round: a 6-question SCREENING that
 * only decides whether to recommend an SLT, then fixed per-day content.
 *
 * So the stage instrument is gone from the flow. `StageIntro`, `Chat`,
 * `ProfilingResults`, `GoalSelection`, `RoutineSelection` and `ActivitySelection`
 * still exist on disk and still compile — they are simply no longer routed to,
 * pending a final call on whether to keep them (see docs/PILOT_EXECUTION_PLAN.md
 * §2b#4). Their localStorage stores are still cleared on sign-out, so a user who
 * was mid-flow when this shipped doesn't carry stale state forever.
 *
 * The hub still wants a stage/goal/routines/activities, so onboarding seeds
 * PILOT_DEFAULTS. That stage is FAKE — nothing measures it. See pilotDb.ts.
 */
export type View = "intro" | "auth" | "onboarding" | "join" | "hub"

/** Read an invite code from the URL (?code=… or ?join=…), if present. */
function readInviteCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const c = params.get("code") ?? params.get("join")
    return c ? c.trim() : null
  } catch {
    return null
  }
}

/** `?pilot=1` → render the 14-day day-player skeleton instead of the live app. */
function readPilotPreview(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("pilot")
  } catch {
    return false
  }
}

/** Whether a Google/OAuth sign-in bounced back with an error in the URL. */
function readOAuthError(): boolean {
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const search = new URLSearchParams(window.location.search)
    return !!(
      hash.get("error_description") ||
      hash.get("error") ||
      search.get("error_description") ||
      search.get("error")
    )
  } catch {
    return false
  }
}

export default function App() {
  const [view, setView] = useState<View>("intro")

  // Invite code captured from a shared link (?code=…) — routes a co-parent to
  // the Join screen once they're authenticated.
  const [pendingCode] = useState<string | null>(readInviteCodeFromUrl)

  // A Google sign-in that bounced back with an error (captured from the URL).
  const [oauthError] = useState<boolean>(readOAuthError)
  // `?pilot=1` — the day-player skeleton. Read once; see the render guard below.
  const [pilotPreview] = useState<boolean>(readPilotPreview)

  // Runtime maintenance flag (admin-toggled) — OR'd with the build-time env flag.
  const [remoteMaintenance, setRemoteMaintenance] = useState(false)
  const maintenance = MAINTENANCE || remoteMaintenance

  // Terminal state after a guardian deletes their account — a bare full-screen
  // farewell (no nav, no button) shown over everything.
  const [accountDeleted, setAccountDeleted] = useState(false)

  // Assembled child/guardian profile, rebuilt from the DB on boot.
  const [profile, setProfile] = useState<Profile>()

  // Set while A1–A14 is being written to the backend, so the CTA can't be
  // double-tapped into two children.
  const [savingOnboarding, setSavingOnboarding] = useState(false)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)

  // An interrupted onboarding, restored from the server (NOT localStorage — the
  // answers contain identity; see lib/onboardingDraft.ts). Hydrated during boot,
  // before the flow first renders, so it never flashes step 1 then jumps.
  const [draft, setDraft] = useState<Draft | null>(null)

  // Primary developmental goal (G1–G10) the parent picked after profiling.
  // Anchors the intervention pathway and is editable later from Tetapan.
  const [goal, setGoal] = useState<string>()

  // Daily routines the parent anchors therapy into (R1–R10). Drives which
  // activities the library surfaces in the hub.
  const [routines, setRoutines] = useState<string[]>([])

  // Intervention activities (A1…) the parent curated during onboarding. Scopes
  // the activity library Maya draws from in the hub.
  const [activities, setActivities] = useState<string[]>([])

  // The signed-in user's email — stamped onto the profile built from profiling.
  const [userEmail, setUserEmail] = useState("")

  // Which Auth form to open: "signup" from the CTA, "login" from the Sign In link.
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")

  // Brief splash while we check the session on first load, so we don't flash the
  // intro before deciding where a signed-in user belongs.
  const [booting, setBooting] = useState(true)

  // Supabase session → drives auth + resume. A signed-in user with saved
  // onboarding lands straight on the hub; a new one continues onboarding.
  // Signing out returns to the intro.
  useEffect(() => {
    let cancelled = false

    async function resume() {
      // A soft-deleted account must never resume — bounce the session out.
      if (await isAccountDeleted()) {
        await supabase.auth.signOut()
        clearProgress()
        clearWelcomeProgress()
        clearStageIntroProgress()
        clearChatProgress()
        if (!cancelled) setView("intro")
        return
      }
      await ensureProfile() // guarantee the profile row exists before anything
      recordLoginDay() // count today toward this user's login-day progress
      const ob = await loadOnboarding()
      if (cancelled) return

      // Rebuild the profile from saved data so ProfileView shows real values
      // (names/stage may exist from a completed profiling or a manual pick).
      if (ob) {
        setProfile({
          childName: ob.childName ?? "",
          childAge: ob.childAge ?? "",
          guardianName: ob.guardianName ?? "",
          relationship: ob.relationship ?? "",
          guardianAge: ob.guardianAge ?? "",
          stage: ob.stage ?? 1,
          email: ob.email ?? "",
          profiledAt: ob.profiledAt ?? "",
        })
      }

      // Did they finish the NEW onboarding (A1–A14)? That writes children.onboarded_at.
      const pilot = await loadPilotOnboarding()
      if (cancelled) return

      // Two independent ways to be "done", and both must send you to the hub:
      //
      //   · pilot        — finished A1–A14 (the current flow)
      //   · legacy       — finished the OLD chain before this shipped, which is
      //                    recorded as a non-empty `activities` list
      //
      // Missing the legacy case would drag every existing parent back through
      // onboarding they already completed, so it is checked explicitly.
      const legacyDone = !!ob && ob.activities.length > 0

      if (pilot || legacyDone) {
        // The 14-day scripts SAY the nickname and the panggilan out loud, so they
        // must come from the authoritative source (vault + children), not from the
        // legacy `profiles` copy which a pre-pilot user may not have at all.
        if (pilot) {
          setProfile((p) => ({
            childName: pilot.anak || p?.childName || "",
            childAge: p?.childAge ?? "",
            guardianName: p?.guardianName ?? "",
            relationship: p?.relationship ?? "",
            guardianAge: p?.guardianAge ?? "",
            panggilan: pilot.panggilan,
            stage: p?.stage ?? PILOT_DEFAULTS.stage,
            email: p?.email ?? "",
            profiledAt: p?.profiledAt ?? "",
          }))
        }
        setGoal(ob?.goal ?? PILOT_DEFAULTS.goal)
        setRoutines(ob?.routines?.length ? ob.routines : [...PILOT_DEFAULTS.routines])
        setActivities(
          ob?.activities?.length ? ob.activities : [...PILOT_DEFAULTS.activities]
        )
        clearProgress() // any local mirror is stale now; the DB is authoritative
        setView((v) => (v === "intro" || v === "auth" ? "hub" : v))
        return
      }

      // Everyone else starts (or resumes) onboarding. The old localStorage mirror
      // is NOT honoured: the views it points at ("chat", "goals", …) no longer
      // exist, so resuming onto one would route into nothing.
      clearProgress()

      // Pull the server-side draft BEFORE showing the flow, so a returning parent
      // lands on the screen they left rather than flashing A1 and jumping.
      const d = await loadDraft()
      if (cancelled) return
      setDraft(d)

      setView((v) => (v === "intro" || v === "auth" ? "onboarding" : v))
    }

    supabase.auth.getSession().then(async ({ data }) => {
      // Read the runtime maintenance flag before first paint (no flash).
      const m = await loadMaintenance()
      if (!cancelled) setRemoteMaintenance(m)
      if (data.session) {
        setUserEmail(data.session.user.email ?? "")
        // A shared invite link → jump straight to the Join screen.
        if (pendingCode) setView("join")
        else await resume()
      }
      if (!cancelled) setBooting(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUserEmail(session.user.email ?? "")
        if (pendingCode) setView("join")
        else resume()
      } else if (event === "SIGNED_OUT") setView("intro")
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Strip the invite code from the URL once captured, so a refresh is clean and
  // never re-triggers the join routing.
  useEffect(() => {
    if (!pendingCode) return
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete("code")
      url.searchParams.delete("join")
      window.history.replaceState({}, "", url.pathname + url.search + url.hash)
    } catch {
      /* ignore */
    }
  }, [pendingCode])

  // A Google sign-in that failed (e.g. the account isn't registered) redirects
  // back to the landing with only a URL error — surface it on the login form.
  useEffect(() => {
    if (!oauthError) return
    setAuthMode("login")
    setView("auth")
    try {
      window.history.replaceState({}, "", window.location.pathname)
    } catch {
      /* ignore */
    }
  }, [oauthError])

  // Mirror the current view to localStorage so a refresh resumes in place.
  //
  // Onboarding answers are deliberately NOT mirrored: they include the child's
  // nickname, the parent's name, and screening responses. That is exactly the
  // data the vault exists to protect (spec §3.1), and localStorage is readable
  // by anything running on the origin. A refresh mid-onboarding restarts it —
  // ~3 minutes — which is a fair price for not scattering identity around.
  useEffect(() => {
    if (booting || !isResumableView(view)) return
    saveProgress({ view, goal, routines, activities, stage: profile?.stage })
  }, [booting, view, goal, routines, activities, profile?.stage])

  // ── PILOT PREVIEW ────────────────────────────────────────────────────────
  // The 14-day day-player skeleton (C1–C4), reachable at `?pilot=1`. It sits in
  // front of the auth/session check on purpose: it has no backend, so there is
  // nothing to authenticate against yet. Nothing below this line is affected,
  // and the live app is untouched for every parent who doesn't type the flag.
  //
  // Remove this block once the day player replaces the current daily loop for
  // real — see docs/PILOT_EXECUTION_PLAN.md, Phase 4.
  if (pilotPreview) return <PilotPreview />

  // Splash while the session check runs, so a signed-in user never sees a flash
  // of the intro before landing on the hub.
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Terminal farewell — full-screen, over everything, after account deletion.
  if (accountDeleted) return <AccountDeleted />

  // ── ONBOARDING · A1–A14 ──────────────────────────────────────────────────
  if (view === "onboarding") {
    return (
      <OnboardingFlow
        saving={savingOnboarding}
        error={onboardingError}
        initial={draft}
        // One write per answered screen. Fire-and-forget: losing a draft write
        // costs the parent resume, not progress — it must never block them.
        onProgress={(step, answers, identity) => {
          void saveDraft(step, answers, identity)
        }}
        onDone={async (r: OnboardingResult) => {
          setSavingOnboarding(true)
          setOnboardingError(null)

          const res = await savePilotOnboarding(r)

          if (!res.ok) {
            // Do NOT advance on a failed write. Landing on a dashboard whose
            // scripts have no {anak} to say is worse than showing the error and
            // letting them retry — and the screening row would be lost silently.
            // The draft is left intact, so nothing they typed is lost.
            setSavingOnboarding(false)
            setOnboardingError(res.error)
            return
          }

          // Durable record written — the transient draft has done its job.
          // The vault row is NOT cleared: the nickname is real data now, spoken
          // in every activity script.
          await clearDraft()
          setDraft(null)

          setProfile({
            childName: r.anak,
            childAge: r.childAge,
            guardianName: r.parentName,
            relationship: r.relationship,
            guardianAge: r.parentAge,
            panggilan: r.panggilan, // spoken in every activity script
            stage: PILOT_DEFAULTS.stage, // ⚠ fake — nothing measures this
            email: userEmail,
            profiledAt: new Date().toISOString().slice(0, 10),
          })
          setGoal(PILOT_DEFAULTS.goal)
          setRoutines([...PILOT_DEFAULTS.routines])
          setActivities([...PILOT_DEFAULTS.activities])
          setSavingOnboarding(false)
          setView("hub")
        }}
      />
    )
  }

  if (view === "hub") {
    return (
      <DashboardHub
        profile={profile}
        goal={goal}
        routines={routines}
        activities={activities}
        onUpdateProfile={(p) => {
          setProfile(p)
          void saveProfile(p) // persist edits from the Profile screen
        }}
        onUpdateGoal={setGoal}
        onUpdateRoutines={setRoutines}
        onDeleteAccount={deleteAccount}
        onAccountDeleted={() => setAccountDeleted(true)}
        onSignOut={() => {
          supabase.auth.signOut()
          clearProgress()
          clearWelcomeProgress()
          clearStageIntroProgress()
          clearChatProgress()
          setProfile(undefined)
          setGoal(undefined)
          setRoutines([])
          setActivities([])
          setView("intro")
        }}
      />
    )
  }

  // Intro + Auth are full-viewport web layouts (split-screen on desktop), so
  // they render outside the mobile-width column used by the onboarding flow.
  if (view === "intro") {
    return (
      <Intro
        maintenance={maintenance}
        onComplete={() => {
          setAuthMode("signup") // "Start with Tutur" → sign-up form
          setView("auth")
        }}
        onSkip={() => {
          setAuthMode("login") // "Sign In" → log-in form
          setView("auth")
        }}
      />
    )
  }
  if (view === "auth") {
    return (
      <Auth
        initialMode={authMode}
        maintenance={maintenance}
        oauthError={oauthError}
        onBack={() => setView("intro")}
      />
    )
  }
  // Co-parent joins a shared child with an invite code, then reloads onto the hub.
  if (view === "join") {
    return (
      <JoinChild
        initialCode={pendingCode ?? undefined}
        onBack={() => setView("onboarding")}
        onJoined={() => {
          clearWelcomeProgress()
          clearProgress()
          clearStageIntroProgress()
          clearChatProgress()
          window.location.reload()
        }}
      />
    )
  }

  return null
}
