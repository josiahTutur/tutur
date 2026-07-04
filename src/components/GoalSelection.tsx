import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Lock, Sparkles } from "lucide-react"
import { GOALS } from "@/lib/goals"
import { useLang, pick } from "@/lib/i18n"

const STR = {
  ms: {
    titlePrefix: "Pilih Matlamat Utama Anda",
    subtitleLead:
      "Sila pilih satu matlamat yang paling tepat dengan situasi anak anda sekarang. AI Maya akan membina pelan tindakan harian berdasarkan pilihan ini.",
    subtitleEmphasis:
      "Setiap matlamat merangkumi aktiviti harian sehingga 30 hari (1 bulan).",
    goalLabel: "Matlamat",
    comingSoon: "Akan datang",
    programmeLength: "📅 Aktiviti harian sehingga 30 hari (1 bulan)",
    confirmCta: "Sahkan Matlamat & Mula Panduan AI",
  },
  en: {
    titlePrefix: "Choose Your Main Goal",
    subtitleLead:
      "Please choose the one goal that best fits your child's situation right now. Maya AI will build a daily action plan based on this choice.",
    subtitleEmphasis:
      "Each goal includes daily activities for up to 30 days (1 month).",
    goalLabel: "Goal",
    comingSoon: "Coming soon",
    programmeLength: "📅 Daily activities for up to 30 days (1 month)",
    confirmCta: "Confirm Goal & Start AI Guidance",
  },
} as const

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

const CORAL = "259 80% 55%" // active-selection indicator
const TEAL = "180 68% 34%" // focus-strategy badges
const PURPLE = "259 80% 55%" // title accent glow

export default function GoalSelection({
  onComplete,
}: {
  /** Routes into the DashboardHub generative stream with the chosen goal. */
  onComplete: (goalCode: string) => void
}) {
  const { lang } = useLang()
  const s = STR[lang]

  // Pre-select the first available (non-coming-soon) goal.
  const [selectedGoal, setSelectedGoal] = useState<string | null>(
    GOALS.find((g) => !g.comingSoon)?.code ?? null
  )

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
              style={{ color: `hsl(${PURPLE})` }}
            >
              {s.titlePrefix}{" "}
              <span aria-hidden>🎯</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0">
              {s.subtitleLead}{" "}
              <span className="font-semibold text-foreground">
                {s.subtitleEmphasis}
              </span>
            </p>
          </header>

          {/* B. Goal matrix — 1 / 2 / 3 columns */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((goal, i) => {
              const selected = selectedGoal === goal.code
              const soon = !!goal.comingSoon
              return (
                <button
                  key={goal.code}
                  type="button"
                  disabled={soon}
                  onClick={() => !soon && setSelectedGoal(goal.code)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative flex animate-fade-up flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out",
                    soon
                      ? "cursor-not-allowed border-foreground/10 bg-white opacity-55"
                      : selected
                        ? "bg-[hsl(259_80%_55%/0.10)] hover:scale-[1.02]"
                        : "border-foreground/10 bg-white hover:scale-[1.02] hover:bg-foreground/5 hover:shadow-[0_0_32px_-10px_hsl(259_80%_55%/0.4)]"
                  )}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: "both",
                    ...(selected && !soon
                      ? {
                          borderColor: `hsl(${CORAL} / 0.85)`,
                          boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6), 0 0 38px -6px hsl(${CORAL} / 0.55)`,
                        }
                      : {}),
                  }}
                >
                  {/* Code chip + status indicator */}
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
                      style={
                        selected && !soon
                          ? {
                              background: `hsl(${CORAL} / 0.18)`,
                              color: `hsl(${CORAL})`,
                            }
                          : {
                              background: "hsl(var(--foreground) / 0.06)",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      {s.goalLabel} {goal.code}
                    </span>

                    {soon ? (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: `hsl(${PURPLE} / 0.16)`,
                          color: `hsl(${PURPLE} / 0.9)`,
                        }}
                      >
                        <Lock className="h-3 w-3" strokeWidth={2.5} />
                        {s.comingSoon}
                      </span>
                    ) : (
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
                    )}
                  </div>

                  {/* Aspiration */}
                  <p className="flex-1 text-pretty text-base font-semibold leading-snug text-foreground">
                    “{pick(goal.aspiration, lang)}”
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

                  {/* Programme length */}
                  <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                    {s.programmeLength}
                  </p>
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
            {s.confirmCta}
          </Button>
        </div>
      </footer>
    </main>
  )
}
