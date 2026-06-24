import { useState } from "react"
import { cn } from "@/lib/utils"
import { activitiesDoneDaysAgo, DAILY_TARGET_ACTIVITIES } from "@/lib/progress"
import { Check } from "lucide-react"

/* ========================================================================== *
 *  ProgressCalendar — current-month daily-completion calendar.
 *
 *  Shared by the Aktiviti Harian "Kemajuan {bulan}" view and the Analisis
 *  consistency view so both look and behave identically. Each day reflects the
 *  real completion count from the shared progress source, and tapping a day
 *  opens an inline info panel (date · activities done · minutes · a tip).
 * ========================================================================== */

const CORAL = "12 100% 64%"
const TEAL = "172 66% 50%"

const MIN_PER_ACTIVITY = 5 // dose model: 3 activities × 5 min = 15 min

/** Malay month names — used by the calendar header & day-detail label. */
const MS_MONTHS = [
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
]

type DayStatus = "full" | "partial" | "missed" | "today" | "future"

const STATUS_PILL: Record<DayStatus, { label: string; hue: string }> = {
  full: { label: "Selesai", hue: TEAL },
  partial: { label: "Separa", hue: TEAL },
  missed: { label: "Terlepas", hue: CORAL },
  today: { label: "Hari ini", hue: CORAL },
  future: { label: "Akan datang", hue: "0 0% 70%" },
}

export default function ProgressCalendar({
  todayCompleted,
}: {
  /** Live count of activities completed today; overrides the placeholder so
   *  today's cell colour updates as the parent completes activities. */
  todayCompleted?: number
}) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthName = MS_MONTHS[month]
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const currentDay = now.getDate()

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
        : activitiesDoneDaysAgo(currentDay - day)

    let status: DayStatus
    if (isFuture) status = "future"
    else if (isToday) status = "today"
    else if (doneCount >= DAILY_TARGET_ACTIVITIES) status = "full"
    else if (doneCount > 0) status = "partial"
    else status = "missed"

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
        countLine = `${doneCount} / ${DAILY_TARGET_ACTIVITIES} aktiviti selesai · ~${minutes} minit`
        note = "Hebat! Dos harian penuh dicapai. 🎉"
        break
      case "partial":
        countLine = `${doneCount} / ${DAILY_TARGET_ACTIVITIES} aktiviti selesai · ~${minutes} minit`
        note = `${remaining} lagi aktiviti untuk capai sasaran harian.`
        break
      case "missed":
        countLine = `0 / ${DAILY_TARGET_ACTIVITIES} aktiviti selesai`
        note = "Hari terlepas — konsistensi harian penting untuk perkembangan anak."
        break
      case "today":
        countLine = `${doneCount} / ${DAILY_TARGET_ACTIVITIES} aktiviti selesai setakat ini · ~${minutes} minit`
        note =
          remaining > 0
            ? `${remaining} lagi untuk lengkapkan dos hari ini.`
            : "Dos hari ini selesai. Syabas!"
        break
      default:
        countLine = "Belum bermula"
        note = "Hari akan datang — bersedia untuk aktiviti seterusnya."
    }
    return { status, dateLabel, countLine, note }
  }

  return (
    <section className="rounded-3xl glass-strong p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Kemajuan {monthName}
        </h2>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
        >
          Hari {currentDay} / {daysInMonth}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Ketik hari untuk lihat butiran aktiviti yang selesai.
      </p>

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
                (status === "missed" || status === "future") &&
                  "bg-white/[0.04] text-muted-foreground",
                selected && "ring-2 ring-white/70",
                "hover:brightness-110"
              )}
              style={style}
              aria-label={`Hari ${day}: ${doneCount}/${DAILY_TARGET_ACTIVITIES} aktiviti`}
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
        <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{detail.dateLabel}</span>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: `hsl(${STATUS_PILL[detail.status].hue} / 0.18)`,
                color: `hsl(${STATUS_PILL[detail.status].hue})`,
              }}
            >
              {STATUS_PILL[detail.status].label}
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
        <LegendSwatch label="Selesai" style={{ background: `hsl(${TEAL})` }} />
        <LegendSwatch
          label="Separa"
          style={{ background: `hsl(${TEAL} / 0.22)` }}
        />
        <LegendSwatch
          label="Terlepas"
          style={{
            background: "hsl(0 0% 100% / 0.04)",
            boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.35)`,
          }}
        />
        <LegendSwatch
          label="Hari ini"
          style={{
            background: `hsl(${CORAL} / 0.18)`,
            boxShadow: `inset 0 0 0 1.5px hsl(${CORAL})`,
          }}
        />
      </div>
    </section>
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
