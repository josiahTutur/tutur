import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Check, Sparkles } from "lucide-react"

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

const CORAL = "12 100% 64%" // active multi-selection indicator
const TEAL = "172 66% 50%" // activity-count badges

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
              Kembali
            </button>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Langkah 2 / 2
            </span>
          </div>

          {/* A. Header */}
          <header
            className="animate-fade-up text-center md:text-left"
            style={{ animationFillMode: "both" }}
          >
            <h1
              className="text-balance text-2xl font-bold tracking-tight md:text-3xl"
              style={{ textShadow: `0 0 26px hsl(${TEAL} / 0.45)` }}
            >
              Pilih Rutin Harian Anda <span aria-hidden>⏳</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0">
              Pilih rutin harian di mana anda meluangkan masa bersama anak. Kami
              akan menyuntik aktiviti intervensi pertuturan ke dalam jadual sedia
              ada anda. Pilih sekurang-kurangnya 1 rutin.
            </p>
          </header>

          {/* B. Routine matrix — 1 / 2 / 3 columns */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROUTINES.map((routine, i) => {
              const selected = selectedRoutines.includes(routine.code)
              return (
                <button
                  key={routine.code}
                  type="button"
                  onClick={() => toggleRoutine(routine.code)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative flex animate-fade-up flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out hover:scale-[1.02]",
                    selected
                      ? "bg-white/[0.07]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:shadow-[0_0_32px_-10px_hsl(12_100%_64%/0.4)]"
                  )}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: "both",
                    ...(selected
                      ? {
                          borderColor: `hsl(${CORAL} / 0.85)`,
                          boxShadow: `0 0 15px hsl(${CORAL} / 0.5), 0 0 0 1px hsl(${CORAL} / 0.6)`,
                        }
                      : {}),
                  }}
                >
                  {/* Top row: checkbox + name + social-proof badge */}
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                        selected ? "border-transparent" : "border-white/25"
                      )}
                      style={selected ? { background: `hsl(${CORAL})` } : undefined}
                      aria-hidden
                    >
                      {selected && (
                        <Check className="h-4 w-4 text-background" strokeWidth={3} />
                      )}
                    </span>

                    <h3 className="flex-1 pt-0.5 text-base font-semibold leading-snug text-foreground">
                      {routine.name}
                    </h3>

                    {routine.popular && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `hsl(${CORAL} / 0.18)`,
                          color: `hsl(${CORAL})`,
                        }}
                      >
                        🔥 Pilihan Ramai
                      </span>
                    )}
                  </div>

                  {/* Activity count — soft teal tint */}
                  <span
                    className="mt-4 w-fit rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: `hsl(${TEAL} / 0.14)`,
                      color: `hsl(${TEAL})`,
                    }}
                  >
                    {routine.activities} Aktiviti Tersedia
                  </span>
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
            {canProceed
              ? `${count} rutin dipilih`
              : "Pilih sekurang-kurangnya 1 rutin untuk diteruskan"}
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
            Sahkan Jadual &amp; Jalankan Tutur
          </Button>
        </div>
      </footer>
    </main>
  )
}
