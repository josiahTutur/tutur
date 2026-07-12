import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useLang, pick } from "@/lib/i18n"
import {
  ACTIVITIES,
  ROUTINE_LABELS,
  AAC_STAGES,
  MAYA_REFLECTION_PROMPT,
  type Activity,
  type AacWord,
  type StageCode,
} from "@/lib/activities"
import ProgressCalendar from "@/components/ProgressCalendar"
import { DayPlayer } from "@/components/day/DayPlayer"
import { SltBanner } from "@/components/day/SltBanner"
import { TodaysActivityCard } from "@/components/day/TodaysActivityCard"
import { dayConfig } from "@/content/days"
import { type Vars } from "@/lib/interpolate"
import { formatDuration } from "@/lib/progress"
import { getAacVoice } from "@/lib/voice"
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
  Play,
  Pencil,
} from "lucide-react"

/* ========================================================================== *
 *  ActivityLibrary — browse & select daily intervention activities
 *
 *  Dose model: 3 activities/day · 5 min each · 15 min total. Parents browse the
 *  catalogue, open an activity to read its T1–T5 parent-coaching pathway, and
 *  add up to 3 to today's plan. The child's communication stage (from the
 *  profile) is highlighted so the parent sees the right pathway first.
 * ========================================================================== */

const CORAL = "259 80% 55%" // active selection
const TEAL = "180 68% 34%" // routine / activity metadata
const PURPLE = "259 80% 55%" // AAC modelling accent
const PURPLE_TEXT = "258 55% 42%" // lighter readable purple text

/** Minimum seconds on the AAC board before the activity can be completed.
 *  (Testing value — may be increased later.) */
const AAC_MIN_SECONDS = 15

/* -------------------------------------------------------------------------- */
/*  Co-located UI chrome strings (screen/board furniture). Activity content    */
/*  itself comes from ACTIVITIES and is migrated separately — never here.      */
/* -------------------------------------------------------------------------- */

const STR = {
  ms: {
    /** Gentle send-offs shown when a parent leaves before finishing. */
    motivations: [
      "Tak mengapa. Setiap percubaan tetap bermakna. 💛",
      "Rehat seketika tak apa. Jumpa lagi nanti! 🌱",
      "Anda dah cuba — itu yang penting. 🌟",
      "Setiap saat bersama anak tetap berharga. 💛",
    ],
    // ActivityLibrary
    intro: "Pilih aktiviti untuk dilakukan bersama anak anda hari ini.",
    filterAll: "Semua",
    emptyState:
      "Belum ada aktiviti untuk rutin pilihan anda. Aktiviti baharu akan ditambah tidak lama lagi.",
    activitiesDoneToday: (n: number) => `${n} aktiviti selesai hari ini`,
    // ActivityCard
    completed: "Selesai",
    needToPrepare: "Perlu disediakan",
    viewGuide: "Lihat panduan →",
    // ActivityDetail
    close: "Tutup",
    yourReflection: "Refleksi Anda",
    edit: "Edit",
    cancel: "Batal",
    save: "Simpan",
    situation: "Situasi",
    aacModel: "Model AAC (Aided Language Input)",
    aacModelNote: (rel: string) =>
      `Sebut sambil sentuh perkataan ini pada Papan AAC. AAC dimodelkan, bukan diuji — ${rel} tunjuk dahulu.`,
    wordsToUse: "Perkataan untuk digunakan",
    instructionFor: (rel: string) => `Arahan ${rel}`,
    dialogueScript: "Skrip Dialog",
    childSignalSought: "Isyarat Anak yang Dicari",
    aacPracticeDone: "Praktik AAC selesai — buka semula",
    practiseWithAacBoard: "Praktis dengan Papan AAC",
    done: "Selesai",
    notDone: "Belum Selesai",
    practiseToComplete:
      "Praktis dengan Papan AAC & tulis refleksi untuk selesaikan.",
    // ActivityAacBoardView
    backToGuide: "Kembali ke panduan",
    aacBoard: "Papan AAC",
    closeAacBoard: "Tutup papan AAC",
    practiseOnAacBoard: "Praktis di Papan AAC",
    startPrompt: (secs: number) =>
      `Tekan Mula, kemudian praktis bersama anak sekurang-kurangnya ${secs} saat.`,
    start: "Mula",
    tapToBuild: "Ketik simbol untuk membina ayat…",
    speakSentence: "Sebut ayat",
    clearSentence: "Padam ayat",
    writeReflectionBelow: "Tulis refleksi di bawah untuk selesaikan.",
    keepPlaying: "Teruskan bermain bersama anak…",
    maya: "Maya: ",
    reflectionPlaceholder: "Tulis pemerhatian atau perasaan anda di sini…",
    saveAndFinish: "Simpan & Selesai",
    noteSaved: "Nota ini disimpan untuk rekod perkembangan anak anda.",
    writeToComplete: "Tulis pemerhatian anda untuk menyelesaikan aktiviti.",
    celebration: "Kita dah berjaya hari ini! 🎉",
    savedWellDone: "Disimpan! Syabas 🎉",
    closeWithoutFinishing: "Tutup tanpa selesai?",
    closeWarning: (secs: number) => ({
      before: "Anda belum menyimpan refleksi. Jika tutup sekarang, masa dan praktis ini ",
      bold: "tidak akan disimpan",
      after: ` — anda perlu mengulang semula selama ${secs} saat kali seterusnya.`,
    }),
    continue: "Teruskan",
    closeConfirm: "Tutup",
  },
  en: {
    motivations: [
      "That's okay. Every attempt still matters. 💛",
      "It's fine to take a break. See you again soon! 🌱",
      "You gave it a try — that's what counts. 🌟",
      "Every moment with your child is precious. 💛",
    ],
    // ActivityLibrary
    intro: "Choose an activity to do with your child today.",
    filterAll: "All",
    emptyState:
      "There are no activities yet for your chosen routines. New activities will be added soon.",
    activitiesDoneToday: (n: number) => `${n} activities done today`,
    // ActivityCard
    completed: "Done",
    needToPrepare: "What to prepare",
    viewGuide: "View guide →",
    // ActivityDetail
    close: "Close",
    yourReflection: "Your Reflection",
    edit: "Edit",
    cancel: "Cancel",
    save: "Save",
    situation: "Situation",
    aacModel: "AAC Modelling (Aided Language Input)",
    aacModelNote: (rel: string) =>
      `Say the word while touching it on the AAC Board. AAC is modelled, not tested — ${rel} shows the way first.`,
    wordsToUse: "Words to use",
    instructionFor: (rel: string) => `Guidance for ${rel}`,
    dialogueScript: "Dialogue Script",
    childSignalSought: "Signal to Look For in Your Child",
    aacPracticeDone: "AAC practice done — reopen",
    practiseWithAacBoard: "Practise with the AAC Board",
    done: "Done",
    notDone: "Not Done Yet",
    practiseToComplete:
      "Practise with the AAC Board & write a reflection to finish.",
    // ActivityAacBoardView
    backToGuide: "Back to guide",
    aacBoard: "AAC Board",
    closeAacBoard: "Close AAC board",
    practiseOnAacBoard: "Practise on the AAC Board",
    startPrompt: (secs: number) =>
      `Tap Start, then practise with your child for at least ${secs} seconds.`,
    start: "Start",
    tapToBuild: "Tap a symbol to build a sentence…",
    speakSentence: "Speak sentence",
    clearSentence: "Clear sentence",
    writeReflectionBelow: "Write a reflection below to finish.",
    keepPlaying: "Keep playing with your child…",
    maya: "Maya: ",
    reflectionPlaceholder: "Write your observations or feelings here…",
    saveAndFinish: "Save & Finish",
    noteSaved: "This note is saved for your child's progress record.",
    writeToComplete: "Write your observations to complete the activity.",
    celebration: "We did it today! 🎉",
    savedWellDone: "Saved! Well done 🎉",
    closeWithoutFinishing: "Close without finishing?",
    closeWarning: (secs: number) => ({
      before: "You haven't saved your reflection yet. If you close now, this time and practice ",
      bold: "will not be saved",
      after: ` — you'll need to repeat it for ${secs} seconds next time.`,
    }),
    continue: "Continue",
    closeConfirm: "Close",
  },
} as const

/* -------------------------------------------------------------------------- */
/*  Activity AAC audio — Malay voice clips (ms-MY-YasminNeural via edge-tts).  */
/*  Separate from the main Papan AAC (/audio/aac); these live under            */
/*  /audio/activities/aac/<slug>.mp3. Falls back to browser TTS if missing.    */
/* -------------------------------------------------------------------------- */

const ACTIVITY_AAC_AUDIO_BASE = "/audio/activities/aac/"

function activityAacSrc(label: string): string {
  const slug = label.toLowerCase().trim().replace(/\s+/g, "-")
  // Voice folder (female|male) is chosen by the user in Settings.
  return `${ACTIVITY_AAC_AUDIO_BASE}${getAacVoice()}/${slug}.mp3`
}

function speakFallback(label: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(label)
  utter.lang = "ms-MY"
  window.speechSynthesis.speak(utter)
}

/** Play a word's clip; resolves when done (or falls back to TTS). */
function playAacWord(label: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const fail = () => {
      if (!settled) {
        speakFallback(label)
        finish()
      }
    }
    const audio = new Audio(activityAacSrc(label))
    audio.onended = finish
    audio.onerror = fail
    audio.play().catch(fail)
  })
}

/** Map a numeric profile stage (1–5) to a StageCode, clamped & safe. */
function toStageCode(stage?: number): StageCode {
  const n = Math.min(5, Math.max(1, stage ?? 1))
  return `T${n}` as StageCode
}

/** What's recorded when an activity is completed. */
export interface ActivityRecord {
  note: string // the parent's reflection (pemerhatian)
  seconds: number // time spent on the AAC board
  id?: string // the row id in activity_completions (for editing later)
}

export default function ActivityLibrary({
  childStage,
  relationship = "Ibu Bapa",
  childName,
  panggilan,
  sltBanner = false,
  onDismissSlt,
  routines = [],
  activityCodes = [],
  records,
  onSaveRecord,
}: {
  childStage?: number
  /** Guardian's relationship to the child (e.g. "Bapa"); labels the guidance. */
  relationship?: string
  /** {anak} — the child's nickname, spoken in every 14-day script line. */
  childName?: string
  /** {panggilan} — what the child calls this parent ("Ibu", "Nenek", "Mak Long"). */
  panggilan?: string
  /** Show the SLT recommendation (spec §5.1). */
  sltBanner?: boolean
  onDismissSlt?: () => void
  /** Routine codes the parent selected — only these activities are shown. */
  routines?: string[]
  /** Activity codes the parent curated during onboarding — scopes the catalogue. */
  activityCodes?: string[]
  /** Completed activities → reflection + time, lifted to the hub so the chat,
   *  Aktiviti Harian, and Analisis all share one source of truth. */
  records: Record<string, ActivityRecord>
  /** Save/update a completion record (note + optional seconds). */
  onSaveRecord: (code: string, note: string, seconds?: number) => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const childStageCode = toStageCode(childStage)

  const [routineFilter, setRoutineFilter] = useState<string>("all")
  const [openCode, setOpenCode] = useState<string | null>(null)

  // ── The 14-day programme ────────────────────────────────────────────────
  // Open = the day player is running full-screen over the library.
  const [dayOpen, setDayOpen] = useState(false)

  // Which content day the parent is on. There is no day_session table yet, so
  // "today" is simply Day 1 for everyone — this becomes a real lookup in Phase 2.
  const today = dayConfig(1)

  const dayVars: Vars = {
    anak: childName?.trim() || "anak anda",
    panggilan: panggilan?.trim() || "Ibu",
    // {mainan} is unknown until the child picks a toy on Day 1 (screen C5, not
    // built). Left undefined on purpose so the raw token shows if content
    // references it too early — a content bug we want visible, not papered over.
    mainan: undefined,
  }
  // The activity the parent is currently on (last opened) — gets the orange
  // border so they can see which one they picked, separate from "completed".
  const [focusedCode, setFocusedCode] = useState<string | null>(null)

  const completedCount = Object.keys(records).length
  const todaySeconds = Object.values(records).reduce((s, r) => s + r.seconds, 0)

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

  const visible = useMemo(() => {
    const list =
      routineFilter === "all"
        ? scoped
        : scoped.filter((a) => a.routine === routineFilter)
    // Follow the programme order (Day 1, 2, 3…).
    return [...list].sort((a, b) => (a.day ?? 999) - (b.day ?? 999))
  }, [routineFilter, scoped])

  const openActivity = openCode
    ? ACTIVITIES.find((a) => a.code === openCode) ?? null
    : null

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable catalogue */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Current-month progress calendar — only real completions show;
              past days stay neutral (no placeholder data) until truly done. */}
          <ProgressCalendar
            todayCompleted={completedCount}
            todaySeconds={todaySeconds}
            samplePast={false}
            collapsible
          />

          {/* ── AKTIVITI HARI INI · the 14-day programme ──────────────────
              Sits between the calendar and the picker, and will eventually
              REPLACE the picker. Both coexist during the pilot so the old flow
              stays testable. */}
          <TodaysActivityCard
            day={today}
            vars={dayVars}
            onOpen={() => setDayOpen(true)}
          />

          {/* The SLT recommendation sits UNDER today's card, never above it.
              She came here to do the activity; that is the hero. This waits
              patiently below — an open door, not a summons. */}
          {sltBanner && onDismissSlt && <SltBanner onDismiss={onDismissSlt} />}

          <p className="text-sm text-muted-foreground">
            {s.intro}
          </p>

          {/* Routine filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip
              label={s.filterAll}
              active={routineFilter === "all"}
              onClick={() => setRoutineFilter("all")}
            />
            {routineOptions.map((r) => (
              <FilterChip
                key={r}
                label={ROUTINE_LABELS[r] ? pick(ROUTINE_LABELS[r], lang) : r}
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
                  completed={!!records[activity.code]}
                  focused={focusedCode === activity.code}
                  onOpen={() => {
                    setFocusedCode(activity.code)
                    setOpenCode(activity.code)
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              {s.emptyState}
            </p>
          )}
        </div>
      </div>

      {/* Sticky daily summary — completed count + total time spent today */}
      <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4" style={{ color: `hsl(${TEAL})` }} strokeWidth={3} />
            <span className="font-medium">
              {s.activitiesDoneToday(completedCount)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-4 w-4" style={{ color: `hsl(${TEAL})` }} />
            <span style={{ color: `hsl(${TEAL})` }}>
              {formatDuration(todaySeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {openActivity && (
        <ActivityDetail
          activity={openActivity}
          childStage={childStageCode}
          relationship={relationship}
          completed={!!records[openActivity.code]}
          note={records[openActivity.code]?.note ?? ""}
          onSaveRecord={(note, seconds) =>
            onSaveRecord(openActivity.code, note, seconds)
          }
          onClose={() => setOpenCode(null)}
        />
      )}

      {/* The 14-day day player — full-screen over the library.
          Nothing it produces is persisted yet: there is no day_session table,
          so a completed Day 1 leaves no trace. That lands in Phase 2. */}
      {dayOpen && today?.kind === "activity" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
          <DayPlayer
            day={today}
            vars={dayVars}
            onExit={() => setDayOpen(false)}
          />
        </div>
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
              background: `hsl(${CORAL} / 0.16)`,
              boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
              color: `hsl(${CORAL})`,
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
  completed,
  focused,
  onOpen,
}: {
  activity: Activity
  /** In today's plan (done) — shows the teal "Selesai" chip. */
  completed: boolean
  /** The activity the parent is currently on — shows the orange border. */
  focused: boolean
  onOpen: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex flex-col items-start rounded-3xl border p-5 text-left backdrop-blur-xl transition-all duration-200 ease-in-out active:scale-[0.99]",
        focused
          ? "bg-[hsl(259_80%_55%/0.10)]"
          : "border-foreground/10 glass hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_20px_40px_-14px_rgba(38,21,92,0.28)]"
      )}
      style={
        focused
          ? {
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 15px hsl(${CORAL} / 0.5), 0 0 0 1px hsl(${CORAL} / 0.6)`,
            }
          : undefined
      }
    >
      {/* Completed indicator — teal = done (matches the Kemajuan calendar) */}
      {completed && (
        <span
          className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: `hsl(${TEAL} / 0.2)`,
            color: `hsl(${TEAL})`,
            boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.4)`,
          }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
          {s.completed}
        </span>
      )}

      <h3 className="pr-20 text-base font-bold leading-snug tracking-tight text-foreground">
        {pick(activity.title, lang)}
      </h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
        >
          {ROUTINE_LABELS[activity.routine]
            ? pick(ROUTINE_LABELS[activity.routine], lang)
            : activity.routine}
        </span>
      </div>

      {/* Perlu disediakan — things to prepare for this activity */}
      {pick(activity.materials, lang).length > 0 && (
        <div className="mt-3 w-full">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {s.needToPrepare}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pick(activity.materials, lang).map((m) => (
              <span
                key={m}
                className="rounded-full bg-[hsl(259_80%_55%/0.10)] px-2.5 py-1 text-[11px] font-medium text-foreground/80"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Activity detail modal — shows only the child's current stage pathway      */
/* -------------------------------------------------------------------------- */

function ActivityDetail({
  activity,
  childStage,
  relationship,
  completed,
  note,
  onSaveRecord,
  onClose,
}: {
  activity: Activity
  childStage: StageCode
  /** Guardian's relationship to the child (e.g. "Bapa") — labels the guidance. */
  relationship: string
  /** Whether the activity has been completed (has a record). */
  completed: boolean
  /** The saved reflection (pemerhatian) for a completed activity. */
  note: string
  /** Save/update the record: (note, seconds?). Seconds set only on first done. */
  onSaveRecord: (note: string, seconds?: number) => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = STR[lang]
  // Only the child's current stage is shown — that's the active pathway the
  // parent should run today.
  const content = activity.stages.find((s) => s.stage === childStage)
  const isAac = AAC_STAGES.includes(childStage)
  const selected = completed

  // Toggles the in-activity AAC practice board (scoped to this activity's words).
  const [showBoard, setShowBoard] = useState(false)
  // Edit mode for the saved reflection of an already-completed activity.
  const [editing, setEditing] = useState(false)
  const [editNote, setEditNote] = useState(note)

  // The AAC board's Refleksi submit records the activity + time and closes.
  function finishFromBoard(boardNote: string, seconds: number) {
    onSaveRecord(boardNote, seconds)
    onClose() // close board + panduan → Aktiviti Harian
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — anchored near the top, never covering the nav bar */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-2xl animate-fade-up flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl"
        style={{ animationFillMode: "both" }}
      >
        {showBoard ? (
          <ActivityAacBoardView
            activity={activity}
            onBack={() => setShowBoard(false)}
            onQuit={onClose}
            startCompleted={completed}
            initialNote={note}
            onComplete={finishFromBoard}
          />
        ) : (
          <>
        {/* Header */}
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
                >
                  {ROUTINE_LABELS[activity.routine]
                    ? pick(ROUTINE_LABELS[activity.routine], lang)
                    : activity.routine}
                </span>
              </div>
              <h2 className="text-lg font-bold tracking-tight">{pick(activity.title, lang)}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Materials */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pick(activity.materials, lang).map((m) => (
              <span
                key={m}
                className="rounded-full bg-[hsl(259_80%_55%/0.10)] px-2.5 py-1 text-[11px] font-medium text-foreground/80"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Stage content */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Refleksi Anda — saved reflection (read-only), with Edit */}
          {completed && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: `hsl(${PURPLE} / 0.1)`,
                boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / 0.3)`,
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: `hsl(${PURPLE_TEXT})` }}
                >
                  {t.yourReflection}
                </h4>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNote(note)
                      setEditing(true)
                    }}
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      background: `hsl(${PURPLE} / 0.2)`,
                      color: `hsl(${PURPLE_TEXT})`,
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                    {t.edit}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-2.5">
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl bg-[hsl(259_80%_55%/0.06)] p-3 text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
                    style={{ boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / 0.3)` }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-2xl py-2.5 text-sm font-semibold text-foreground glass transition-all hover:bg-foreground/5 active:scale-[0.99]"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editNote.trim()) return
                        onSaveRecord(editNote.trim())
                        setEditing(false)
                      }}
                      disabled={!editNote.trim()}
                      className="rounded-2xl py-2.5 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
                      style={{ background: `hsl(${PURPLE})` }}
                    >
                      {t.save}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {note || "—"}
                </p>
              )}
            </div>
          )}

          {/* Situasi — set-up with (T)(P)(D) technique cues */}
          {pick(activity.setup, lang) && (
            <div className="rounded-2xl bg-foreground/5 p-3">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.situation}
              </h4>
              <p className="text-sm leading-relaxed text-foreground/90">
                {pick(activity.setup, lang)}
              </p>
            </div>
          )}

          {/* AAC modelling note (T1–T3) — with the words to use */}
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
                {t.aacModel}
              </div>
              <p className="text-xs leading-relaxed text-foreground/85">
                {t.aacModelNote(relationship.toLowerCase())}
              </p>
              <p
                className="mt-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: `hsl(${PURPLE_TEXT})` }}
              >
                {t.wordsToUse}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activity.aacWords.map((w) => (
                  <span
                    key={w.label}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold"
                    style={{
                      background: `hsl(${PURPLE} / 0.22)`,
                      color: `hsl(${PURPLE_TEXT})`,
                    }}
                  >
                    <span aria-hidden>{w.emoji}</span>
                    {w.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Arahan */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.instructionFor(relationship)}
            </h4>
            <p className="rounded-2xl glass p-3 text-sm leading-relaxed text-foreground/90">
              {content && pick(content.instructions, lang)}
            </p>
          </div>

          {/* Skrip Dialog */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dialogueScript}
            </h4>
            <div className="space-y-2">
              {content && pick(content.dialogue, lang).map((line, i) => (
                <div
                  key={i}
                  className="rounded-2xl rounded-tl-sm glass-strong px-3.5 py-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Isyarat Anak yang Dicari */}
          {content?.targetSignal && pick(content.targetSignal, lang) && (
            <div
              className="rounded-2xl border-l-2 p-3"
              style={{
                background: `hsl(${TEAL} / 0.08)`,
                borderLeftColor: `hsl(${TEAL} / 0.7)`,
              }}
            >
              <h4
                className="mb-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: `hsl(${TEAL})` }}
              >
                {t.childSignalSought}
              </h4>
              <p className="text-sm leading-relaxed text-foreground/90">
                {pick(content.targetSignal, lang)}
              </p>
            </div>
          )}

          {/* AAC practice — open the board (practise ≥15s + write Refleksi) */}
          <button
            type="button"
            onClick={() => setShowBoard(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.99]"
            style={{
              background: selected ? `hsl(${PURPLE} / 0.22)` : `hsl(${PURPLE} / 0.16)`,
              color: `hsl(${PURPLE_TEXT})`,
              boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / ${selected ? 0.6 : 0.4})`,
            }}
          >
            {selected ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
            {selected ? t.aacPracticeDone : t.practiseWithAacBoard}
          </button>
        </div>

        {/* Footer — completion status (recorded via the AAC board's Refleksi) */}
        <div className="shrink-0 border-t border-border/60 bg-background px-5 py-4">
          <div
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold",
              selected ? "glass text-foreground" : "text-muted-foreground"
            )}
            style={selected ? undefined : { background: "hsl(0 0% 0% / 0.04)" }}
          >
            {selected ? (
              <>
                <Check className="h-4 w-4" strokeWidth={3} />
                {t.done}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                {t.notDone}
              </>
            )}
          </div>

          {!selected && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Hand className="h-3.5 w-3.5 shrink-0" style={{ color: `hsl(${PURPLE_TEXT})` }} />
              {t.practiseToComplete}
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
/*  Activity AAC board modal — standalone wrapper around the practice board.   */
/*  Same board used inside ActivityDetail, but openable from anywhere (e.g.    */
/*  the Panduan AI chat), so a parent can complete an activity without leaving */
/*  the conversation. Completion flows through onSaveRecord like everywhere.   */
/* -------------------------------------------------------------------------- */

export function ActivityBoardModal({
  activity,
  completed,
  initialNote,
  onSaveRecord,
  onClose,
}: {
  activity: Activity
  /** Already completed (reopening to review/redo). */
  completed: boolean
  /** Pre-fill the reflection when reopening. */
  initialNote: string
  /** Record the completion (note + time). */
  onSaveRecord: (note: string, seconds: number) => void
  onClose: () => void
}) {
  function finish(note: string, seconds: number) {
    onSaveRecord(note, seconds)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-2xl animate-fade-up flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl"
        style={{ animationFillMode: "both" }}
      >
        <ActivityAacBoardView
          activity={activity}
          onBack={onClose}
          onQuit={onClose}
          startCompleted={completed}
          initialNote={initialNote}
          onComplete={finish}
          skipMotivation // chat shows its own nudge instead of the send-off
        />
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
  onQuit,
  startCompleted,
  initialNote,
  onComplete,
  skipMotivation = false,
}: {
  activity: Activity
  /** Back to the panduan (used for the harmless, no-progress close). */
  onBack: () => void
  /** Exit the whole activity without saving → Aktiviti Harian. */
  onQuit: () => void
  /** Pre-mark as done (reopening an already-completed activity). */
  startCompleted: boolean
  /** Pre-fill the reflection when reopening a completed activity. */
  initialNote: string
  /** Record completion (note + time) and close → Aktiviti Harian. */
  onComplete: (note: string, seconds: number) => void
  /** Quit immediately on "Tutup" (no motivation send-off) — used by the chat,
   *  which shows its own follow-up nudge instead. */
  skipMotivation?: boolean
}) {
  const { lang } = useLang()
  const t = STR[lang]
  const [strip, setStrip] = useState<AacWord[]>([])
  // Words tapped at least once — practice is verified when all are used. When
  // reopening a completed activity, every word starts already checked.
  const [used, setUsed] = useState<Set<string>>(() =>
    startCompleted ? new Set(activity.aacWords.map((w) => w.label)) : new Set()
  )
  const [celebrate, setCelebrate] = useState(false)
  // The parent jots a reflection inline once all words are practised.
  const [note, setNote] = useState(initialNote)
  // The timer only runs after the parent taps "Mula" (so idle time isn't
  // counted). A reopened completed activity starts already running & past time.
  const [started, setStarted] = useState(startCompleted)
  const [submitted, setSubmitted] = useState(false)
  const [elapsed, setElapsed] = useState(startCompleted ? AAC_MIN_SECONDS : 0)
  // Warning is up while closing — the timer pauses until "Teruskan".
  const [confirmClose, setConfirmClose] = useState(false)
  const celebratedRef = useRef(startCompleted)
  const total = activity.aacWords.length
  const allUsed = used.size >= total
  const timeReached = elapsed >= AAC_MIN_SECONDS
  // Completed only after practising every word AND spending the minimum time.
  const done = allUsed && timeReached

  // Tick the on-board timer once per second, only after "Mula". Paused while the
  // close-warning is open; resets on unmount (= quitting).
  useEffect(() => {
    if (!started || confirmClose) return
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [started, confirmClose])

  // Save the reflection + time, show a brief success, then close to the list.
  function handleSubmit() {
    if (!note.trim() || submitted) return
    setSubmitted(true)
    const trimmed = note.trim()
    const seconds = elapsed
    window.setTimeout(() => onComplete(trimmed, seconds), 1300)
  }

  // Closing with unsaved progress loses the time & practice — warn first.
  function tryClose() {
    if (started && !submitted && !startCompleted) setConfirmClose(true)
    else onBack()
  }

  // Leaving for real — show an encouraging send-off, then exit to the list.
  const [leaving, setLeaving] = useState(false)
  const [motivation, setMotivation] = useState("")
  function handleLeave() {
    setConfirmClose(false)
    // Chat context: skip the send-off and quit at once (the chat nudges instead).
    if (skipMotivation) {
      onQuit()
      return
    }
    setMotivation(
      t.motivations[Math.floor(Math.random() * t.motivations.length)]
    )
    setLeaving(true)
    window.setTimeout(onQuit, 2000)
  }

  // Celebrate once, the moment the practice + time minimum are both met.
  useEffect(() => {
    if (!celebratedRef.current && done) {
      celebratedRef.current = true
      setCelebrate(true)
      window.setTimeout(() => setCelebrate(false), 1900)
    }
  }, [done])

  // Keep the latest chip in view as the single-line strip overflows.
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stripRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [strip])

  function tap(tile: AacWord) {
    setStrip((s) => [...s, tile])
    playAacWord(tile.label) // play the word's voice clip on tap
    if (!used.has(tile.label)) {
      const next = new Set(used)
      next.add(tile.label)
      setUsed(next)
    }
  }

  // Play the built phrase — each word's clip, one after another.
  const speakingRef = useRef(false)
  async function speak() {
    if (speakingRef.current || strip.length === 0) return
    speakingRef.current = true
    for (const tile of strip) await playAacWord(tile.label)
    speakingRef.current = false
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={tryClose}
          aria-label={t.backToGuide}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold tracking-tight">{t.aacBoard}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {pick(activity.title, lang)}
          </p>
        </div>
        <button
          type="button"
          onClick={tryClose}
          aria-label={t.closeAacBoard}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!started ? (
        /* Start screen — the timer only begins once the parent taps Mula */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: `hsl(${PURPLE} / 0.18)`,
              boxShadow: `0 0 36px -6px hsl(${PURPLE} / 0.6)`,
            }}
          >
            <LayoutGrid className="h-9 w-9" style={{ color: `hsl(${PURPLE_TEXT})` }} />
          </span>
          <div>
            <h3 className="text-base font-bold tracking-tight">{t.practiseOnAacBoard}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t.startPrompt(AAC_MIN_SECONDS)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mb-6 flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-background transition-transform active:scale-[0.97]"
            style={{
              background: `hsl(${PURPLE})`,
              boxShadow: `0 0 24px -6px hsl(${PURPLE} / 0.7)`,
            }}
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            {t.start}
          </button>
        </div>
      ) : (
        <>
      {/* Sentence strip */}
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center gap-2 rounded-2xl glass-strong p-2.5">
          <div
            ref={stripRef}
            className="flex min-h-[2.75rem] flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {strip.length === 0 ? (
              <span className="shrink-0 px-2 text-sm text-muted-foreground">
                {t.tapToBuild}
              </span>
            ) : (
              strip.map((tile, i) => (
                <span
                  key={`${tile.label}-${i}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[hsl(259_80%_55%/0.10)] px-2.5 py-1.5 text-sm font-medium"
                >
                  <span aria-hidden>{tile.emoji}</span>
                  {tile.label}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            aria-label={t.speakSentence}
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
            aria-label={t.clearSentence}
            onClick={() => setStrip([])}
            disabled={strip.length === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Practice progress — words tapped + on-board timer */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
        <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          {done ? t.writeReflectionBelow : t.keepPlaying}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              background: timeReached ? `hsl(${PURPLE} / 0.22)` : "hsl(var(--foreground) / 0.06)",
              color: timeReached ? `hsl(${PURPLE_TEXT})` : "hsl(var(--muted-foreground))",
            }}
          >
            <Clock className="h-3 w-3" />
            {Math.min(elapsed, AAC_MIN_SECONDS)}/{AAC_MIN_SECONDS}s
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{
              background: allUsed ? `hsl(${PURPLE} / 0.22)` : "hsl(var(--foreground) / 0.06)",
              color: allUsed ? `hsl(${PURPLE_TEXT})` : "hsl(var(--muted-foreground))",
            }}
          >
            {used.size}/{total}
          </span>
        </div>
      </div>

      {/* Symbol grid + Refleksi (below the words) */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {activity.aacWords.map((tile) => {
            const isUsed = used.has(tile.label)
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => tap(tile)}
                className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl glass-strong transition-all hover:bg-[hsl(259_80%_55%/0.08)] active:scale-95"
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

        {/* Refleksi — appears below the words once the practice + minimum time
            are met (after celebration). Completion is recorded on submit. */}
        {done && !celebrate && (
          <div
            className="animate-fade-up space-y-3 rounded-2xl p-4"
            style={{
              animationDelay: "60ms",
              animationFillMode: "both",
              background: `hsl(${PURPLE} / 0.1)`,
              boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / 0.3)`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: `hsl(${PURPLE} / 0.25)`, color: `hsl(${PURPLE_TEXT})` }}
              >
                M
              </span>
              <div className="rounded-2xl rounded-tl-sm glass-strong px-4 py-3 text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold">{t.maya}</span>
                {pick(MAYA_REFLECTION_PROMPT, lang)}
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={t.reflectionPlaceholder}
              className="w-full resize-none rounded-2xl bg-[hsl(259_80%_55%/0.06)] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
              style={{ boxShadow: `inset 0 0 0 1px hsl(${PURPLE} / 0.3)` }}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!note.trim() || submitted}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
              style={{
                background: `hsl(${PURPLE})`,
                boxShadow: note.trim() ? `0 0 24px -6px hsl(${PURPLE} / 0.7)` : "none",
              }}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {t.saveAndFinish}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {note.trim() ? t.noteSaved : t.writeToComplete}
            </p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Celebration — plays the moment all words are practised */}
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
            {t.celebration}
          </p>
        </div>
      )}

      {/* Saved — a brief success beat before closing to Aktiviti Harian */}
      {submitted && (
        <div
          className="absolute inset-0 z-20 flex animate-fade-up flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-sm"
          style={{ animationFillMode: "both" }}
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: `hsl(${PURPLE} / 0.2)`,
              boxShadow: `0 0 36px -6px hsl(${PURPLE} / 0.7)`,
            }}
          >
            <Check className="h-8 w-8" strokeWidth={3} style={{ color: `hsl(${PURPLE_TEXT})` }} />
          </span>
          <p className="text-base font-bold" style={{ color: `hsl(${PURPLE_TEXT})` }}>
            {t.savedWellDone}
          </p>
        </div>
      )}

      {/* Close confirmation — progress will be lost if they leave now */}
      {confirmClose && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmClose(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm animate-fade-up rounded-3xl border border-foreground/10 bg-background/95 p-5 backdrop-blur-2xl"
            style={{ animationFillMode: "both" }}
          >
            <h3 className="text-base font-bold tracking-tight">{t.closeWithoutFinishing}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t.closeWarning(AAC_MIN_SECONDS).before}
              <span className="font-semibold text-foreground">
                {t.closeWarning(AAC_MIN_SECONDS).bold}
              </span>
              {t.closeWarning(AAC_MIN_SECONDS).after}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded-2xl py-3 text-sm font-semibold text-foreground glass transition-all hover:bg-foreground/5 active:scale-[0.99]"
              >
                {t.continue}
              </button>
              <button
                type="button"
                onClick={handleLeave}
                className="rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99]"
                style={{ background: `hsl(${CORAL})` }}
              >
                {t.closeConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send-off — a gentle motivation as we ease back to Aktiviti Harian */}
      {leaving && (
        <div
          className="absolute inset-0 z-40 flex animate-fade-up flex-col items-center justify-center bg-background/95 px-8 text-center backdrop-blur-sm"
          style={{ animationFillMode: "both" }}
        >
          <p
            className="max-w-xs text-lg font-semibold leading-relaxed text-balance"
            style={{ color: `hsl(${PURPLE_TEXT})` }}
          >
            {motivation}
          </p>
        </div>
      )}
    </>
  )
}
