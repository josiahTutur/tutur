import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  ensureProfile,
  loadOnboarding,
  saveOnboarding,
  saveProfile,
} from "@/lib/db"
import Intro from "@/components/Intro"
import Auth from "@/components/Auth"
import OnboardingStory from "@/components/OnboardingStory"
import Chat from "@/components/Chat"
import ProfilingResults from "@/components/ProfilingResults"
import GoalSelection from "@/components/GoalSelection"
import RoutineSelection from "@/components/RoutineSelection"
import ActivitySelection from "@/components/ActivitySelection"
import DashboardHub from "@/components/DashboardHub"
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
 * Flow:  intro ─▶ auth ─▶ [story] ─▶ chat (AI profiling) ─▶ results ─▶ goals
 *        ─▶ routines ─▶ activities ─▶ hub
 *
 * The `story` onboarding narrative is shown only to brand-new registrations.
 * Returning users skip straight from auth to the chat profiling stage.
 *
 * After the communication-stage analysis (results), the parent picks a primary
 * goal (goals), their daily routines (routines), and the intervention
 * activities (activities) — all three anchor Maya — then lands on the
 * DashboardHub.
 */
export type View =
  | "intro"
  | "auth"
  | "story"
  | "chat"
  | "results"
  | "goals"
  | "routines"
  | "activities"
  | "hub"

export default function App() {
  const [view, setView] = useState<View>("intro")

  // Raw answers from the 16 profiling questions, handed to the scoring engine.
  const [profilingAnswers, setProfilingAnswers] = useState<string[]>([])

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

  // Brief splash while we check the session on first load, so we don't flash the
  // intro before deciding where a signed-in user belongs.
  const [booting, setBooting] = useState(true)

  // Supabase session → drives auth + resume. A signed-in user with saved
  // onboarding lands straight on the hub; a new one continues onboarding.
  // Signing out returns to the intro.
  useEffect(() => {
    let cancelled = false

    async function resume() {
      await ensureProfile() // guarantee the profile row exists before anything
      const ob = await loadOnboarding()
      if (cancelled || !ob) return
      // Rebuild the profile from saved data so ProfileView shows real values.
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
      if (ob.activities.length > 0) {
        // Onboarding already done → restore selections and jump to the hub.
        setGoal(ob.goal)
        setRoutines(ob.routines)
        setActivities(ob.activities)
        setView((v) => (v === "intro" || v === "auth" ? "hub" : v))
      } else {
        setView((v) => (v === "intro" || v === "auth" ? "story" : v))
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setUserEmail(data.session.user.email ?? "")
        await resume()
      }
      if (!cancelled) setBooting(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUserEmail(session.user.email ?? "")
        resume()
      } else if (event === "SIGNED_OUT") setView("intro")
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Splash while the session check runs, so a signed-in user never sees a flash
  // of the intro before landing on the hub.
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
        onSignOut={() => {
          supabase.auth.signOut()
          setProfile(undefined)
          setGoal(undefined)
          setRoutines([])
          setActivities([])
          setProfilingAnswers([])
          setView("intro")
        }}
      />
    )
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col overflow-hidden">
      {view === "intro" && (
        <Intro
          onComplete={() => setView("auth")}
          onSkip={() => setView("auth")}
        />
      )}

      {view === "auth" && <Auth />}

      {view === "story" && (
        <OnboardingStory onComplete={() => setView("chat")} />
      )}

      {view === "chat" && (
        <Chat
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
