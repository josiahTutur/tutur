/* ========================================================================== *
 *  Pilot preview harness — `?pilot=1`.
 *
 *  Walks the real slice, end to end:
 *
 *      A1–A14 onboarding  →  DASH  →  C1  →  C2–C4  →  [stub]
 *
 *  Nothing is persisted — refresh and you start over. That is the point: this
 *  exists so a human can WALK the flow and judge it before the database, the
 *  tracker, or the tour are built. It is deleted in Phase 4.
 *
 *  The only onboarding data the activity actually consumes is {anak} and
 *  {panggilan}; everything else feeds screening, routing and the pilot dataset.
 *  `Skip` jumps straight to the dashboard with stand-in values.
 * ========================================================================== */

import { useState } from "react"

import { DayPlayer } from "@/components/preverb/DayPlayer"
import { PilotDashboard } from "@/components/preverb/PilotDashboard"
import {
  OnboardingFlow,
  type OnboardingResult,
} from "@/components/onboarding/OnboardingFlow"
import { Button } from "@/components/ui/button"
import { DAYS, isActivity } from "@/content/preverb"
import { type Interest } from "@/lib/preverbConfig"
import { type Vars } from "@/lib/interpolate"
import { type ResultVariant } from "@/lib/screening"

type Stage = "onboarding" | "dashboard" | "day"

/** Stand-in for a parent who skipped onboarding — dev shortcut only. */
const DEMO: OnboardingResult = {
  anak: "Adam",
  childAge: "2_3",
  parentName: "Siti",
  panggilan: "Ibu",
  relationship: "ibu",
  parentAge: "25_34",
  homeLanguage: "melayu",
  screening: { q1: "kerap", q2: "kerap", q3: "kerap", q4: "kerap", q5: "kerap", q6: "tiada" },
  flags: [],
  variant: "A",
  confidenceD0: 3,
}

export function PilotPreview() {
  const [stage, setStage] = useState<Stage>("onboarding")
  const [result, setResult] = useState<OnboardingResult | null>(null)

  /**
   * The toy the child picks on Day 1 (screen C5). It does NOT come from
   * onboarding — the toy picker lives in the dashboard tour, and C5 records the
   * actual choice. Until both exist, Day 1 falls back to its default script and
   * D2–D14 have no interest context.
   */
  const [interest] = useState<Interest | undefined>(undefined)

  const days = DAYS.filter(isActivity)
  const today = days[0]
  const authoredDays = DAYS.map((d) => d.day_number)

  const data = result ?? DEMO
  const vars: Vars = {
    anak: data.anak || "Adam",
    panggilan: data.panggilan || "Ibu",
    // {mainan} is genuinely unknown until C5 on Day 1 — leaving it undefined
    // means the raw token shows if content references it too early, which is a
    // content bug we WANT to see rather than paper over with an empty string.
    mainan: undefined,
  }

  if (stage === "onboarding") {
    return (
      <div className="relative">
        <OnboardingFlow
          onDone={(r) => {
            setResult(r)
            setStage("dashboard")
          }}
        />
        <div className="pointer-events-none fixed inset-x-0 bottom-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="pointer-events-auto text-xs text-muted-foreground"
            onClick={() => {
              setResult(DEMO)
              setStage("dashboard")
            }}
          >
            Langkau onboarding (dev)
          </Button>
        </div>
      </div>
    )
  }

  if (stage === "dashboard") {
    return (
      <div className="relative">
        <PilotDashboard
          vars={vars}
          variant={data.variant as ResultVariant}
          today={today}
          authoredDays={authoredDays}
          onStartDay={() => setStage("day")}
        />
        <ScreeningDebug data={data} />
      </div>
    )
  }

  if (!today) return null

  return (
    <DayPlayer
      day={today}
      vars={vars}
      interest={interest}
      onExit={() => setStage("dashboard")}
    />
  )
}

/**
 * Dev-only readout of what onboarding produced. Makes the screening rules
 * inspectable — you can see WHY you got variant A/B/C without reading the code.
 */
function ScreeningDebug({ data }: { data: OnboardingResult }) {
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8">
      <details className="rounded-xl border border-dashed border-border p-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          Data onboarding (dev)
        </summary>
        <dl className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
          <Row k="{anak}" v={data.anak} />
          <Row k="{panggilan}" v={data.panggilan} />
          <Row k="umur anak" v={data.childAge} />
          <Row k="nama ibu bapa" v={data.parentName || "—"} />
          <Row k="umur ibu bapa" v={data.parentAge} />
          <Row
            k="saringan"
            v={`q1=${data.screening.q1} q2=${data.screening.q2} q3=${data.screening.q3} q4=${data.screening.q4} q5=${data.screening.q5 ?? "—(<12b)"} q6=${data.screening.q6}`}
          />
          <Row k="flags" v={data.flags.length ? data.flags.join(", ") : "tiada"} />
          <Row k="variant" v={data.variant} />
          <Row k="keyakinan D0" v={String(data.confidenceD0)} />
        </dl>
      </details>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold">{k}</dt>
      <dd className="truncate">{v}</dd>
    </div>
  )
}
