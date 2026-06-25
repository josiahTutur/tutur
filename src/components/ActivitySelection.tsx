import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Check, Sparkles } from "lucide-react"
import {
  ACTIVITIES,
  ROUTINE_LABELS,
  STAGE_INFO,
  type StageCode,
} from "@/lib/activities"

/* ========================================================================== *
 *  ActivitySelection — Part 3.7: Intervention Activity Selection Matrix
 *
 *  Multi-select activity onboarding shown right after Routine Selection. The
 *  parent curates which intervention activities Maya draws from. Mirrors the
 *  RoutineSelection design language: glassmorphic cards, Warm Coral active
 *  state, Calming Teal metadata badges.
 *
 *  The catalogue is data-driven from ACTIVITIES — it grows automatically as new
 *  activities (A4…A100) are appended. The target library is 100 activities
 *  (90 core "Teras" + 10 seasonal "Bermusim"); parents may pick up to 90.
 *
 *  Only activities that fit the child's communication stage (T1–T5) are shown:
 *  an activity fits if it carries a coaching pathway for that stage. Activities
 *  with no pathway for the child's stage are hidden entirely.
 * ========================================================================== */

const CORAL = "12 100% 64%" // active multi-selection indicator
const TEAL = "172 66% 50%" // routine / metadata badges

/** Hard ceiling on selections — 90 core activities of the 100-activity target. */
const MAX_SELECT = 90

/** Map a numeric profile stage (1–5) to a StageCode, clamped & safe. */
function toStageCode(stage?: number): StageCode {
  const n = Math.min(5, Math.max(1, stage ?? 1))
  return `T${n}` as StageCode
}

export default function ActivitySelection({
  childStage,
  onComplete,
  onBack,
}: {
  /** Child's communication stage (1–5) — only fitting activities are shown. */
  childStage?: number
  /** Locks the activity set and routes into the DashboardHub. */
  onComplete: (activityCodes: string[]) => void
  /** Returns to the previous (routine selection) step. */
  onBack: () => void
}) {
  const stageCode = toStageCode(childStage)
  const stageInfo = STAGE_INFO[stageCode]
  const stageNum = stageCode.slice(1) // "1"–"5"

  // Only surface activities that carry a coaching pathway for the child's
  // stage — anything that doesn't fit is hidden, never shown.
  const fitting = useMemo(
    () => ACTIVITIES.filter((a) => a.stages.some((s) => s.stage === stageCode)),
    [stageCode]
  )

  const [selected, setSelected] = useState<string[]>([])

  // Selection cap is bounded by both the 90-core ceiling and what's available.
  const cap = Math.min(MAX_SELECT, fitting.length)

  // Clean immutable toggle — add if absent (respecting the cap), remove if present.
  function toggleActivity(code: string) {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code)
      if (prev.length >= cap) return prev // hard cap at 90
      return [...prev, code]
    })
  }

  const count = selected.length
  const atCap = count >= cap
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
              Langkah 3 / 3
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
              Pilih Aktiviti Intervensi <span aria-hidden>🎯</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground md:mx-0">
              Aktiviti ini dipadankan dengan tahap komunikasi anak anda —{" "}
              <span className="font-semibold text-foreground">
                Tahap {stageNum} · {stageInfo.name}
              </span>
              . Pilih aktiviti yang ingin disuntik oleh Maya ke dalam rutin harian
              anda. Pilih sekurang-kurangnya 1, sehingga {cap} aktiviti.
            </p>
          </header>

          {/* B. Activity matrix — 1 / 2 / 3 columns */}
          {fitting.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fitting.map((activity, i) => {
                const isSelected = selected.includes(activity.code)
                const disabled = atCap && !isSelected
                return (
                  <button
                    key={activity.code}
                    type="button"
                    onClick={() => toggleActivity(activity.code)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative flex animate-fade-up flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out",
                      disabled && "cursor-not-allowed opacity-40",
                      !disabled && "hover:scale-[1.02]",
                      isSelected
                        ? "bg-white/[0.07]"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:shadow-[0_0_32px_-10px_hsl(12_100%_64%/0.4)]"
                    )}
                    style={{
                      animationDelay: `${i * 50}ms`,
                      animationFillMode: "both",
                      ...(isSelected
                        ? {
                            borderColor: `hsl(${CORAL} / 0.85)`,
                            boxShadow: `0 0 15px hsl(${CORAL} / 0.5), 0 0 0 1px hsl(${CORAL} / 0.6)`,
                          }
                        : {}),
                    }}
                  >
                    {/* Top row: checkbox + title + day badge */}
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                          isSelected ? "border-transparent" : "border-white/25"
                        )}
                        style={isSelected ? { background: `hsl(${CORAL})` } : undefined}
                        aria-hidden
                      >
                        {isSelected && (
                          <Check className="h-4 w-4 text-background" strokeWidth={3} />
                        )}
                      </span>

                      <h3 className="flex-1 pt-0.5 text-base font-semibold leading-snug text-foreground">
                        {activity.title}
                      </h3>
                    </div>

                    {/* Routine */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: `hsl(${TEAL} / 0.14)`,
                          color: `hsl(${TEAL})`,
                        }}
                      >
                        {ROUTINE_LABELS[activity.routine] ?? activity.routine}
                      </span>
                    </div>

                    {/* Perlu disediakan — things to prepare for this activity */}
                    {activity.materials.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Perlu disediakan
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {activity.materials.map((m) => (
                            <span
                              key={m}
                              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground/80"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              Belum ada aktiviti yang sepadan dengan tahap komunikasi anak anda.
              Aktiviti baharu akan ditambah tidak lama lagi.
            </p>
          )}
        </div>
      </div>

      {/* ---------------------- C. Floating action footer ----------------- */}
      <footer className="shrink-0 border-t border-border/60 bg-background/80 px-6 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2.5 text-center text-xs text-muted-foreground">
            {canProceed
              ? `${count} / ${cap} aktiviti dipilih`
              : "Pilih sekurang-kurangnya 1 aktiviti untuk diteruskan"}
          </p>
          <Button
            size="lg"
            disabled={!canProceed}
            onClick={() => canProceed && onComplete(selected)}
            className="group w-full rounded-2xl text-base font-semibold text-background transition-all duration-300 disabled:opacity-40"
            style={{
              background: `hsl(${CORAL})`,
              boxShadow: canProceed
                ? `0 0 30px -4px hsl(${CORAL} / 0.7)`
                : "none",
            }}
          >
            <Sparkles className="transition-transform duration-300 group-hover:scale-110" />
            Sahkan Aktiviti &amp; Jalankan Tutur
          </Button>
        </div>
      </footer>
    </main>
  )
}
