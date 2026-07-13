/* ========================================================================== *
 *  ProgressCalendar — "Kemajuan {bulan}". The family's real month.
 *
 *  Shared by Aktiviti Harian and Analisis so the two can never disagree.
 *
 *  ── IT COUNTS TIME, NOT ACTIVITIES ────────────────────────────────────────
 *  The old calendar drew a dose: 3 activities × 5 minutes, with days coloured
 *  "full" / "partial" / "missed" against that target. Preverb has ONE activity
 *  per day, which the parent may repeat — so "2 of 3" is not a state that can
 *  exist, and a count would only ever print 1.
 *
 *  So a day is simply DONE or not, and the number that grows is the clock: how
 *  long this parent spent with this child. That is the thing worth showing her.
 *
 *  ── AND IT NEVER INVENTS A PAST ───────────────────────────────────────────
 *  It also used to fill past days from a hand-written array — a fabricated
 *  history, rendered as if it were hers, including days marked "Terlepas" that
 *  she never missed because the app did not exist yet. Every cell below now
 *  comes from preverb_activity_run. A day with no row is blank, not a failure.
 * ========================================================================== */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatDuration, formatDurationShort, monthTotals } from "@/lib/progress"
import { isoDate, type PreverbProgress } from "@/lib/preverbDb"
import { Check, ChevronDown } from "lucide-react"
import { useLang } from "@/lib/i18n"

const STR = {
  ms: {
    months: [
      "Januari", "Februari", "Mac", "April", "Mei", "Jun",
      "Julai", "Ogos", "September", "Oktober", "November", "Disember",
    ],
    pillDone: "Selesai",
    pillStarted: "Belum selesai",
    pillToday: "Hari ini",
    pillFuture: "Akan datang",
    pillNone: "Tiada",
    progressHeading: (monthName: string) => `Kemajuan ${monthName}`,
    dayCounter: (activeDays: number) => `${activeDays} hari aktif`,
    activeDaysLabel: "Hari Aktif",
    monthTimeLabel: "Jumlah Masa",
    todayTimeLabel: "Hari Ini",
    dateFmt: (day: number, month: string, year: number) => `${day} ${month} ${year}`,
    tapHint: "Ketik hari untuk lihat masa yang anda luangkan bersama anak.",
    dayAria: (day: number, timeStr: string) => `Day ${day}: ${timeStr}`,
    lineDone: (timeStr: string, dayNo: string) =>
      `${timeStr} bersama anak · Hari ${dayNo}`,
    noteDone: "Syabas! Setiap saat bersama anak amat bermakna.",
    lineStarted: (timeStr: string) => `${timeStr} bersama anak · aktiviti belum tamat`,
    noteStarted: "Anda dah mula — masa itu tetap dikira. Sambung bila-bila masa.",
    lineToday: "Belum ada masa direkodkan hari ini",
    noteToday: "Belum mula hari ini — jom luangkan 15 minit bersama anak.",
    lineNone: "Tiada aktiviti direkodkan",
    noteNone: "Hari ini terlepas. Tak apa — rutin sibuk memang normal.",
    lineFuture: "Belum bermula",
    noteFuture: "Hari akan datang — bersedia untuk aktiviti seterusnya.",
  },
  en: {
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    pillDone: "Done",
    pillStarted: "Unfinished",
    pillToday: "Today",
    pillFuture: "Upcoming",
    pillNone: "None",
    progressHeading: (monthName: string) => `${monthName} Progress`,
    dayCounter: (activeDays: number) =>
      `${activeDays} active day${activeDays === 1 ? "" : "s"}`,
    activeDaysLabel: "Active Days",
    monthTimeLabel: "Total Time",
    todayTimeLabel: "Today",
    dateFmt: (day: number, month: string, year: number) => `${month} ${day}, ${year}`,
    tapHint: "Tap a day to see the time you spent with your child.",
    dayAria: (day: number, timeStr: string) => `Day ${day}: ${timeStr}`,
    lineDone: (timeStr: string, dayNo: string) =>
      `${timeStr} with your child · Day ${dayNo}`,
    noteDone: "Well done! Every moment with your child truly matters.",
    lineStarted: (timeStr: string) => `${timeStr} with your child · activity not finished`,
    noteStarted: "You made a start — that time still counts. Pick it up any time.",
    lineToday: "No time recorded today yet",
    noteToday: "Not started today — let's spend 15 minutes with your child.",
    lineNone: "No activity recorded",
    noteNone: "This day was missed. That's okay — busy weeks are normal.",
    lineFuture: "Not started yet",
    noteFuture: "Upcoming day — get ready for the next activity.",
  },
} as const

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"

type DayStatus = "done" | "started" | "today" | "future" | "none"

const STATUS_HUE: Record<DayStatus, string> = {
  done: TEAL,
  started: TEAL,
  today: CORAL,
  future: "0 0% 70%",
  none: "0 0% 70%",
}

export default function ProgressCalendar({
  progress,
  collapsible = false,
}: {
  /** The family's real history, keyed by date. From preverb_activity_run. */
  progress: PreverbProgress
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

  const [expanded, setExpanded] = useState(!collapsible)
  // Opens on TODAY, not on nothing. The parent came here to see where she stands
  // right now; making her hunt for the current date first is a step she should
  // never have had to take. Tapping today again closes the panel.
  const [selectedDay, setSelectedDay] = useState<number | null>(currentDay)

  const totals = monthTotals(progress, year, month)
  const todaySeconds = progress[isoDate(now)]?.seconds ?? 0

  const pillLabel: Record<DayStatus, string> = {
    done: s.pillDone,
    started: s.pillStarted,
    today: s.pillToday,
    future: s.pillFuture,
    none: s.pillNone,
  }

  function infoFor(day: number) {
    const entry = progress[`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`]
    const seconds = entry?.seconds ?? 0

    let status: DayStatus
    if (entry?.completed) status = "done"
    else if (seconds > 0) status = "started"
    else if (day === currentDay) status = "today"
    else if (day > currentDay) status = "future"
    else status = "none"

    return { status, seconds, dayNumbers: entry?.dayNumbers ?? [] }
  }

  function buildDetail(day: number) {
    const { status, seconds, dayNumbers } = infoFor(day)
    const dateLabel = s.dateFmt(day, monthName, year)
    const timeStr = formatDuration(seconds, lang)
    const dayNo = dayNumbers.join(", ")

    let countLine: string
    let note: string
    switch (status) {
      case "done":
        countLine = s.lineDone(timeStr, dayNo)
        note = s.noteDone
        break
      case "started":
        countLine = s.lineStarted(timeStr)
        note = s.noteStarted
        break
      case "today":
        countLine = s.lineToday
        note = s.noteToday
        break
      case "none":
        countLine = s.lineNone
        note = s.noteNone
        break
      default:
        countLine = s.lineFuture
        note = s.noteFuture
    }
    return { status, dateLabel, countLine, note }
  }

  const detail = selectedDay != null ? buildDetail(selectedDay) : null

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
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-500",
                expanded && "rotate-180"
              )}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SummaryChip value={`${totals.activeDays}`} label={s.activeDaysLabel} hue={CORAL} />
            {/* The headline. Cumulative, month-to-date, and it only ever grows. */}
            <SummaryChip
              value={formatDurationShort(totals.seconds, lang)}
              label={s.monthTimeLabel}
              hue={TEAL}
            />
            <SummaryChip
              value={formatDurationShort(todaySeconds, lang)}
              label={s.todayTimeLabel}
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
            {s.dayCounter(totals.activeDays)}
          </span>
        </div>
      )}

      {/*
        Height animation without knowing the height. Closed is `grid-rows-[0fr]`,
        open is `grid-rows-[1fr]` — the row itself is the animated value, so it
        resolves to the calendar's natural height without measuring it. (`h-0 →
        h-auto` cannot transition, and a `max-h` cap would make a 31-day month
        animate at a different speed from a 28-day one.)

        The grid stays MOUNTED so it has something to collapse FROM; `{expanded &&
        …}` would just yank it out. `inert` keeps the hidden day buttons out of
        the tab order.
      */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
        <div
          className={cn(
            "transition-opacity duration-500",
            collapsible && "pt-4",
            expanded ? "opacity-100" : "opacity-0"
          )}
          inert={!expanded}
        >
          <p className="mb-4 text-xs text-muted-foreground">{s.tapHint}</p>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const { status, seconds } = infoFor(day)
              const selected = selectedDay === day
              const isToday = day === currentDay

              const style: React.CSSProperties = {}
              if (status === "done") {
                style.background = `hsl(${TEAL})`
              } else if (status === "started") {
                style.background = `hsl(${TEAL} / 0.22)`
                style.color = `hsl(${TEAL})`
              } else if (isToday) {
                style.background = `hsl(${CORAL} / 0.18)`
              }
              // Today always keeps a coral ring, layered over whatever fill it has.
              if (isToday) {
                style.boxShadow = `inset 0 0 0 1.5px hsl(${CORAL})`
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(selected ? null : day)}
                  aria-pressed={selected}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition-all",
                    status === "done" && "text-background",
                    isToday && status !== "done" && status !== "started" && "text-foreground",
                    (status === "future" || status === "none") &&
                      !isToday &&
                      "bg-foreground/[0.08] text-muted-foreground",
                    selected && "ring-2 ring-foreground/20",
                    "hover:brightness-110"
                  )}
                  style={style}
                  aria-label={s.dayAria(day, formatDuration(seconds, "en"))}
                >
                  {status === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : day}
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
              <p className="mt-1 text-xs text-muted-foreground">{detail.countLine}</p>
              <p className="mt-2 text-xs text-foreground/80">{detail.note}</p>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
            <LegendSwatch label={s.pillDone} style={{ background: `hsl(${TEAL})` }} />
            <LegendSwatch
              label={s.pillStarted}
              style={{ background: `hsl(${TEAL} / 0.22)` }}
            />
            <LegendSwatch
              label={s.pillToday}
              style={{
                background: `hsl(${CORAL} / 0.18)`,
                boxShadow: `inset 0 0 0 1.5px hsl(${CORAL})`,
              }}
            />
          </div>
        </div>
        </div>
      </div>
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
      <p className="text-sm font-bold tabular-nums" style={{ color: `hsl(${hue})` }}>
        {value}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function LegendSwatch({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded" style={style} />
      {label}
    </span>
  )
}
