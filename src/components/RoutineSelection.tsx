import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isRoutineComingSoon } from "@/lib/activities"
import { useLang } from "@/lib/i18n"
import { ArrowLeft, Check, Lock, Sparkles } from "lucide-react"

/* ========================================================================== *
 *  RoutineSelection — Part 3.6: Daily Routine Selection Matrix
 *
 *  Multi-select routine onboarding shown right after Goal Selection. Parents
 *  anchor speech-therapy activities into the daily routines they already share
 *  with their child; Maya injects intervention activities into that schedule.
 *
 *  Theme: high-tech Dark Mode, glassmorphic cards. Calming Teal for the activity
 *  count badges, Warm Coral for active (multi-selected) cards.
 * ========================================================================== */

const CORAL = "259 80% 55%" // active multi-selection indicator
const TEAL = "180 68% 34%" // activity-count badges
const PURPLE = "259 80% 55%" // "coming soon" badge

interface Routine {
  code: string
  name: string
  /** Activities available for this routine — shown as a teal count badge. */
  activities: number
  /** Bound strategies — kept in state for the backend engine, not rendered. */
  strategies: string[]
  /** Social-proof highlight ("🔥 Pilihan Ramai"). */
  popular?: boolean
}

const STR = {
  ms: {
    back: "Kembali",
    step: "Langkah 2 / 3",
    heading: "Pilih Rutin Harian Anda",
    subtitle:
      "Pilih rutin harian di mana anda meluangkan masa bersama anak. Kami akan menyuntik aktiviti intervensi pertuturan ke dalam jadual sedia ada anda. Pilih sekurang-kurangnya 1 rutin.",
    comingSoon: "Akan datang",
    popular: "🔥 Pilihan Ramai",
    activitiesAvailable: (n: number) => `${n} Aktiviti Tersedia`,
    selectedCount: (n: number) => `${n} rutin dipilih`,
    selectPrompt: "Pilih sekurang-kurangnya 1 rutin untuk diteruskan",
    confirm: "Sahkan Jadual & Jalankan Tutur",
  },
  en: {
    back: "Back",
    step: "Step 2 / 3",
    heading: "Choose Your Daily Routines",
    subtitle:
      "Pick the daily routines where you spend time with your child. We'll weave speech intervention activities into your existing schedule. Choose at least 1 routine.",
    comingSoon: "Coming soon",
    popular: "🔥 Popular Choice",
    activitiesAvailable: (n: number) => `${n} Activities Available`,
    selectedCount: (n: number) => `${n} routine${n === 1 ? "" : "s"} selected`,
    selectPrompt: "Choose at least 1 routine to continue",
    confirm: "Confirm Schedule & Launch Tutur",
  },
} as const

const ROUTINES: Routine[] = [
  { code: "R1", name: "Masa Bermain", activities: 8, strategies: ["S1", "S2", "S3"], popular: true },
  { code: "R2", name: "Masa Mandi", activities: 6, strategies: ["S1", "S2", "S4"] },
  { code: "R3", name: "Masa Makan", activities: 6, strategies: ["S1", "S2", "S3"], popular: true },
  { code: "R4", name: "Aktiviti Luar", activities: 4, strategies: ["S1", "S3"] },
  { code: "R5", name: "Berpakaian", activities: 4, strategies: ["S1", "S2", "S4"] },
  { code: "R6", name: "Dalam Kereta", activities: 3, strategies: ["S1", "S4"] },
  { code: "R7", name: "Sebelum Tidur", activities: 4, strategies: ["S4", "S5"], popular: true },
  { code: "R8", name: "Pasar Raya", activities: 3, strategies: ["S1"] },
  { code: "R9", name: "Masa Buku", activities: 5, strategies: ["S2", "S5"] },
  { code: "R10", name: "Arts & Craft", activities: 3, strategies: ["S4"] },
]

export default function RoutineSelection({
  onComplete,
  onBack,
}: {
  /** Locks the schedule and routes into the DashboardHub. */
  onComplete: (routineCodes: string[]) => void
  /** Returns to the previous (goal selection) step. */
  onBack: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>([])

  // Clean immutable toggle — add if absent, remove if present.
  function toggleRoutine(code: string) {
    setSelectedRoutines((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const count = selectedRoutines.length
  const canProceed = count > 0

  return (
    <main className="flex h-screen flex-col">
      {/* ----------------------- Scrollable content ----------------------- */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-8 md:px-8 md:pt-10">
        <div className="mx-auto max-w-5xl">
          {/* Back / progress nav */}
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-full glass px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {s.back}
            </button>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.step}
            </span>
          </div>

          {/* A. Header */}
          <header
            className="animate-fade-up text-center md:text-left"
            style={{ animationFillMode: "both" }}
          >
            <h1 className="text-balance text-2xl font-bold tracking-tight md:text-3xl">
              {s.heading} <span aria-hidden>⏳</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0">
              {s.subtitle}
            </p>
          </header>

          {/* B. Routine matrix — 1 / 2 / 3 columns */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROUTINES.map((routine, i) => {
              const selected = selectedRoutines.includes(routine.code)
              const soon = isRoutineComingSoon(routine.code)
              return (
                <button
                  key={routine.code}
                  type="button"
                  disabled={soon}
                  onClick={() => !soon && toggleRoutine(routine.code)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative flex animate-fade-up flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out",
                    soon
                      ? "cursor-not-allowed border-foreground/10 bg-foreground/5 opacity-55"
                      : selected
                        ? "bg-[hsl(259_80%_55%/0.10)] hover:scale-[1.02]"
                        : "border-foreground/10 bg-card hover:scale-[1.02] hover:bg-foreground/5 hover:shadow-[0_0_32px_-10px_hsl(259_80%_55%/0.4)]"
                  )}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: "both",
                    ...(selected && !soon
                      ? {
                          borderColor: `hsl(${CORAL} / 0.85)`,
                          boxShadow: `0 0 15px hsl(${CORAL} / 0.5), 0 0 0 1px hsl(${CORAL} / 0.6)`,
                        }
                      : {}),
                  }}
                >
                  {/* Top row: checkbox + name + badge */}
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                        selected && !soon ? "border-transparent" : "border-foreground/25"
                      )}
                      style={selected && !soon ? { background: `hsl(${CORAL})` } : undefined}
                      aria-hidden
                    >
                      {selected && !soon && (
                        <Check className="h-4 w-4 text-background" strokeWidth={3} />
                      )}
                    </span>

                    <h3 className="flex-1 pt-0.5 text-base font-semibold leading-snug text-foreground">
                      {routine.name}
                    </h3>

                    {soon ? (
                      <span
                        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: `hsl(${PURPLE} / 0.16)`,
                          color: `hsl(${PURPLE} / 0.9)`,
                        }}
                      >
                        <Lock className="h-3 w-3" strokeWidth={2.5} />
                        {s.comingSoon}
                      </span>
                    ) : (
                      routine.popular && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: `hsl(${CORAL} / 0.18)`,
                            color: `hsl(${CORAL})`,
                          }}
                        >
                          {s.popular}
                        </span>
                      )
                    )}
                  </div>

                  {/* Activity count — soft teal tint (hidden for coming-soon) */}
                  {!soon && (
                    <span
                      className="mt-4 w-fit rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        background: `hsl(${TEAL} / 0.14)`,
                        color: `hsl(${TEAL})`,
                      }}
                    >
                      {s.activitiesAvailable(routine.activities)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---------------------- C. Floating action footer ----------------- */}
      <footer className="shrink-0 border-t border-border/60 bg-background/80 px-6 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2.5 text-center text-xs text-muted-foreground">
            {canProceed ? s.selectedCount(count) : s.selectPrompt}
          </p>
          <Button
            size="lg"
            disabled={!canProceed}
            onClick={() => canProceed && onComplete(selectedRoutines)}
            className="group w-full rounded-2xl text-base font-semibold text-background transition-all duration-300 disabled:opacity-40"
            style={{
              background: `hsl(${CORAL})`,
              boxShadow: canProceed
                ? `0 0 30px -4px hsl(${CORAL} / 0.7)`
                : "none",
            }}
          >
            <Sparkles className="transition-transform duration-300 group-hover:scale-110" />
            {s.confirm}
          </Button>
        </div>
      </footer>
    </main>
  )
}
