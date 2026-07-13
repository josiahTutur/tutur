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
import { ArrowLeft, ArrowRight, Check, HelpCircle, Layers } from "lucide-react"

import { SpeakButton } from "@/components/preverb/SpeakButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  INTERESTS,
  type ActivityPhase,
  type DayConfig,
  type Interest,
  type ScriptLine,
} from "@/lib/preverbConfig"
import { useLang } from "@/lib/i18n"
import { interpolate, type Vars } from "@/lib/interpolate"
import { cn } from "@/lib/utils"

const STR = {
  ms: {
    phases: { persediaan: "Persediaan", semasa: "Semasa", selesai: "Selesai" },
    tone: "Nada",
    ifChildDoes: (n: string) => `Jika ${n} buat lain?`,
    ccsCta: (n: string) => `Tahap CCS — cara cakap ikut tahap ${n}`,
    next: "Seterusnya",
    finish: "Selesai — jawab soalan ringkas",
    recordTitle: "Rekod Minat",
    recordAsk: (n: string) => `Mainan mana ${n} pilih?`,
    recordWhy: "Pilihan ini jadi konteks untuk Hari 2 hingga Hari 14. Rekod apa yang dia PILIH, bukan apa yang anda harap.",
    toys: {
      barbie: "Anak patung / Barbie",
      masak_masak: "Masak-masak",
      lego: "Lego / Blok",
      lain: "Lain-lain",
    },
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
    tone: "Tone",
    ifChildDoes: (n: string) => `What if ${n} does something else?`,
    ccsCta: (n: string) => `CCS level — how to speak at ${n}'s level`,
    next: "Next",
    finish: "Done — a few quick questions",
    recordTitle: "Record their interest",
    recordAsk: (n: string) => `Which toy did ${n} choose?`,
    recordWhy: "This choice becomes the context for Day 2 through Day 14. Record what they CHOSE, not what you hoped for.",
    toys: {
      barbie: "Doll / Barbie",
      masak_masak: "Play kitchen",
      lego: "Lego / Blocks",
      lain: "Something else",
    },
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
  onInterestRecorded,
}: {
  day: DayConfig
  vars: Vars
  interest?: Interest
  /** Activity finished → go to the observation tracker (C5–C14). */
  onDone: () => void
  onQuit: () => void
  /** Where §6.1 event logging will hang. No-op in the skeleton. */
  onEvent?: (e: ActivityEvent) => void
  /** Day 1 only — the toy the child chose. Contextualises D2–D14. */
  onInterestRecorded?: (i: Interest) => void
}) {
  const { lang } = useLang()
  const t = STR[lang]

  // Day 1 records the child's interest MID-ACTIVITY, not before it. The whole
  // point of the persediaan phase is to lay out three toys and NOT suggest —
  // the choice is the observation. So the picker sits at the seam between
  // persediaan and semasa, which is exactly where the child has just chosen.
  const [picked, setPicked] = useState<Interest | undefined>(undefined)
  const chosen = interest ?? picked

  /*
   * Whether we have moved PAST the record-interest screen — which is a different
   * question from whether a toy has been chosen.
   *
   * It used to be the same question: the picker rendered only while `chosen` was
   * empty, so the moment she tapped Barbie the screen ceased to exist. Pressing
   * Back then walked straight past it into the script, and a parent who had
   * fat-fingered the wrong toy had no way to reach the choice again — a choice
   * that silently contextualises the next thirteen days.
   *
   * Seeded from `interest`, so a family replaying Day 1 with a toy already on
   * record is not re-interrogated — but Back still takes them to it.
   */
  const [interestDone, setInterestDone] = useState<boolean>(interest !== undefined)

  const steps = useMemo(() => buildSteps(day, chosen), [day, chosen])
  const [i, setI] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [ccsOpen, setCcsOpen] = useState(false)

  const step = steps[i]
  const isLast = i === steps.length - 1
  const pct = steps.length ? Math.round(((i + 1) / steps.length) * 100) : 0
  const say = (s: string) => interpolate(s, vars)

  function emit(name: string, props?: Record<string, unknown>) {
    onEvent?.({ name, props })
  }

  function advance() {
    if (isLast) {
      emit("activity_completed", { day: day.day_number })
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

  /*
   * The seam: the ONE index where persediaan ends and semasa begins. The three
   * toys are down, the parent has waited, and the semasa script cannot be chosen
   * until we know which toy the child took. That is the structure of Day 1.
   *
   * It is an INDEX, not a phase test. It used to be `step.phase !== "persediaan"`,
   * which is true of every semasa AND selesai line — so Back from "Uh oh, jatuh!"
   * (a selesai line, eight screens later) threw the parent all the way out to the
   * toy picker. The seam is one place, not everywhere after a place.
   */
  const seamIdx = steps.findIndex((st) => st.phase !== "persediaan")
  const atSeam = day.records_interest === true && seamIdx !== -1 && i === seamIdx

  if (atSeam && !interestDone) {
    return (
      <InterestPicker
        t={t}
        say={say}
        childName={vars.anak ?? ""}
        selected={chosen}
        onSelect={(pick) => {
          setPicked(pick)
          onInterestRecorded?.(pick)
          emit("interest_recorded", { day: day.day_number, interest: pick })
        }}
        onNext={() => setInterestDone(true)}
        onBack={() => setI((n) => Math.max(0, n - 1))}
      />
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden">
      {/*
        Back · progress · percent — the same header as the briefing screens, so
        the whole activity reads as one continuous journey.

        The phase chip ("Persediaan · 1/3") is deliberately GONE. Persediaan /
        Semasa / Selesai are the SLT's structure, not the parent's task: she does
        not do anything differently because a line is "wrapping up", and the chip
        read like an instruction she had to follow. Worse, it counted PHASES, so
        it sat at 1/3 for three lines and then leapt — telling her less about
        where she was than the bar underneath it already did.

        One number now, and it is the true one: how far through the script she is.
      */}
      {/* The header is now the progress bar and nothing else. Back moved down
          beside the CTA — a whole header row spent on one icon was pushing the
          script down and the button toward the fold. */}
      <header className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </header>

      {/* The only band that flexes. It is top-aligned: the line sits right under
          the progress bar, and the slack falls BELOW it, shrinking to nothing on
          a short phone rather than pushing the CTA off the bottom. */}
      <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-5 pt-4">
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
      {/* "Tandai momen" used to sit here. It was removed: it opened no input, so
          there was nothing to write the moment INTO — it incremented a counter
          and threw it away. A button that looks like it is catching something
          precious and silently drops it is worse than no button. It belongs with
          the reflection screen ("satu momen bermakna hari ini"), which does not
          exist yet, and it should come back only once it can actually save. */}
      <div className="flex shrink-0 items-center gap-2 px-5 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
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
      <div className="shrink-0 px-5 pb-3">
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

      {/* Advance — with Back beside it. On the first line, Back leaves the
          activity; after that it steps to the previous line. */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-5 py-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            // Stepping back off the first semasa line reopens the toy choice
            // rather than skipping over it — that screen is a step, not a gate.
            if (atSeam && interestDone) setInterestDone(false)
            else if (i === 0) onQuit()
            else setI((n) => Math.max(0, n - 1))
          }}
          aria-label="Back"
          className="size-11 shrink-0"
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
 * REKOD MINAT — the single most consequential tap in the programme.
 *
 * The PDF (H1): "REKOD MINAT: ☐ Barbie ☐ Masak-masak ☐ Lego → guna untuk
 * H2–H14." Whatever is recorded here becomes the context of the next thirteen
 * days: Day 2 says "GUNA MAINAN SAMA seperti Hari 1", Day 13 says "GUNA
 * KONTEKS MINAT DARI H1".
 *
 * So the copy has to fight the one instinct that would ruin it — a parent
 * recording the toy she WISHED he had picked. Hence "rekod apa yang dia PILIH,
 * bukan apa yang anda harap."
 */
function InterestPicker({
  t,
  say,
  childName,
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  t: Copy
  say: (s: string) => string
  childName: string
  /** The toy on record, if any. Highlighted, and changeable. */
  selected?: Interest
  onSelect: (i: Interest) => void
  onNext: () => void
  onBack: () => void
}) {
  const options: Interest[] = [...INTERESTS, "lain"]

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-5 py-4">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pt-2">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
            {t.recordTitle}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-snug text-foreground">
            {t.recordAsk(childName)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {say(t.recordWhy)}
          </p>
        </div>

        {/* Tapping SELECTS — it does not advance. Selecting used to jump straight
            into the script, which made the choice feel irreversible the instant
            a thumb slipped. Now the choice sits there, visibly hers, until she
            confirms it. */}
        <div className="space-y-2.5">
          {options.map((id) => {
            const active = selected === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-all active:scale-[0.99]",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                    active ? "border-primary bg-primary" : "border-border"
                  )}
                >
                  {active && (
                    <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                  )}
                </span>
                <span className="text-sm font-semibold text-foreground">{t.toys[id]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="Back"
          className="size-11 shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <Button
          className="flex-1"
          size="lg"
          disabled={selected === undefined}
          onClick={onNext}
        >
          {t.next}
          <ArrowRight className="size-4" />
        </Button>
      </div>
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

      {/* NADA — how to SAY the line, not what to say.
          The tags used to float unlabelled under the sentence, so a parent had no
          way to know they were about her voice rather than more words to read.
          The chip names them. */}
      {line.tone_tags?.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {t.tone}
          </span>
          {line.tone_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {tag}
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

        {/* Each tier is a line the parent has to SAY, in a particular tone. The
            mode is called "Skrip & Nada" — this is the nada half. */}
        <div className="space-y-2.5 pb-4">
          {day.ccs_prompts.map((p) => (
            <Card key={p.ccs} className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-display text-[11px] font-bold text-primary">
                  {CCS_LABELS[p.ccs] ?? p.ccs}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
                  {p.technique}
                </span>
                <SpeakButton line={say(p.line)} rawLine={p.line} />
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
