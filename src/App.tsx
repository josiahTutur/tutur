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
  saveOnboarding,
  saveProfile,
} from "@/lib/db"
import { MAINTENANCE } from "@/lib/config"
import {
  loadProgress,
  saveProgress,
  clearProgress,
  isResumableView,
} from "@/lib/onboardingProgress"
import Intro from "@/components/Intro"
import Auth from "@/components/Auth"
import Welcome, { clearWelcomeProgress } from "@/components/Welcome"
import StageIntro, { clearStageIntroProgress } from "@/components/StageIntro"
import JoinChild from "@/components/JoinChild"
import Chat, { clearChatProgress } from "@/components/Chat"
import ProfilingResults from "@/components/ProfilingResults"
import GoalSelection from "@/components/GoalSelection"
import RoutineSelection from "@/components/RoutineSelection"
import ActivitySelection from "@/components/ActivitySelection"
import DashboardHub from "@/components/DashboardHub"
import AccountDeleted from "@/components/AccountDeleted"
import type { Profile } from "@/lib/types"

// Build the profile from the 20 profiling answers. Index mapping (see Chat.tsx):
//   [0] child age · [1] child name · [2] parent name · [3] relationship · [4] parent age
function profileFromAnswers(answers: string[], email: string): Profile {
  return {
    childAge: answers[0] ?? "",
    childName: answers[1] ?? "",
    guardianName: answers[2] ?? "",
    relationship: answers[3] ?? "",
    guardianAge: answers[4] ?? "",
    stage: 1, // replaced once profiling computes the real stage
    email,
    profiledAt: new Date().toISOString().slice(0, 10),
  }
}

/**
 * Global view router for Tutur.
 *
 * Kept intentionally simple with a single `useState` so the whole app flow
 * stays in one place while the product is still pre-backend. Swap this for a
 * real router (e.g. React Router / TanStack Router) once URLs & deep-linking
 * are needed.
 *
 * Flow:  intro ─▶ auth ─▶ welcome ─▶ stageIntro ─▶ chat (AI profiling)
 *        ─▶ results ─▶ goals ─▶ routines ─▶ activities ─▶ hub
 *
 * `stageIntro` teaches the 5 communication stages, then forks: the parent either
 * picks their child's stage manually (→ straight to the hub) or takes the
 * 15-question assessment (→ chat → results → goals…).
 *
 * After the communication-stage analysis (results), the parent picks a primary
 * goal (goals), their daily routines (routines), and the intervention
 * activities (activities) — all three anchor Maya — then lands on the
 * DashboardHub.
 */
export type View =
  | "intro"
  | "auth"
  | "welcome"
  | "join"
  | "stageIntro"
  | "chat"
  | "results"
  | "goals"
  | "routines"
  | "activities"
  | "hub"

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

  // Runtime maintenance flag (admin-toggled) — OR'd with the build-time env flag.
  const [remoteMaintenance, setRemoteMaintenance] = useState(false)
  const maintenance = MAINTENANCE || remoteMaintenance

  // Terminal state after a guardian deletes their account — a bare full-screen
  // farewell (no nav, no button) shown over everything.
  const [accountDeleted, setAccountDeleted] = useState(false)

  // Raw answers from the 16 profiling questions, handed to the scoring engine.
  const [profilingAnswers, setProfilingAnswers] = useState<string[]>([])

  // The 5 answers collected in the founding welcome — carried into profiling so
  // those first questions are never re-asked.
  const [welcomeAnswers, setWelcomeAnswers] = useState<string[]>([])

  // Assembled child/guardian profile. Undefined until set (via the demo
  // shortcut today; via real sign-in + profiling once those are wired up).
  const [profile, setProfile] = useState<Profile>()

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

      // Onboarding fully done (activities saved) → the hub is authoritative.
      if (ob && ob.activities.length > 0) {
        setGoal(ob.goal)
        setRoutines(ob.routines)
        setActivities(ob.activities)
        clearProgress() // mirror is stale now; hub is the source of truth
        setView((v) => (v === "intro" || v === "auth" ? "hub" : v))
        return
      }

      // Otherwise resume from locally-saved progress (survives a mid-onboarding
      // refresh, incl. a manual stage pick that jumped straight to the hub).
      const local = loadProgress()
      if (local) {
        setWelcomeAnswers(local.welcomeAnswers ?? [])
        setProfilingAnswers(local.profilingAnswers ?? [])
        if (local.goal) setGoal(local.goal)
        if (local.routines) setRoutines(local.routines)
        if (local.activities) setActivities(local.activities)
        setView((v) => (v === "intro" || v === "auth" ? local.view : v))
        return
      }

      // New / unfinished member with no saved progress → start the welcome sector.
      setView((v) => (v === "intro" || v === "auth" ? "welcome" : v))
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

  // Mirror onboarding progress to localStorage so an accidental refresh resumes
  // on the same screen. Only post-auth onboarding views are persisted.
  useEffect(() => {
    if (booting || !isResumableView(view)) return
    saveProgress({
      view,
      welcomeAnswers,
      profilingAnswers,
      goal,
      routines,
      activities,
      stage: profile?.stage,
    })
  }, [
    booting,
    view,
    welcomeAnswers,
    profilingAnswers,
    goal,
    routines,
    activities,
    profile?.stage,
  ])

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

  // The goal/routine matrices and hub are full-bleed responsive layouts, so they
  // render outside the mobile-width column used by the rest of the onboarding flow.
  if (view === "goals") {
    return (
      <GoalSelection
        onComplete={(goalCode) => {
          setGoal(goalCode)
          setView("routines")
        }}
      />
    )
  }
  if (view === "routines") {
    return (
      <RoutineSelection
        onComplete={(selected) => {
          setRoutines(selected)
          setView("activities")
        }}
        onBack={() => setView("goals")}
      />
    )
  }
  if (view === "activities") {
    return (
      <ActivitySelection
        childStage={profile?.stage}
        onComplete={async (selected) => {
          setActivities(selected)
          // Persist the finished onboarding so a refresh resumes on the hub.
          try {
            await saveOnboarding({
              goal,
              routines,
              activities: selected,
              stage: profile?.stage,
            })
          } catch {
            /* offline / not signed in (demo) — fall through to the hub anyway */
          }
          setView("hub")
        }}
        onBack={() => setView("routines")}
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
          setProfilingAnswers([])
          setWelcomeAnswers([])
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
  // Founding welcome is a full-viewport, responsive layout (not the mobile column).
  if (view === "welcome") {
    return (
      <Welcome
        onComplete={(a) => {
          setWelcomeAnswers(a)
          setView("stageIntro")
        }}
        onJoinCode={() => setView("join")}
      />
    )
  }
  // Co-parent joins a shared child with an invite code, then reloads onto the hub.
  if (view === "join") {
    return (
      <JoinChild
        initialCode={pendingCode ?? undefined}
        onBack={() => setView("welcome")}
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
  // Communication-stage education + fork (also a full-viewport layout).
  if (view === "stageIntro") {
    return (
      <StageIntro
        onTakeQuestions={() => setView("chat")}
        onPickStage={(stage) => {
          // Manual pick: set the stage and jump straight to the dashboard.
          const finalProfile: Profile = {
            ...profileFromAnswers(welcomeAnswers, userEmail),
            stage,
          }
          setProfile(finalProfile)
          void saveProfile(finalProfile)
          setView("hub")
        }}
      />
    )
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col overflow-hidden">
      {view === "chat" && (
        <Chat
          startAnswers={welcomeAnswers}
          persistKey="tutur.chat.v1"
          onComplete={(answers) => {
            setProfilingAnswers(answers)
            // Capture the child/guardian details from the answers right away.
            setProfile(profileFromAnswers(answers, userEmail))
            setView("results")
          }}
        />
      )}

      {view === "results" && (
        <ProfilingResults
          answers={profilingAnswers}
          onComplete={(stage) => {
            // Finalise the profile with the computed stage and persist it.
            const finalProfile: Profile = {
              ...(profile ?? profileFromAnswers(profilingAnswers, userEmail)),
              stage,
            }
            setProfile(finalProfile)
            void saveProfile(finalProfile, profilingAnswers)
            setView("goals")
          }}
        />
      )}
    </div>
  )
}
