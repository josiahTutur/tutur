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

import { ActivityPlayer, type ActivityEvent } from "@/components/preverb/ActivityPlayer"
import { TodayCard } from "@/components/preverb/TodayCard"
import { Reflection } from "@/components/preverb/Reflection"
import { Tracker } from "@/components/preverb/Tracker"
import { type DayConfig, type Interest, type ObservationQuestion } from "@/lib/preverbConfig"
import { type Vars } from "@/lib/interpolate"
import { type Reflection as ReflectionData, type TrackerAnswer } from "@/lib/preverbDb"
import { useEngagedSeconds } from "@/lib/useEngagedSeconds"

type Screen = "card" | "activity" | "tracker" | "reflection"

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
  onActivityDone,
  onInterestRecorded,
  trackerAnswers,
  onTrackerAnswer,
  onReflection,
  onActivityStart,
  onHeartbeat,
  onEnd,
  onExit,
}: {
  day: DayConfig
  vars: Vars
  /** The toy chosen on Day 1. Undefined on Day 1 itself (it's recorded there). */
  interest?: Interest
  /**
   * C2–C4 finished. Marks the day session complete.
   *
   * ⚠ This is "activity done", NOT "daily loop done". The tracker (C5–C14) and
   * reflection (C15–C17) don't exist yet. When they land, completion must move to
   * the END of the tracker — a parent who runs the script but abandons the tracker
   * is exactly the drop-off the pilot needs to see, and calling it complete here
   * would hide it.
   */
  onActivityDone?: () => void
  /** Day 1 only — the toy the child chose. Contextualises D2–D14. */
  onInterestRecorded?: (i: Interest) => void
  /** Answers already on record for this day — the tracker resumes at the first gap. */
  trackerAnswers?: Record<string, TrackerAnswer>
  /** Fired on EVERY tracker answer, not at the end. Spec §5.8. */
  onTrackerAnswer?: (q: ObservationQuestion, a: TrackerAnswer) => void
  /** C15–C17 finished. The parent reflection — the pilot's LEADING indicator. */
  onReflection?: (r: ReflectionData) => void
  /**
   * The parent tapped "Mula" — the ACTIVITY is beginning, not merely the card.
   * This is where the run row is opened.
   */
  onActivityStart?: () => void
  /** Running engaged-seconds total, every ~15s. See useEngagedSeconds. */
  onHeartbeat?: (seconds: number) => void
  /** Final engaged-seconds total, once, when the activity screen closes. */
  onEnd?: (seconds: number) => void
  onExit: () => void
}) {
  const [screen, setScreen] = useState<Screen>("card")

  function handleEvent(e: ActivityEvent) {
    // Phase 2's `logEvent()` → the event_log table (spec §6.1) hangs here.
    // eslint-disable-next-line no-console
    console.debug("[event]", e.name, e.props ?? {})
  }

  if (screen === "card") {
    return (
      <Shell>
      <TodayCard
        day={day}
        vars={vars}
        assetsReady={ASSETS_READY}
        onStart={() => {
          onActivityStart?.()
          setScreen("activity")
        }}
        onExit={onExit}
      />
      </Shell>
    )
  }

  if (screen === "activity") {
    return (
      <Shell>
      <ClockedActivity
        day={day}
        vars={vars}
        interest={interest}
        onEvent={handleEvent}
        onInterestRecorded={onInterestRecorded}
        onHeartbeat={onHeartbeat}
        onEnd={onEnd}
        onQuit={() => setScreen("card")}
        onDone={() => {
          onActivityDone?.()
          setScreen("tracker")
        }}
      />
      </Shell>
    )
  }

  if (screen === "tracker") {
    return (
      <Shell>
        <Tracker
          day={day}
          vars={vars}
          saved={trackerAnswers ?? {}}
          onAnswer={(q, a) => onTrackerAnswer?.(q, a)}
          onDone={() => setScreen("reflection")}
          onExit={() => setScreen("card")}
        />
      </Shell>
    )
  }

  if (screen === "reflection") {
    return (
      <Shell>
        <Reflection
          day={day}
          vars={vars}
          interest={interest}
          onSave={(r) => onReflection?.(r)}
          onExit={onExit}
        />
      </Shell>
    )
  }

  return null
}

/**
 * The box we are given, and not one pixel more.
 *
 * `h-full`, NOT the viewport height — and this is the whole bug, so it is worth
 * writing down.
 *
 * The player renders inside `ViewLayer`, which carries a `translate-y` class. A
 * TRANSFORMED ancestor becomes the containing block for `position: fixed`
 * descendants, so the player's `fixed inset-0` wrapper is not the viewport at
 * all — it is the dashboard canvas, which starts BELOW the top bar. (It is also
 * why bumping the player's z-index could never cover that bar.)
 *
 * This shell used to be `height: var(--app-h)` — the full viewport height —
 * copied from onboarding. But onboarding renders at the app root, with no
 * transformed ancestor, so there the viewport IS its box. Here it is not: the
 * player was exactly one top-bar taller than the space it sat in, and the CTA
 * hung off the bottom of the screen, half-drawn and unclickable.
 *
 * `h-full` fills the box we were actually given. `overflow-hidden` keeps the page
 * from scrolling; the bands inside shrink instead, so the CTA stays put.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-hidden">{children}</div>
}

/* -------------------------------------------------------------------------- */

/**
 * The activity, with the clock wrapped around it.
 *
 * The clock lives HERE and not in DayPlayer, because DayPlayer opens on the day
 * CARD — a briefing screen. A parent who taps in to see what today asks of her
 * and decides now is not the moment has not spent that time with her child, and
 * must not have her day marked "belum selesai" for looking. Time starts when the
 * activity starts.
 *
 * Unmounting this screen — finishing, quitting, or closing the player — seals
 * the run. Coming back in opens a fresh one, which is exactly right: a day may
 * be attempted more than once, and each attempt is its own row.
 */
function ClockedActivity({
  onHeartbeat,
  onEnd,
  ...props
}: React.ComponentProps<typeof ActivityPlayer> & {
  onHeartbeat?: (seconds: number) => void
  onEnd?: (seconds: number) => void
}) {
  useEngagedSeconds({ onHeartbeat, onEnd })
  return <ActivityPlayer {...props} />
}

