/* ========================================================================== *
 *  "Aktiviti Hari Ini" — the entry point to the 14-day programme.
 *
 *  Sits on Aktiviti Harian, between the month calendar and the activity picker.
 *  Tapping it opens the day player (C1 → C2–C4) for the current content day.
 *
 *  This is the card that will EVENTUALLY replace the activity picker below it
 *  entirely. For the pilot both coexist, so the old flow stays testable.
 *
 *  It uses the same `glass-strong` container as the month calendar above it, so
 *  the two read as one column rather than a bordered card sitting on a page.
 * ========================================================================== */

import { ArrowRight, Clock, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TOTAL_DAYS } from "@/content/days"
import { type AnyDayConfig } from "@/lib/dayConfig"
import { interpolate, type Vars } from "@/lib/interpolate"
import { useLang } from "@/lib/i18n"

const STR = {
  ms: {
    eyebrow: "Fasa Asas",
    day: (n: number) => `Hari ${n}/${TOTAL_DAYS}`,
    minutes: "Kira-kira 15 minit · dalam rutin biasa",
    cta: "Mula aktiviti",
    locked: "Kandungan hari ini belum tersedia",
    lockedBody: "Hari 2–14 sedang disiapkan.",
  },
  en: {
    eyebrow: "Foundation Phase",
    day: (n: number) => `Day ${n}/${TOTAL_DAYS}`,
    minutes: "About 15 minutes · inside your normal routine",
    cta: "Start activity",
    locked: "Today's content isn't ready yet",
    lockedBody: "Days 2–14 are being prepared.",
  },
}

export function TodaysActivityCard({
  day,
  vars,
  onOpen,
}: {
  /** The content day the parent is on. Undefined = not authored yet. */
  day: AnyDayConfig | undefined
  vars: Vars
  onOpen: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const say = (t: string) => interpolate(t, vars)

  if (!day) {
    return (
      <Card className="flex items-center gap-3 border-dashed p-5">
        <Lock className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">{s.locked}</p>
          <p className="text-xs text-muted-foreground">{s.lockedBody}</p>
        </div>
      </Card>
    )
  }

  return (
    // Same container as the "Kemajuan" calendar directly above — glass + shadow,
    // no hard border line.
    <section className="rounded-3xl glass-strong p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-[11px] font-bold uppercase tracking-widest text-primary">
          {s.eyebrow}
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[11px] font-bold text-primary">
          {s.day(day.day_number)}
        </span>
      </div>

      {/* The routine is the small label; what the day is FOR is the headline.
          These are two config fields, not a string split on an em dash. */}
      <p className="mt-4 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {say(day.title)}
      </p>
      {day.kind === "activity" && (
        <h2 className="mt-1 font-display text-xl font-bold leading-tight text-foreground">
          {say(day.subtitle)}
        </h2>
      )}

      {/* The ONE thing the parent works on today (G1, the leading indicator). */}
      {day.kind === "activity" && (
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          {say(day.focus_line)}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        <span>{s.minutes}</span>
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={onOpen}>
        {s.cta}
        <ArrowRight className="size-4" />
      </Button>
    </section>
  )
}
