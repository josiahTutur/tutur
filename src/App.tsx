import { useState } from "react"
import Intro from "@/components/Intro"
import Auth from "@/components/Auth"
import OnboardingStory from "@/components/OnboardingStory"
import Chat from "@/components/Chat"
import ProfilingResults from "@/components/ProfilingResults"
import Dashboard from "@/components/Dashboard"

/**
 * Global view router for Tutur.
 *
 * Kept intentionally simple with a single `useState` so the whole app flow
 * stays in one place while the product is still pre-backend. Swap this for a
 * real router (e.g. React Router / TanStack Router) once URLs & deep-linking
 * are needed.
 *
 * Flow:  intro ──▶ auth ──▶ [story] ──▶ chat (AI profiling) ──▶ results ──▶ dashboard
 *
 * The `story` onboarding narrative is shown only to brand-new registrations.
 * Returning users skip straight from auth to the chat profiling stage.
 */
export type View = "intro" | "auth" | "story" | "chat" | "results" | "dashboard"

export default function App() {
  const [view, setView] = useState<View>("intro")

  // Simulated registration flag — a real backend would set this from the
  // auth response (e.g. "account just created" vs. "existing user").
  const [isNewUser] = useState(true)

  // Raw answers from the 16 profiling questions, handed to the scoring engine.
  const [profilingAnswers, setProfilingAnswers] = useState<string[]>([])

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col overflow-hidden">
      {view === "intro" && <Intro onComplete={() => setView("auth")} />}

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
          onComplete={() => setView("dashboard")}
        />
      )}

      {view === "dashboard" && <Dashboard />}
    </div>
  )
}
