import { useState } from "react"
import Intro from "@/components/Intro"
import Auth from "@/components/Auth"
import OnboardingStory from "@/components/OnboardingStory"
import Chat from "@/components/Chat"
import ProfilingResults from "@/components/ProfilingResults"
import GoalSelection from "@/components/GoalSelection"
import RoutineSelection from "@/components/RoutineSelection"
import DashboardHub from "@/components/DashboardHub"
import type { Profile } from "@/lib/types"

// Demo profile used by the Intro "Langkau" shortcut to jump straight to the
// dashboard, bypassing sign-in & profiling while other features are built.
const DEFAULT_PROFILE: Profile = {
  childName: "John",
  childAge: "6 tahun",
  guardianName: "Deep",
  relationship: "Bapa",
  guardianAge: "44 tahun",
  stage: 1,
  email: "John@gmail.com",
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
 *        ─▶ routines ─▶ hub
 *
 * The `story` onboarding narrative is shown only to brand-new registrations.
 * Returning users skip straight from auth to the chat profiling stage.
 *
 * After the communication-stage analysis (results), the parent picks a primary
 * goal (goals) and their daily routines (routines) — both anchor Maya — then
 * lands on the DashboardHub.
 */
export type View =
  | "intro"
  | "auth"
  | "story"
  | "chat"
  | "results"
  | "goals"
  | "routines"
  | "hub"

export default function App() {
  const [view, setView] = useState<View>("intro")

  // Simulated registration flag — a real backend would set this from the
  // auth response (e.g. "account just created" vs. "existing user").
  const [isNewUser] = useState(true)

  // Raw answers from the 16 profiling questions, handed to the scoring engine.
  const [profilingAnswers, setProfilingAnswers] = useState<string[]>([])

  // Assembled child/guardian profile. Undefined until set (via the demo
  // shortcut today; via real sign-in + profiling once those are wired up).
  const [profile, setProfile] = useState<Profile>()

  // Daily routines the parent anchors therapy into (R1–R10). Drives which
  // activities the library surfaces in the hub.
  const [routines, setRoutines] = useState<string[]>([])

  // The goal/routine matrices and hub are full-bleed responsive layouts, so they
  // render outside the mobile-width column used by the rest of the onboarding flow.
  if (view === "goals") {
    return <GoalSelection onComplete={() => setView("routines")} />
  }
  if (view === "routines") {
    return (
      <RoutineSelection
        onComplete={(selected) => {
          setRoutines(selected)
          setView("hub")
        }}
        onBack={() => setView("goals")}
      />
    )
  }
  if (view === "hub") {
    return <DashboardHub profile={profile} routines={routines} />
  }

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col overflow-hidden">
      {view === "intro" && (
        <Intro
          onComplete={() => setView("auth")}
          onSkip={() => {
            setProfile(DEFAULT_PROFILE)
            setView("goals")
          }}
        />
      )}

      {view === "auth" && (
        <Auth onVerified={() => setView(isNewUser ? "story" : "chat")} />
      )}

      {view === "story" && (
        <OnboardingStory onComplete={() => setView("chat")} />
      )}

      {view === "chat" && (
        <Chat
          onComplete={(answers) => {
            setProfilingAnswers(answers)
            setView("results")
          }}
        />
      )}

      {view === "results" && (
        <ProfilingResults
          answers={profilingAnswers}
          onComplete={() => setView("goals")}
        />
      )}
    </div>
  )
}
