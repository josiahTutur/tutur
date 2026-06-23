import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Sparkles } from "lucide-react"

/* ========================================================================== *
 *  GoalSelection — Part 3.5: Post-Profiling Goal Selection Matrix
 *
 *  Shown immediately after the child-profiling stage (ProfilingResults) and
 *  before the DashboardHub. The chosen goal is the baseline anchor Maya uses to
 *  curate the 30-day intervention pathway.
 *
 *  Theme: high-tech Dark Mode baseline, glassmorphic cards. Calming Teal for the
 *  strategy badges, Warm Coral for the active-selection glow, neon purple accent
 *  on the title.
 * ========================================================================== */

const CORAL = "12 100% 64%" // active-selection indicator
const TEAL = "172 66% 50%" // focus-strategy badges
const PURPLE = "270 95% 65%" // title accent glow

interface Goal {
  code: string
  aspiration: string
  badges: string[]
}

const GOALS: Goal[] = [
  {
    code: "G1",
    aspiration: "Saya nak anak saya cakap dengan saya",
    badges: ["TPD", "Modelling", "Parallel Talk", "Auditory Closure"],
  },
  {
    code: "G2",
    aspiration: "Saya nak anak cakap dengan kawan di sekolah",
    badges: ["Ambil Giliran", "Parallel Talk", "Bermain"],
  },
  {
    code: "G3",
    aspiration: "Saya nak anak tak kena buli secara senyap",
    badges: ["Komunikasi Asertif", "Expand", "Keyakinan"],
  },
  {
    code: "G4",
    aspiration: "Saya nak anak boleh minta apa yang dia nak",
    badges: ["Auditory Closure (Tunggu)", "Beri Pilihan"],
  },
  {
    code: "G5",
    aspiration: "Saya nak anak faham apa yang saya cakap",
    badges: ["Ayat Pendek", "4SR", "Recasting", "Ulangan"],
  },
  {
    code: "G6",
    aspiration: "Saya nak tahu perkembangan (improvement) anak saya",
    badges: ["Ukuran 2-Jalur", "Jejak Aha Moment"],
  },
  {
    code: "G7",
    aspiration: "Saya penat. Saya tak tahu apa yang salah",
    badges: ["Mindset Reset", "TPD", "Parallel Talk Dahulu"],
  },
  {
    code: "G8",
    aspiration: "Saya nak anak cerita apa berlaku di sekolah",
    badges: ["Naratif", "Expand", "Komen Terbuka"],
  },
  {
    code: "G9",
    aspiration: "Saya nak terapi berkesan walau tak boleh pergi ke klinik",
    badges: ["Laporan Carryover SLT", "Tambat Rutin"],
  },
  {
    code: "G10",
    aspiration: "Saya nak anak yakin (confident) untuk bercakap",
    badges: ["Hargai Setiap Usaha", "Recasting", "Raikan"],
  },
]

export default function GoalSelection({
  onComplete,
}: {
  /** Routes into the DashboardHub generative stream with the chosen goal. */
  onComplete: (goalCode: string) => void
}) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  return (
    <main className="flex h-screen flex-col">
      {/* ----------------------- Scrollable content ----------------------- */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 pt-10 md:px-8 md:pt-12">
        <div className="mx-auto max-w-5xl">
          {/* A. Header */}
          <header
            className="animate-fade-up text-center md:text-left"
            style={{ animationFillMode: "both" }}
          >
            <h1
              className="text-balance text-2xl font-bold tracking-tight md:text-3xl"
              style={{ textShadow: `0 0 28px hsl(${PURPLE} / 0.6)` }}
            >
              Pilih Matlamat Utama Anda{" "}
              <span aria-hidden>🎯</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0">
              Sila pilih satu matlamat yang paling tepat dengan situasi anak anda
              sekarang. AI Maya akan membina pelan tindakan harian serta strategi
              intervensi khusus berdasarkan pilihan ini.
            </p>
          </header>

          {/* B. Goal matrix — 1 / 2 / 3 columns */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((goal, i) => {
              const selected = selectedGoal === goal.code
              return (
                <button
                  key={goal.code}
                  type="button"
                  onClick={() => setSelectedGoal(goal.code)}
                  aria-pressed={selected}
                  className={cn(
                    "group flex animate-fade-up flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out hover:scale-[1.02]",
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
                          boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6), 0 0 38px -6px hsl(${CORAL} / 0.55)`,
                        }
                      : {}),
                  }}
                >
                  {/* Code chip + selected indicator */}
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
                      style={
                        selected
                          ? {
                              background: `hsl(${CORAL} / 0.18)`,
                              color: `hsl(${CORAL})`,
                            }
                          : {
                              background: "hsl(0 0% 100% / 0.06)",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      Matlamat {goal.code}
                    </span>

                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
                        selected ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      )}
                      style={{ background: `hsl(${CORAL})` }}
                      aria-hidden
                    >
                      <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />
                    </span>
                  </div>

                  {/* Aspiration */}
                  <p className="flex-1 text-pretty text-base font-semibold leading-snug text-foreground">
                    “{goal.aspiration}”
                  </p>

                  {/* Focus-strategy badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {goal.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: `hsl(${TEAL} / 0.14)`,
                          color: `hsl(${TEAL})`,
                        }}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---------------------- C. Sticky action footer ------------------- */}
      <footer className="shrink-0 border-t border-border/60 bg-background/80 px-6 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-5xl">
          <Button
            size="lg"
            disabled={!selectedGoal}
            onClick={() => selectedGoal && onComplete(selectedGoal)}
            className="group w-full rounded-2xl text-base font-semibold text-background transition-all duration-300"
            style={{
              background: `hsl(${CORAL})`,
              boxShadow: selectedGoal
                ? `0 0 30px -4px hsl(${CORAL} / 0.7)`
                : "none",
            }}
          >
            <Sparkles className="transition-transform duration-300 group-hover:scale-110" />
            Sahkan Matlamat &amp; Mula Panduan AI
          </Button>
        </div>
      </footer>
    </main>
  )
}
