import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ACTIVITIES,
  ROUTINE_LABELS,
  AAC_STAGES,
  AAC_CORE_WORDS,
  type Activity,
  type AacWord,
  type StageCode,
} from "@/lib/activities"
import ProgressCalendar from "@/components/ProgressCalendar"
import {
  Check,
  Lock,
  X,
  Hand,
  Clock,
  Sparkles,
  LayoutGrid,
  ChevronLeft,
  Volume2,
  Trash2,
} from "lucide-react"

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
  activityCodes = [],
}: {
  childStage?: number
  /** Routine codes the parent selected — only these activities are shown. */
  routines?: string[]
  /** Activity codes the parent curated during onboarding — scopes the catalogue. */
  activityCodes?: string[]
}) {
  const childStageCode = toStageCode(childStage)

  const [routineFilter, setRoutineFilter] = useState<string>("all")
  const [selected, setSelected] = useState<string[]>([])
  const [openCode, setOpenCode] = useState<string | null>(null)

  // Activities scoped to the parent's curated set (if any) and selected
  // routines. Both fall back to "no filter" when empty, e.g. a direct entry
  // without onboarding.
  const scoped = useMemo(
    () =>
      ACTIVITIES.filter(
        (a) =>
          (activityCodes.length === 0 || activityCodes.includes(a.code)) &&
          (routines.length === 0 || routines.includes(a.routine))
      ),
    [routines, activityCodes]
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
        <div className="mx-auto max-w-5xl space-y-5">
          <p className="text-sm text-muted-foreground">
            Pantau kemajuan harian anak anda dan pilih aktiviti intervensi hari
            ini.
          </p>

          {/* Current-month progress calendar — reflects actual daily completion */}
          <ProgressCalendar />

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
                  onOpen={() => setOpenCode(activity.code)}
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
  onOpen,
}: {
  activity: Activity
  selected: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex flex-col items-start rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out active:scale-[0.99]",
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
      {/* "In today's plan" indicator (added/removed from the detail panel) */}
      {selected && (
        <span
          className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
          Hari ini
        </span>
      )}

      <h3 className="pr-16 text-base font-bold leading-snug tracking-tight text-foreground">
        {activity.title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
        >
          {ROUTINE_LABELS[activity.routine] ?? activity.routine}
        </span>
      </div>

      <span className="mt-3 text-xs font-medium text-primary/90">
        Lihat panduan →
      </span>
    </button>
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
  const isAac = AAC_STAGES.includes(childStage)

  // Toggles the in-activity AAC practice board (scoped to this activity's words).
  const [showBoard, setShowBoard] = useState(false)
  // Practice gate — the parent must tap every AAC word on the board before the
  // activity can be added, confirming they practised it with the child.
  const [practiced, setPracticed] = useState(false)

  // Adding is unlocked once practised (and within the daily cap). Removing an
  // already-added activity is always allowed.
  const canToggle = selected || (practiced && canAdd)

  // Brief "completed" confirmation shown after the parent taps the button,
  // before the panel closes back to the Aktiviti Harian page.
  const [completing, setCompleting] = useState(false)
  const showDone = selected || completing

  function handleComplete() {
    if (selected) {
      onToggle() // already recorded — tapping removes it from today's plan
      return
    }
    if (!canToggle) return
    onToggle() // record into today's plan
    setCompleting(true)
    window.setTimeout(onClose, 1000) // celebrate, then return to the list
  }

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
        {showBoard ? (
          <ActivityAacBoardView
            activity={activity}
            onBack={() => setShowBoard(false)}
            onVerified={() => setPracticed(true)}
          />
        ) : (
          <>
        {/* Header */}
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight">{activity.title}</h2>
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

          {/* AAC practice — gate for adding the activity */}
          <button
            type="button"
            onClick={() => setShowBoard(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.99]"
            style={{
              background: practiced ? `hsl(${PURPLE} / 0.22)` : `hsl(${PURPLE} / 0.16)`,
              color: `hsl(${PURPLE_TEXT})`,
              boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / ${practiced ? 0.6 : 0.4})`,
            }}
          >
            {practiced ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
            {practiced ? "Praktik AAC selesai — buka semula" : "Praktis dengan Papan AAC"}
          </button>

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
        <div className="shrink-0 border-t border-border/60 bg-background px-5 py-4">
          <button
            type="button"
            onClick={handleComplete}
            disabled={!canToggle || completing}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-40",
              showDone
                ? "glass text-foreground hover:bg-white/[0.08]"
                : "text-background"
            )}
            style={
              showDone
                ? undefined
                : {
                    background: `hsl(${CORAL})`,
                    // Glow only when actually enabled — avoids the coral glow
                    // bleeding over the content above when disabled.
                    boxShadow: canToggle
                      ? `0 0 24px -6px hsl(${CORAL} / 0.7)`
                      : "none",
                  }
            }
          >
            {showDone ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} />
                Kami dah berjaya hari ini! 🎉
              </>
            ) : canToggle ? (
              <>Klik di sini untuk selesai</>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Klik di sini untuk selesai
              </>
            )}
          </button>

          {/* Hints for why the button is locked */}
          {!selected && !practiced && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Hand className="h-3.5 w-3.5 shrink-0" style={{ color: `hsl(${PURPLE_TEXT})` }} />
              Praktis dengan Papan AAC bersama anak dahulu.
            </p>
          )}
          {!selected && practiced && !canAdd && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Had {MAX_PER_DAY} aktiviti sehari telah dicapai.
            </p>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Activity AAC board — practice view scoped to one activity's symbols       */
/* -------------------------------------------------------------------------- */

function ActivityAacBoardView({
  activity,
  onBack,
  onVerified,
}: {
  activity: Activity
  onBack: () => void
  /** Called once every word has been tapped — confirms the practice. */
  onVerified: () => void
}) {
  const [strip, setStrip] = useState<AacWord[]>([])
  // Words tapped at least once — practice is verified when all are used.
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [celebrate, setCelebrate] = useState(false)
  const total = activity.aacWords.length
  const allUsed = used.size >= total

  // Keep the latest chip in view as the single-line strip overflows.
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stripRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [strip])

  function tap(tile: AacWord) {
    setStrip((s) => [...s, tile])
    if (!used.has(tile.label)) {
      const next = new Set(used)
      next.add(tile.label)
      setUsed(next)
      if (next.size >= total) {
        onVerified()
        setCelebrate(true)
        window.setTimeout(() => setCelebrate(false), 1800)
      }
    }
  }

  // Speak the built phrase aloud (browser TTS), if available.
  function speak() {
    const text = strip.map((t) => t.label).join(" ")
    if (!text || typeof window === "undefined" || !window.speechSynthesis) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = "ms-MY"
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke panduan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold tracking-tight">Papan AAC</h2>
          <p className="truncate text-xs text-muted-foreground">
            {activity.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali ke panduan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Sentence strip */}
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl glass-strong p-2.5">
          <div
            ref={stripRef}
            className="flex min-h-[2.75rem] flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {strip.length === 0 ? (
              <span className="shrink-0 px-2 text-sm text-muted-foreground">
                Ketik simbol untuk membina ayat…
              </span>
            ) : (
              strip.map((tile, i) => (
                <span
                  key={`${tile.label}-${i}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-sm font-medium"
                >
                  <span aria-hidden>{tile.emoji}</span>
                  {tile.label}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            aria-label="Sebut ayat"
            onClick={speak}
            disabled={strip.length === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-background transition-transform active:scale-95 disabled:opacity-40"
            style={{
              background: `hsl(${PURPLE})`,
              boxShadow: `0 0 18px -4px hsl(${PURPLE} / 0.7)`,
            }}
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Padam ayat"
            onClick={() => setStrip([])}
            disabled={strip.length === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Practice progress */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <span className="text-xs font-medium text-muted-foreground">
          {allUsed
            ? "Praktik selesai! Anda boleh tambah aktiviti ini."
            : "Ketik setiap perkataan untuk praktik bersama anak"}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: allUsed ? `hsl(${PURPLE} / 0.22)` : "hsl(0 0% 100% / 0.06)",
            color: allUsed ? `hsl(${PURPLE_TEXT})` : "hsl(var(--muted-foreground))",
          }}
        >
          {used.size}/{total}
        </span>
      </div>

      {/* Symbol grid — only this activity's relevant words */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {activity.aacWords.map((tile) => {
            const isUsed = used.has(tile.label)
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => tap(tile)}
                className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl glass-strong transition-all hover:bg-white/[0.09] active:scale-95"
                style={{
                  boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / ${isUsed ? 0.6 : 0.25})`,
                }}
              >
                {isUsed && (
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: `hsl(${PURPLE})` }}
                  >
                    <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />
                  </span>
                )}
                <span className="text-3xl sm:text-4xl" aria-hidden>
                  {tile.emoji}
                </span>
                <span
                  className="text-xs font-semibold sm:text-sm"
                  style={{ color: `hsl(${PURPLE_TEXT})` }}
                >
                  {tile.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick celebration when every word has been practised */}
      {celebrate && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="flex animate-fade-up gap-1 text-5xl" style={{ animationFillMode: "both" }}>
            {["🎉", "⭐", "🎊", "✨", "🎉"].map((e, i) => (
              <span
                key={i}
                className="animate-bounce"
                style={{ animationDelay: `${i * 90}ms` }}
                aria-hidden
              >
                {e}
              </span>
            ))}
          </div>
          <p
            className="mt-3 animate-fade-up rounded-full px-4 py-1.5 text-sm font-bold backdrop-blur-md"
            style={{
              animationDelay: "80ms",
              animationFillMode: "both",
              background: `hsl(${PURPLE} / 0.2)`,
              color: `hsl(${PURPLE_TEXT})`,
            }}
          >
            Hebat! Praktik selesai 🎉
          </p>
        </div>
      )}
    </>
  )
}
