import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  activitiesDoneDaysAgo,
  DAILY_TARGET_ACTIVITIES,
  formatDuration,
} from "@/lib/progress"
import { loginDaysThisMonth } from "@/lib/db"
import { Check, ChevronDown } from "lucide-react"
import { useLang } from "@/lib/i18n"

const STR = {
  ms: {
    months: [
      "Januari",
      "Februari",
      "Mac",
      "April",
      "Mei",
      "Jun",
      "Julai",
      "Ogos",
      "September",
      "Oktober",
      "November",
      "Disember",
    ],
    pillFull: "Selesai",
    pillPartial: "Separa",
    pillMissed: "Terlepas",
    pillToday: "Hari ini",
    pillFuture: "Akan datang",
    pillNone: "Tiada",
    progressHeading: (monthName: string) => `Kemajuan ${monthName}`,
    dayCounter: (activeDays: number) => `${activeDays} hari aktif`,
    activeDaysLabel: "Hari Aktif",
    doneLabel: "Selesai",
    timeLabel: "Masa",
    dateFmt: (day: number, month: string, year: number) =>
      `${day} ${month} ${year}`,
    tapHint: "Ketik hari untuk lihat butiran aktiviti yang selesai.",
    dayAria: (day: number, doneCount: number, target: number) =>
      `Hari ${day}: ${doneCount}/${target} aktiviti`,
    countLineDone: (doneCount: number, target: number, minutes: number) =>
      `${doneCount} / ${target} aktiviti selesai · ~${minutes} minit`,
    noteFull: "Hebat! Dos harian penuh dicapai. 🎉",
    notePartial: (remaining: number) =>
      `${remaining} lagi aktiviti untuk capai sasaran harian.`,
    countLineMissed: (target: number) => `0 / ${target} aktiviti selesai`,
    noteMissed:
      "Hari terlepas — konsistensi harian penting untuk perkembangan anak.",
    countLineNone: "Tiada aktiviti direkodkan",
    noteNone: "Belum ada rekod untuk hari ini.",
    countLineToday: (realCount: number, timeStr: string) =>
      `${realCount} aktiviti selesai · ${timeStr} bersama anak`,
    noteTodayDone: "Syabas! Setiap saat bersama anak amat bermakna.",
    noteTodayNone: "Belum ada aktiviti selesai hari ini — jom mula!",
    countLineFuture: "Belum bermula",
    noteFuture: "Hari akan datang — bersedia untuk aktiviti seterusnya.",
    todayMinutesFallback: (minutes: number) => `~${minutes} minit`,
  },
  en: {
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    pillFull: "Done",
    pillPartial: "Partial",
    pillMissed: "Missed",
    pillToday: "Today",
    pillFuture: "Upcoming",
    pillNone: "None",
    progressHeading: (monthName: string) => `${monthName} Progress`,
    dayCounter: (activeDays: number) =>
      `${activeDays} active day${activeDays === 1 ? "" : "s"}`,
    activeDaysLabel: "Active Days",
    doneLabel: "Done",
    timeLabel: "Time",
    dateFmt: (day: number, month: string, year: number) =>
      `${month} ${day}, ${year}`,
    tapHint: "Tap a day to see the details of completed activities.",
    dayAria: (day: number, doneCount: number, target: number) =>
      `Day ${day}: ${doneCount}/${target} activities`,
    countLineDone: (doneCount: number, target: number, minutes: number) =>
      `${doneCount} / ${target} activities done · ~${minutes} min`,
    noteFull: "Great! Full daily dose achieved. 🎉",
    notePartial: (remaining: number) =>
      `${remaining} more activities to reach the daily target.`,
    countLineMissed: (target: number) => `0 / ${target} activities done`,
    noteMissed:
      "Day missed — daily consistency is important for your child's development.",
    countLineNone: "No activities recorded",
    noteNone: "No records for today yet.",
    countLineToday: (realCount: number, timeStr: string) =>
      `${realCount} activities done · ${timeStr} with your child`,
    noteTodayDone: "Well done! Every moment with your child truly matters.",
    noteTodayNone: "No activities completed today yet — let's start!",
    countLineFuture: "Not started yet",
    noteFuture: "Upcoming day — get ready for the next activities.",
    todayMinutesFallback: (minutes: number) => `~${minutes} min`,
  },
} as const

/* ========================================================================== *
 *  ProgressCalendar — current-month daily-completion calendar.
 *
 *  Shared by the Aktiviti Harian "Kemajuan {bulan}" view and the Analisis
 *  consistency view so both look and behave identically. Each day reflects the
 *  real completion count from the shared progress source, and tapping a day
 *  opens an inline info panel (date · activities done · minutes · a tip).
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"

const MIN_PER_ACTIVITY = 5 // dose model: 3 activities × 5 min = 15 min

type DayStatus = "full" | "partial" | "missed" | "today" | "future" | "none"

const STATUS_HUE: Record<DayStatus, string> = {
  full: TEAL,
  partial: TEAL,
  missed: CORAL,
  today: CORAL,
  future: "0 0% 70%",
  none: "0 0% 70%",
}

export default function ProgressCalendar({
  todayCompleted,
  todaySeconds,
  samplePast = true,
  collapsible = false,
}: {
  /** Live count of activities completed today; overrides the placeholder so
   *  today's cell colour updates as the parent completes activities. */
  todayCompleted?: number
  /** Live total seconds spent on today's activities (accumulated). */
  todaySeconds?: number
  /** When false, past days carry no placeholder data — they show neutral
   *  ("Tiada"), never "Terlepas"/"Separa". Used by Aktiviti Harian so the
   *  calendar reflects only what the parent has really done. */
  samplePast?: boolean
  /** Show a compact summary row that expands to the full calendar on tap. */
  collapsible?: boolean
}) {
  const { lang } = useLang()
  const s = STR[lang]

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = s.months[month]
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const currentDay = now.getDate()

  // Per-user login-day count (fetched from the backend), floored at 1.
  const [activeDays, setActiveDays] = useState(1)
  useEffect(() => {
    loginDaysThisMonth().then(setActiveDays)
  }, [])

  // Collapsible: start collapsed; always expanded when not collapsible.
  const [expanded, setExpanded] = useState(!collapsible)

  const pillLabel: Record<DayStatus, string> = {
    full: s.pillFull,
    partial: s.pillPartial,
    missed: s.pillMissed,
    today: s.pillToday,
    future: s.pillFuture,
    none: s.pillNone,
  }

  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  function infoFor(day: number) {
    const isToday = day === currentDay
    const isFuture = day > currentDay
    const doneCount = isFuture
      ? 0
      : isToday
        ? Math.min(
            todayCompleted ?? activitiesDoneDaysAgo(0),
            DAILY_TARGET_ACTIVITIES
          )
        : samplePast
          ? activitiesDoneDaysAgo(currentDay - day)
          : 0

    let status: DayStatus
    if (isFuture) status = "future"
    else if (isToday) status = "today"
    else if (doneCount >= DAILY_TARGET_ACTIVITIES) status = "full"
    else if (doneCount > 0) status = "partial"
    // No real history yet → neutral, not a discouraging "Terlepas".
    else status = samplePast ? "missed" : "none"

    return { status, doneCount }
  }

  const detail =
    selectedDay != null ? buildDetail(selectedDay) : null

  function buildDetail(day: number) {
    const { status, doneCount } = infoFor(day)
    const dateLabel = `${day} ${monthName} ${year}`
    const minutes = doneCount * MIN_PER_ACTIVITY
    const remaining = DAILY_TARGET_ACTIVITIES - doneCount

    let countLine: string
    let note: string
    switch (status) {
      case "full":
        countLine = s.countLineDone(doneCount, DAILY_TARGET_ACTIVITIES, minutes)
        note = s.noteFull
        break
      case "partial":
        countLine = s.countLineDone(doneCount, DAILY_TARGET_ACTIVITIES, minutes)
        note = s.notePartial(remaining)
        break
      case "missed":
        countLine = s.countLineMissed(DAILY_TARGET_ACTIVITIES)
        note = s.noteMissed
        break
      case "none":
        countLine = s.countLineNone
        note = s.noteNone
        break
      case "today": {
        // Real completed count + accumulated time when available.
        const realCount = todayCompleted ?? doneCount
        const timeStr =
          todaySeconds != null
            ? formatDuration(todaySeconds)
            : s.todayMinutesFallback(minutes)
        countLine = s.countLineToday(realCount, timeStr)
        note = realCount > 0 ? s.noteTodayDone : s.noteTodayNone
        break
      }
      default:
        countLine = s.countLineFuture
        note = s.noteFuture
    }
    return { status, dateLabel, countLine, note }
  }

  return (
    <section className="rounded-3xl glass-strong p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                {s.progressHeading(monthName)}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {s.dateFmt(currentDay, monthName, year)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SummaryChip
              value={`${activeDays}`}
              label={s.activeDaysLabel}
              hue={CORAL}
            />
            <SummaryChip
              value={`${todayCompleted ?? 0}`}
              label={s.doneLabel}
              hue={TEAL}
            />
            <SummaryChip
              value={formatDuration(todaySeconds ?? 0)}
              label={s.timeLabel}
              hue={TEAL}
            />
          </div>
        </button>
      ) : (
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            {s.progressHeading(monthName)}
          </h2>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
          >
            {s.dayCounter(activeDays)}
          </span>
        </div>
      )}

      {expanded && (
        <div className={collapsible ? "mt-4" : ""}>
          <p className="mb-4 text-xs text-muted-foreground">{s.tapHint}</p>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const { status, doneCount } = infoFor(day)
          const selected = selectedDay === day
          const isToday = status === "today"
          // Today's fill follows its live completion count, like any other day.
          const isFull =
            status === "full" ||
            (isToday && doneCount >= DAILY_TARGET_ACTIVITIES)
          const isPartial =
            status === "partial" ||
            (isToday && doneCount > 0 && doneCount < DAILY_TARGET_ACTIVITIES)

          const style: React.CSSProperties = {}
          if (isFull) {
            style.background = `hsl(${TEAL})`
          } else if (isPartial) {
            style.background = `hsl(${TEAL} / 0.22)`
            style.color = `hsl(${TEAL})`
          } else if (status === "missed") {
            style.boxShadow = `inset 0 0 0 1px hsl(${CORAL} / 0.35)`
          } else if (isToday) {
            style.background = `hsl(${CORAL} / 0.18)`
          }
          // Today always keeps a coral ring, layered over its completion fill.
          if (isToday) {
            const ring = `inset 0 0 0 1.5px hsl(${CORAL})`
            style.boxShadow = style.boxShadow ? `${ring}, ${style.boxShadow}` : ring
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(selected ? null : day)}
              aria-pressed={selected}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition-all",
                isFull && "text-background",
                isToday && !isFull && !isPartial && "text-foreground",
                (status === "missed" ||
                  status === "future" ||
                  status === "none") &&
                  "bg-foreground/[0.08] text-muted-foreground",
                selected && "ring-2 ring-foreground/20",
                "hover:brightness-110"
              )}
              style={style}
              aria-label={s.dayAria(day, doneCount, DAILY_TARGET_ACTIVITIES)}
            >
              {isFull ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                day
              )}
            </button>
          )
        })}
      </div>

      {/* Inline day-detail panel */}
      {detail && (
        <div className="mt-4 rounded-2xl bg-foreground/[0.08] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{detail.dateLabel}</span>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: `hsl(${STATUS_HUE[detail.status]} / 0.18)`,
                color: `hsl(${STATUS_HUE[detail.status]})`,
              }}
            >
              {pillLabel[detail.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.countLine}
          </p>
          <p className="mt-2 text-xs text-foreground/80">{detail.note}</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
        <LegendSwatch label={s.pillFull} style={{ background: `hsl(${TEAL})` }} />
        <LegendSwatch
          label={s.pillPartial}
          style={{ background: `hsl(${TEAL} / 0.22)` }}
        />
        {samplePast && (
          <LegendSwatch
            label={s.pillMissed}
            style={{
              background: "hsl(252 30% 94%)",
              boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.35)`,
            }}
          />
        )}
        <LegendSwatch
          label={s.pillToday}
          style={{
            background: `hsl(${CORAL} / 0.18)`,
            boxShadow: `inset 0 0 0 1.5px hsl(${CORAL})`,
          }}
        />
      </div>
        </div>
      )}
    </section>
  )
}

/** A compact summary stat shown in the collapsed progress row. */
function SummaryChip({
  value,
  label,
  hue,
}: {
  value: string
  label: string
  hue: string
}) {
  return (
    <div className="rounded-xl bg-foreground/[0.05] px-2 py-1.5 text-center">
      <p
        className="text-sm font-bold tabular-nums"
        style={{ color: `hsl(${hue})` }}
      >
        {value}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function LegendSwatch({
  label,
  style,
}: {
  label: string
  style: React.CSSProperties
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded" style={style} />
      {label}
    </span>
  )
}
