/* ========================================================================== *
 *  C2–C4 · Activity player — Persediaan → Semasa → Selesai.
 *
 *  One card per script line; the parent swipes/taps forward at their own pace.
 *  The whole thing is driven by the day config — this component knows nothing
 *  about Day 1 specifically, which is the point: days 1–14 are pure data.
 *
 *  THE TIMER IS THE CLINICAL CORE. "Withhold & Wait" is the technique the whole
 *  programme teaches: hold the object, wait 5–7s, and give WITHIN 2s of the
 *  child's signal. So:
 *    · the timer auto-starts 1s after the card appears (spec §5.7)
 *    · on completion the card flips to a wait state ("Tunggu isyarat…") and
 *      does NOT auto-advance — the parent advances when the CHILD signals
 *    · we log requested vs actual elapsed, because the gap between them IS the
 *      fidelity metric (spec §6.2)
 *
 *  PILOT NOTE: no persistence and no event logging yet — `onEvent` is where both
 *  will hang. Timings are already measured so wiring them up is a one-liner.
 * ========================================================================== */

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, HelpCircle, Layers, Star, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  type ActivityPhase,
  type DayConfig,
  type Interest,
  type ScriptLine,
} from "@/lib/dayConfig"
import { useLang } from "@/lib/i18n"
import { interpolate, type Vars } from "@/lib/interpolate"
import { cn } from "@/lib/utils"

const STR = {
  ms: {
    phases: { persediaan: "Persediaan", semasa: "Semasa", selesai: "Selesai" },
    markMoment: "Tandai momen",
    ifChildDoes: (n: string) => `Jika ${n} buat lain?`,
    ccsCta: (n: string) => `Tahap CCS — cara cakap ikut tahap ${n}`,
    next: "Seterusnya",
    finish: "Selesai — jawab soalan ringkas",
    waitSignal: "Tunggu isyarat…",
    giveNow: "Bila dia beri isyarat — bagi SEGERA, dalam 2 saat.",
    hold: "Tahan… jangan bagi dulu",
    ready: "Bersedia…",
    drawerTitle: "Jika anak buat lain…",
    close: "Tutup",
    ccsTitle: "Tahap CCS",
    ccsWhat: "Apa itu CCS?",
    ccsSub: "Cakap ikut tahap anak — bukan tahap yang kita harapkan.",
    ccsLead: "CCS = tahap komunikasi anak.",
    ccsBody: " Ia bukan markah, dan bukan ujian. Ia cuma menunjukkan cara anak berkomunikasi sekarang — supaya anda boleh sesuaikan cara anda bercakap dengannya.",
    ccsBullets: [
      "· CCS rendah — anda banyak naratif, anak memerhati",
      "· CCS naik — anda tunggu, anak mula beri isyarat",
      "· CCS tinggi — anak mula pimpin, anda kembangkan",
    ],
    ccsFoot: "Tiada CCS “baik” atau “teruk”. Penanda aras anda ialah anak anda sendiri pada Hari 1.",
  },
  en: {
    phases: { persediaan: "Setting up", semasa: "During play", selesai: "Wrapping up" },
    markMoment: "Mark a moment",
    ifChildDoes: (n: string) => `What if ${n} does something else?`,
    ccsCta: (n: string) => `CCS level — how to speak at ${n}'s level`,
    next: "Next",
    finish: "Done — a few quick questions",
    waitSignal: "Wait for their signal…",
    giveNow: "The moment they signal — give it IMMEDIATELY, within 2 seconds.",
    hold: "Hold… don't give it yet",
    ready: "Get ready…",
    drawerTitle: "If your child does something else…",
    close: "Close",
    ccsTitle: "CCS level",
    ccsWhat: "What is CCS?",
    ccsSub: "Speak at your child's level — not the level we hope for.",
    ccsLead: "CCS = your child's communication level.",
    ccsBody: " It is not a score, and not a test. It simply shows how your child communicates right now — so you can adjust the way you speak with them.",
    ccsBullets: [
      "· Lower CCS — you narrate more, your child observes",
      "· CCS rising — you wait, your child starts to signal",
      "· Higher CCS — your child begins to lead, you expand",
    ],
    ccsFoot: "There is no “good” or “bad” CCS. Your benchmark is your own child on Day 1.",
  },
}

/**
 * MS is the canonical shape — add a key there and EN fails to compile until it's
 * translated too. A missing translation should be a build error, not a Malay
 * sentence appearing on an English screen.
 */
type Copy = (typeof STR)["ms"]

/** Timers auto-start shortly after the card lands, so the parent isn't racing it. */
const TIMER_START_DELAY_MS = 1000

/** One flattened step: a line plus which phase it came from. */
interface Step {
  line: ScriptLine
  phase: ActivityPhase["phase"]
  /** 1-based index of this step's phase, for the "Persediaan · 1/3" chip. */
  phaseIndex: number
  phaseCount: number
}

/**
 * Flatten the day's phases into a single swipeable list of steps, resolving
 * `interest_lines` against the toy the child picked on Day 1.
 *
 * A day with `interest_lines` and NO recorded interest falls back to the phase's
 * default `lines` — which is why every interest phase must still author one.
 */
function buildSteps(day: DayConfig, interest: Interest | undefined): Step[] {
  const phases = day.activity_phases
  return phases.flatMap((phase, pi) => {
    const variant = interest ? phase.interest_lines?.[interest] : undefined
    const lines = variant?.length ? variant : phase.lines
    return lines.map((line) => ({
      line,
      phase: phase.phase,
      phaseIndex: pi + 1,
      phaseCount: phases.length,
    }))
  })
}

export interface ActivityEvent {
  name: string
  props?: Record<string, unknown>
}

export function ActivityPlayer({
  day,
  vars,
  interest,
  onDone,
  onQuit,
  onEvent,
}: {
  day: DayConfig
  vars: Vars
  interest?: Interest
  /** Activity finished → go to the observation tracker (C5–C14). */
  onDone: () => void
  onQuit: () => void
  /** Where §6.1 event logging will hang. No-op in the skeleton. */
  onEvent?: (e: ActivityEvent) => void
}) {
  const { lang } = useLang()
  const t = STR[lang]
  const steps = useMemo(() => buildSteps(day, interest), [day, interest])
  const [i, setI] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [ccsOpen, setCcsOpen] = useState(false)
  const [moments, setMoments] = useState(0)

  const step = steps[i]
  const isLast = i === steps.length - 1
  const say = (s: string) => interpolate(s, vars)

  function emit(name: string, props?: Record<string, unknown>) {
    onEvent?.({ name, props })
  }

  function advance() {
    if (isLast) {
      emit("activity_completed", { day: day.day_number, moments })
      onDone()
      return
    }
    const next = i + 1
    setI(next)
    if (steps[next].phase !== step.phase) {
      emit("phase_advanced", { phase: steps[next].phase, day: day.day_number })
    }
  }

  useEffect(() => {
    emit("activity_started", { day: day.day_number, steps: steps.length })
    // Fire once per activity, not per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!step) return null

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* Top bar — phase chip + quit */}
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-display text-xs font-semibold text-primary">
          {t.phases[step.phase]} · {step.phaseIndex}/{step.phaseCount}
        </span>
        <button
          type="button"
          onClick={onQuit}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close activity"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Progress across the whole activity */}
      <div className="mx-5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((i + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* The line card */}
      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <LineCard
          key={i}
          line={step.line}
          say={say}
          t={t}
          onTimerDone={(requested, actual) =>
            emit("timer_completed", {
              day: day.day_number,
              requested_s: requested,
              actual_s: actual,
            })
          }
          onTimerStart={(requested) =>
            emit("timer_started", { day: day.day_number, requested_s: requested })
          }
        />
      </main>

      {/* Persistent actions */}
      <div className="flex items-center gap-2 px-5 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            setMoments((m) => m + 1)
            emit("tandai_momen", { phase: step.phase, day: day.day_number })
          }}
        >
          <Star className={cn("size-4", moments > 0 && "fill-current text-neon-cyan")} />
          {t.markMoment}{moments > 0 ? ` (${moments})` : ""}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            setDrawerOpen(true)
            emit("drawer_opened", { day: day.day_number })
          }}
        >
          <HelpCircle className="size-4" />
          {t.ifChildDoes(vars.anak)}
        </Button>
      </div>

      {/* CCS ladder — the graded prompts. Always reachable during the activity,
          because the parent needs to pitch their language at the child's level
          mid-play, not decide it beforehand. */}
      <div className="px-5 pb-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setCcsOpen(true)
            emit("ccs_drawer_opened", { day: day.day_number })
          }}
        >
          <Layers className="size-4" />
          {t.ccsCta(vars.anak)}
        </Button>
      </div>

      {/* Advance */}
      <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
        <Button
          variant="ghost"
          size="icon"
          disabled={i === 0}
          onClick={() => setI((n) => Math.max(0, n - 1))}
          aria-label="Previous card"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <Button className="flex-1" size="lg" onClick={advance}>
          {isLast ? t.finish : t.next}
          {!isLast && <ArrowRight className="size-4" />}
        </Button>
      </footer>

      {drawerOpen && (
        <SituationDrawer day={day} say={say} t={t} onClose={() => setDrawerOpen(false)} />
      )}
      {ccsOpen && <CcsDrawer day={day} say={say} t={t} onClose={() => setCcsOpen(false)} />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * One script line. If the line carries `timer_seconds`, it runs a withhold
 * timer and then flips to the wait state instead of auto-advancing.
 */
function LineCard({
  line,
  say,
  t,
  onTimerStart,
  onTimerDone,
}: {
  line: ScriptLine
  say: (s: string) => string
  t: Copy
  onTimerStart: (requested: number) => void
  onTimerDone: (requested: number, actual: number) => void
}) {
  const requested = line.timer_seconds
  const [remaining, setRemaining] = useState(requested ?? 0)
  const [running, setRunning] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const startedAt = useRef<number | null>(null)

  // Auto-start the timer a beat after the card lands (spec §5.7).
  useEffect(() => {
    if (!requested) return
    const id = window.setTimeout(() => {
      setRunning(true)
      startedAt.current = Date.now()
      onTimerStart(requested)
    }, TIMER_START_DELAY_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested])

  // Tick down; on zero, flip to the wait state — do NOT advance. The parent
  // advances when the CHILD gives a signal, which is the whole technique.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id)
          setRunning(false)
          setWaiting(true)
          const actual = startedAt.current
            ? Math.round((Date.now() - startedAt.current) / 1000)
            : (requested ?? 0)
          onTimerDone(requested ?? 0, actual)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <Card className="w-full p-7 text-center shadow-sm">
      <p className="font-display text-2xl font-bold leading-snug text-foreground">
        {say(line.text)}
      </p>

      {line.tone_tags?.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {line.tone_tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {requested ? (
        <div className="mt-6 border-t border-border pt-5">
          {waiting ? (
            <div className="animate-pulse">
              <p className="font-display text-lg font-bold text-primary">
                {say(line.timer_label ?? t.waitSignal)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t.giveNow}
              </p>
            </div>
          ) : (
            <>
              <p className="font-display text-4xl font-bold tabular-nums text-primary">
                {remaining}s
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {running ? t.hold : t.ready}
              </p>
            </>
          )}
        </div>
      ) : null}
    </Card>
  )
}

/** Human labels for the four graded tiers. CCS4 and CCS5 share one prompt. */
const CCS_LABELS: Record<string, string> = {
  CCS1: "CCS 1",
  CCS2: "CCS 2",
  CCS3: "CCS 3",
  CCS4_5: "CCS 4–5",
}

/**
 * The CCS ladder — how to pitch your language at the child's communication stage.
 *
 * The parent does NOT pick their CCS here. Per spec §5.11 the level is DERIVED
 * server-side from the day's KP + JA answers, and on Day 1 no prior data exists
 * — so all four tiers are shown as a ladder and the parent climbs to whichever
 * one the child is actually meeting them at.
 *
 * ⚠ OPEN: the paper tracker ASKS the parent to tick CCS; the app spec DERIVES it.
 * Until an SLT settles that, nothing here writes a CCS value.
 *
 * The "Apa itu CCS?" explainer below is the stub for the dashboard tour that
 * will teach this properly.
 */
function CcsDrawer({
  day,
  say,
  t,
  onClose,
}: {
  day: DayConfig
  say: (s: string) => string
  t: Copy
  onClose: () => void
}) {
  const [explain, setExplain] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">{t.ccsTitle}</h2>
          <button
            type="button"
            onClick={() => setExplain((v) => !v)}
            className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t.ccsWhat}
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          {t.ccsSub}
        </p>

        {explain && (
          <Card className="mb-4 border-primary/30 bg-primary/5 p-4">
            <p className="text-sm leading-relaxed text-foreground">
              <strong>{t.ccsLead}</strong>{t.ccsBody}
            </p>
            <ul className="mt-2.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {t.ccsBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-2.5 text-xs italic text-muted-foreground">
              {t.ccsFoot}
            </p>
          </Card>
        )}

        <div className="space-y-2.5 pb-4">
          {day.ccs_prompts.map((p) => (
            <Card key={p.ccs} className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[11px] font-bold text-primary">
                  {CCS_LABELS[p.ccs] ?? p.ccs}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {p.technique}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{say(p.line)}</p>
            </Card>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          {t.close}
        </Button>
      </div>
    </div>
  )
}

/** "Jika {anak} buat lain?" — the situational-branch drawer. */
function SituationDrawer({
  day,
  say,
  t,
  onClose,
}: {
  day: DayConfig
  say: (s: string) => string
  t: Copy
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">
          {t.drawerTitle}
        </h2>
        <div className="space-y-3 pb-4">
          {day.situational_branches.map((b) => (
            <Card key={b.trigger} className="p-4">
              <p className="font-display text-sm font-semibold text-primary">
                {say(b.trigger)}
              </p>
              <ul className="mt-2 space-y-1">
                {b.responses.map((r) => (
                  <li key={r} className="text-sm leading-relaxed text-foreground">
                    {say(r)}
                  </li>
                ))}
              </ul>
              {b.note && (
                <p className="mt-2 text-xs italic text-muted-foreground">{say(b.note)}</p>
              )}
            </Card>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>
          {t.close}
        </Button>
      </div>
    </div>
  )
}
