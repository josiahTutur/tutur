import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ACTIVITIES,
  ROUTINE_LABELS,
  STAGE_INFO,
  AAC_STAGES,
  AAC_CORE_WORDS,
  type Activity,
  type StageCode,
} from "@/lib/activities"
import { Check, Plus, X, Hand, Clock, Sparkles } from "lucide-react"

/* ========================================================================== *
 *  ActivityLibrary — browse & select daily intervention activities
 *
 *  Dose model: 3 activities/day · 5 min each · 15 min total. Parents browse the
 *  catalogue, open an activity to read its T1–T5 parent-coaching pathway, and
 *  add up to 3 to today's plan. The child's communication stage (from the
 *  profile) is highlighted so the parent sees the right pathway first.
 * ========================================================================== */

const CORAL = "12 100% 64%" // active selection
const TEAL = "172 66% 50%" // routine / activity metadata
const PURPLE = "270 95% 65%" // AAC modelling accent
const PURPLE_TEXT = "270 95% 84%" // lighter readable purple text

const MAX_PER_DAY = 3

/** Map a numeric profile stage (1–5) to a StageCode, clamped & safe. */
function toStageCode(stage?: number): StageCode {
  const n = Math.min(5, Math.max(1, stage ?? 1))
  return `T${n}` as StageCode
}

export default function ActivityLibrary({
  childStage,
  routines = [],
}: {
  childStage?: number
  /** Routine codes the parent selected — only these activities are shown. */
  routines?: string[]
}) {
  const childStageCode = toStageCode(childStage)

  const [routineFilter, setRoutineFilter] = useState<string>("all")
  const [selected, setSelected] = useState<string[]>([])
  const [openCode, setOpenCode] = useState<string | null>(null)

  // Activities scoped to the parent's selected routines (fall back to all if
  // none were passed, e.g. a direct entry without onboarding).
  const scoped = useMemo(
    () =>
      routines.length > 0
        ? ACTIVITIES.filter((a) => routines.includes(a.routine))
        : ACTIVITIES,
    [routines]
  )

  // Filter bar shows only the scoped routines that actually have activities.
  const routineOptions = useMemo(
    () => Array.from(new Set(scoped.map((a) => a.routine))),
    [scoped]
  )

  const visible = useMemo(
    () =>
      routineFilter === "all"
        ? scoped
        : scoped.filter((a) => a.routine === routineFilter),
    [routineFilter, scoped]
  )

  const openActivity = openCode
    ? ACTIVITIES.find((a) => a.code === openCode) ?? null
    : null

  const atCap = selected.length >= MAX_PER_DAY

  function toggleSelect(code: string) {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code)
      if (prev.length >= MAX_PER_DAY) return prev // hard cap at 3/day
      return [...prev, code]
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable catalogue */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-muted-foreground">
            Pilih sehingga {MAX_PER_DAY} aktiviti untuk hari ini — 5 minit setiap
            satu, 15 minit jumlah dos harian.
          </p>

          {/* Routine filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip
              label="Semua"
              active={routineFilter === "all"}
              onClick={() => setRoutineFilter("all")}
            />
            {routineOptions.map((r) => (
              <FilterChip
                key={r}
                label={ROUTINE_LABELS[r] ?? r}
                active={routineFilter === r}
                onClick={() => setRoutineFilter(r)}
              />
            ))}
          </div>

          {/* Activity grid */}
          {visible.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((activity) => (
                <ActivityCard
                  key={activity.code}
                  activity={activity}
                  selected={selected.includes(activity.code)}
                  disabled={atCap && !selected.includes(activity.code)}
                  onOpen={() => setOpenCode(activity.code)}
                  onToggle={() => toggleSelect(activity.code)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Belum ada aktiviti untuk rutin pilihan anda. Aktiviti baharu akan
              ditambah tidak lama lagi.
            </p>
          )}
        </div>
      </div>

      {/* Sticky daily-plan summary */}
      <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {selected.length} / {MAX_PER_DAY} aktiviti dipilih
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              · {selected.length * 5} minit
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_PER_DAY }, (_, i) => (
              <span
                key={i}
                className="h-2 w-8 rounded-full transition-colors"
                style={{
                  background:
                    i < selected.length
                      ? `hsl(${CORAL})`
                      : "hsl(0 0% 100% / 0.1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {openActivity && (
        <ActivityDetail
          activity={openActivity}
          childStage={childStageCode}
          selected={selected.includes(openActivity.code)}
          canAdd={!atCap || selected.includes(openActivity.code)}
          onToggle={() => toggleSelect(openActivity.code)}
          onClose={() => setOpenCode(null)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Filter chip                                                               */
/* -------------------------------------------------------------------------- */

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
        active ? "text-foreground" : "glass text-foreground/70 hover:text-foreground"
      )}
      style={
        active
          ? {
              background: `hsl(${TEAL} / 0.16)`,
              boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.4)`,
              color: `hsl(${TEAL})`,
            }
          : undefined
      }
    >
      {label}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Activity card                                                             */
/* -------------------------------------------------------------------------- */

function ActivityCard({
  activity,
  selected,
  disabled,
  onOpen,
  onToggle,
}: {
  activity: Activity
  selected: boolean
  disabled: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out",
        selected
          ? "bg-white/[0.07]"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:shadow-[0_0_32px_-10px_hsl(12_100%_64%/0.4)]"
      )}
      style={
        selected
          ? {
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 15px hsl(${CORAL} / 0.5), 0 0 0 1px hsl(${CORAL} / 0.6)`,
            }
          : undefined
      }
    >
      {/* Top row: type + select toggle */}
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {activity.type === "Seasonal" ? "Bermusim" : "Teras"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={selected}
          aria-label={selected ? "Buang dari hari ini" : "Tambah ke hari ini"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-95",
            selected
              ? "border-transparent text-background"
              : "border-white/20 text-foreground/80 hover:border-white/40 disabled:opacity-30"
          )}
          style={selected ? { background: `hsl(${CORAL})` } : undefined}
        >
          {selected ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Body — opens the detail */}
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 flex-col items-start text-left"
      >
        <h3 className="text-base font-bold leading-snug tracking-tight text-foreground">
          {activity.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{activity.coreSkill}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
          >
            {ROUTINE_LABELS[activity.routine] ?? activity.routine}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground/80">
            {activity.strategyName}
          </span>
        </div>

        <span className="mt-3 text-xs font-medium text-primary/90">
          Lihat panduan →
        </span>
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Activity detail modal — shows only the child's current stage pathway      */
/* -------------------------------------------------------------------------- */

function ActivityDetail({
  activity,
  childStage,
  selected,
  canAdd,
  onToggle,
  onClose,
}: {
  activity: Activity
  childStage: StageCode
  selected: boolean
  canAdd: boolean
  onToggle: () => void
  onClose: () => void
}) {
  // Only the child's current stage is shown — that's the active pathway the
  // parent should run today.
  const content = activity.stages.find((s) => s.stage === childStage)
  const info = STAGE_INFO[childStage]
  const stageNum = childStage.slice(1) // "1"–"5"
  const isAac = AAC_STAGES.includes(childStage)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[88vh] w-full max-w-2xl animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight">{activity.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ROUTINE_LABELS[activity.routine]} · {activity.strategyName} ·{" "}
                {activity.coreSkill}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Materials */}
          <div className="mt-3 flex flex-wrap gap-1.5">
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

        {/* Child's stage + routine + goal */}
        <div className="shrink-0 border-b border-border/60 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }}
            >
              Tahap {stageNum} — {info.name}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
            >
              {ROUTINE_LABELS[activity.routine] ?? activity.routine}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }}
            >
              Tahap anak anda
            </span>
          </div>
          <p className="mt-2 text-xs">
            <span className="font-semibold text-foreground/90">
              Matlamat tahap ini:{" "}
            </span>
            <span className="text-muted-foreground">{info.goal}</span>
          </p>
        </div>

        {/* Stage content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* AAC modelling note (T1–T3) */}
          {isAac && (
            <div
              className="rounded-2xl border-l-2 p-3"
              style={{
                background: `hsl(${PURPLE} / 0.08)`,
                borderLeftColor: `hsl(${PURPLE} / 0.7)`,
              }}
            >
              <div
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: `hsl(${PURPLE_TEXT})` }}
              >
                <Hand className="h-3.5 w-3.5" />
                Model AAC (Aided Language Input)
              </div>
              <p className="text-xs leading-relaxed text-foreground/85">
                Sentuh simbol pada Papan AAC sambil bercakap. AAC dimodelkan, bukan
                diuji — ibu bapa tunjuk dahulu.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AAC_CORE_WORDS.map((w) => (
                  <span
                    key={w}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: `hsl(${PURPLE} / 0.16)`, color: `hsl(${PURPLE_TEXT})` }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Parent instructions */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Arahan Ibu Bapa
            </h4>
            <p className="rounded-2xl glass p-3 text-sm leading-relaxed text-foreground/90">
              {content?.instructions}
            </p>
          </div>

          {/* Dialogue script */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Skrip Dialog
            </h4>
            <div className="space-y-2">
              {content?.dialogue.map((line, i) => (
                <div
                  key={i}
                  className="rounded-2xl rounded-tl-sm glass-strong px-3.5 py-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer action */}
        <div className="shrink-0 border-t border-border/60 px-5 py-4">
          <button
            type="button"
            onClick={onToggle}
            disabled={!canAdd}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-40",
              selected
                ? "glass text-foreground hover:bg-white/[0.08]"
                : "text-background"
            )}
            style={
              selected
                ? undefined
                : {
                    background: `hsl(${CORAL})`,
                    boxShadow: `0 0 24px -6px hsl(${CORAL} / 0.7)`,
                  }
            }
          >
            {selected ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} />
                Sudah ditambah ke hari ini
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Tambah ke hari ini
              </>
            )}
          </button>
          {!canAdd && !selected && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Had {MAX_PER_DAY} aktiviti sehari telah dicapai.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
