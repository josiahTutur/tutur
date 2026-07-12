/* ========================================================================== *
 *  Day player — the walking skeleton of the 14-day loop.
 *
 *  Wires the screens that exist today:
 *      C1  Today Card  →  C2–C4  Activity  →  [stub]
 *
 *  NOT BUILT YET (deliberately — see docs/PILOT_EXECUTION_PLAN.md):
 *    · C5–C14  observation tracker      (Phase 6)
 *    · C15–C17 reflection               (Phase 6)
 *    · C18     celebration              (Phase 6)
 *    · persistence — nothing is saved   (Phase 2)
 *    · event logging — onEvent is a console sink (Phase 2)
 *
 *  The end screen states this plainly rather than faking a completion, so a
 *  click-through can't be mistaken for a working loop.
 * ========================================================================== */

import { useState } from "react"
import { CheckCircle2, Star } from "lucide-react"

import { ActivityPlayer, type ActivityEvent } from "@/components/day/ActivityPlayer"
import { MayaBubble, TodayCard, type LearnMode } from "@/components/day/TodayCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLang } from "@/lib/i18n"
import { type DayConfig, type Interest } from "@/lib/dayConfig"
import { type Vars } from "@/lib/interpolate"

type Screen = "card" | "activity" | "stub"

const STR = {
  ms: {
    done: (n: number) => `Aktiviti Hari ${n} selesai`,
    maya: "Aktiviti dah habis — tapi tracker (10 soalan pemerhatian) belum dibina lagi.",
    notBuilt: "Belum dibina — Fasa 6",
    notBuiltItems: [
      "· C5–C14 — 10 skrin pemerhatian (KP + JA)",
      "· C15–C17 — refleksi ibu bapa",
      "· C18 — raikan + peringatan esok",
    ],
    nothingSaved: "Tiada apa-apa disimpan. Tiada pangkalan data lagi (Fasa 2).",
    eventsTitle: (n: number) => `Events yang akan direkod (${n})`,
    fidelity: "Fidelity — tunggu vs sepatutnya",
    fidelityBody: "Jurang antara masa diminta dan masa sebenar = metrik fidelity (spec §6.2).",
    requested: "diminta",
    actual: "sebenar",
    mode: "Mod",
    back: "Kembali",
  },
  en: {
    done: (n: number) => `Day ${n} activity complete`,
    maya: "The activity is done — but the tracker (10 observation questions) isn't built yet.",
    notBuilt: "Not built yet — Phase 6",
    notBuiltItems: [
      "· C5–C14 — 10 observation screens (KP + JA)",
      "· C15–C17 — parent reflection",
      "· C18 — celebration + tomorrow's reminder",
    ],
    nothingSaved: "Nothing is saved. There is no database yet (Phase 2).",
    eventsTitle: (n: number) => `Events that would be recorded (${n})`,
    fidelity: "Fidelity — waited vs requested",
    fidelityBody: "The gap between requested and actual wait time = the fidelity metric (spec §6.2).",
    requested: "requested",
    actual: "actual",
    mode: "Mode",
    back: "Back",
  },
}

type Copy = (typeof STR)["ms"]

/**
 * No media has been produced for D1–D14 yet (public/ holds only AAC assets), so
 * the audio_id / video_id / storyboard_id in the day configs point at nothing.
 * Flip this to `true` the day real assets land — the mode switcher unlocks
 * gambar + video on its own.
 */
const ASSETS_READY = false

export function DayPlayer({
  day,
  vars,
  interest,
  onExit,
}: {
  day: DayConfig
  vars: Vars
  /** The toy chosen on Day 1. Undefined on Day 1 itself (it's recorded there). */
  interest?: Interest
  onExit: () => void
}) {
  const [screen, setScreen] = useState<Screen>("card")
  const [mode, setMode] = useState<LearnMode>("skrip")
  const [events, setEvents] = useState<ActivityEvent[]>([])

  function handleEvent(e: ActivityEvent) {
    // Phase 2 replaces this with logEvent() → the event_log table (spec §6.1).
    // Collected here so the skeleton can SHOW what would have been recorded.
    setEvents((prev) => [...prev, e])
    // eslint-disable-next-line no-console
    console.debug("[event]", e.name, e.props ?? {})
  }

  if (screen === "card") {
    return (
      <TodayCard
        day={day}
        vars={vars}
        assetsReady={ASSETS_READY}
        onStart={(m) => {
          setMode(m)
          setScreen("activity")
        }}
      />
    )
  }

  if (screen === "activity") {
    return (
      <ActivityPlayer
        day={day}
        vars={vars}
        interest={interest}
        onEvent={handleEvent}
        onQuit={() => setScreen("card")}
        onDone={() => setScreen("stub")}
      />
    )
  }

  return <NotBuiltYet day={day} mode={mode} events={events} onExit={onExit} />
}

/* -------------------------------------------------------------------------- */

/**
 * Honest terminal screen. The activity is over, but the tracker — which is the
 * pilot's PRIMARY instrument — does not exist. Say so, and show the events the
 * activity would have logged, so the skeleton proves the data is there.
 */
function NotBuiltYet({
  day,
  mode,
  events,
  onExit,
}: {
  day: DayConfig
  mode: LearnMode
  events: ActivityEvent[]
  onExit: () => void
}) {
  const { lang } = useLang()
  const t: Copy = STR[lang]
  const timers = events.filter((e) => e.name === "timer_completed")

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
      <div className="flex items-center gap-2 text-primary">
        <CheckCircle2 className="size-5" />
        <h1 className="font-display text-xl font-bold">{t.done(day.day_number)}</h1>
      </div>

      <MayaBubble>{t.maya}</MayaBubble>

      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <p className="font-display text-sm font-semibold text-foreground">
          {t.notBuilt}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {t.notBuiltItems.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t.nothingSaved}</p>
      </Card>

      {/* Prove the instrumentation works — these are the events Phase 2 will persist. */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.eventsTitle(events.length)}
        </p>
        <Card className="divide-y divide-border">
          {events.map((e, n) => (
            <div key={n} className="flex items-baseline gap-2 px-3 py-2 text-xs">
              <span className="font-mono font-semibold text-primary">{e.name}</span>
              <span className="truncate font-mono text-muted-foreground">
                {e.props ? JSON.stringify(e.props) : ""}
              </span>
            </div>
          ))}
        </Card>
      </section>

      {timers.length > 0 && (
        <Card className="p-4">
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
            <Star className="size-4 text-primary" />
            {t.fidelity}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.fidelityBody}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-foreground">
            {timers.map((ev, n) => (
              <li key={n}>
                {t.requested} {String(ev.props?.requested_s)}s · {t.actual} {String(ev.props?.actual_s)}s
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {t.mode}: <span className="font-semibold">{mode}</span>
      </p>

      <Button variant="outline" className="w-full" onClick={onExit}>
        {t.back}
      </Button>
    </div>
  )
}
