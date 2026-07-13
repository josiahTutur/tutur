/* ========================================================================== *
 *  C5–C14 · The tracker — ten observation screens.
 *
 *  ── THIS IS THE PILOT'S PRIMARY INSTRUMENT ────────────────────────────────
 *  The activity is what the parent DOES; this is what we LEARN. Spec §1.1's
 *  question — "do parents complete the daily loop consistently over 14 days?" —
 *  is a question about THIS screen, not the script. If the tracker is a chore,
 *  the pilot has no data, however good the activity was.
 *
 *  ── HENCE: ONE QUESTION PER SCREEN, AUTO-ADVANCE, AUTO-SAVE ───────────────
 *  A ten-row grid is a form, and a tired parent at 9pm abandons a form. Ten
 *  screens, each with one question and three big taps, is a conversation. Target
 *  is under 90 seconds for the lot.
 *
 *  Every answer saves the moment it is given (spec §5.8). A parent who quits at
 *  question 7 has still told us six things — and WHERE she stopped is itself the
 *  finding. Batching to the end would throw away exactly the data we came for.
 *
 *  ── THE TONE IS THE FEATURE ───────────────────────────────────────────────
 *  Every question here is a way of asking "is your child behind?" — and she will
 *  hear it that way unless we are careful. So: "Belum" never reads as failure,
 *  the benchmark is her own child on Day 1, and nothing on this screen scores
 *  her. A parent who feels judged here does not come back on Day 2.
 * ========================================================================== */

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MayaBubble } from "@/components/preverb/TodayCard"
import { interpolate, type Vars } from "@/lib/interpolate"
import { useLang } from "@/lib/i18n"
import {
  BMK_LABELS,
  CCS_LEVELS,
  JA_LEVELS,
  RUTIN_LABELS,
  type BmkRating,
  type CcsLevel,
  type DayConfig,
  type JaLevel,
  type ObservationQuestion,
  type RutinRating,
} from "@/lib/preverbConfig"
import { type TrackerAnswer } from "@/lib/preverbDb"
import { cn } from "@/lib/utils"

const STR = {
  ms: {
    title: "Tracker",
    of: (n: number, total: number) => `${n} / ${total}`,
    skip: "Langkau",
    next: "Seterusnya",
    finish: "Selesai",
    noneYet: "Tiada hari ini",
    newWordsPlaceholder: "",
    // CCS is a description, never a score. See the copy note in the header.
    ccs: {
      CCS1: "Dia belum beri isyarat — saya yang bercerita",
      CCS2: "Dia mula beri isyarat bila saya tunggu",
      CCS3: "Dia boleh pilih antara dua",
      CCS4: "Dia mula guna kata / gabung idea",
      CCS5: "Dia pimpin perbualan",
    },
  },
  en: {
    title: "Tracker",
    of: (n: number, total: number) => `${n} / ${total}`,
    skip: "Skip",
    next: "Next",
    finish: "Done",
    noneYet: "Not today",
    newWordsPlaceholder: "",
    ccs: {
      CCS1: "No signals yet — I do the narrating",
      CCS2: "They start signalling when I wait",
      CCS3: "They can choose between two",
      CCS4: "They're starting to use words / combine ideas",
      CCS5: "They lead the exchange",
    },
  },
} as const

export function Tracker({
  day,
  vars,
  saved,
  onAnswer,
  onDone,
  onExit,
}: {
  day: DayConfig
  vars: Vars
  /** Answers already on record — the tracker resumes at the first unanswered. */
  saved: Record<string, TrackerAnswer>
  /** Fired on EVERY answer, not at the end. Spec §5.8. */
  onAnswer: (q: ObservationQuestion, a: TrackerAnswer) => void
  onDone: () => void
  onExit: () => void
}) {
  const { lang } = useLang()
  const t = STR[lang]
  const say = (s: string) => interpolate(s, vars)

  const questions = day.observation_questions
  const total = questions.length

  // Resume at the first unanswered question, not at zero. A parent who came back
  // after being interrupted should not have to re-tap what she already told us.
  const firstUnanswered = useMemo(() => {
    const i = questions.findIndex((q) => !(q.question_id in saved))
    return i === -1 ? 0 : i
    // Computed once, on mount: it must not jump forward as she answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [i, setI] = useState(firstUnanswered)
  // +1 forward, -1 back. The transition is direction-aware so the parent can SEE
  // which way she went, not merely that something happened.
  const [dir, setDir] = useState<1 | -1>(1)
  const [newWords, setNewWords] = useState("")
  // Mirrors what is on record, updated the instant she answers — so stepping
  // back shows her own answer without waiting on a round trip.
  const [answers, setAnswers] = useState<Record<string, TrackerAnswer>>(saved)

  const q = questions[i]
  const isLast = i === total - 1

  /*
   * What she already answered, for the question she is looking at.
   *
   * Going back was possible before this, and useless: the screen came up blank,
   * so she could not see what she had said and had no way to tell whether her
   * correction had landed. A back button that shows you nothing is not a way
   * back — it is a way to answer the same question twice, blind.
   */
  const current: TrackerAnswer | undefined = answers[q?.question_id ?? ""]

  // The free-text screen is the only one that cannot auto-advance — she has to
  // finish typing. Re-entering it should show what she typed, not an empty box.
  useEffect(() => {
    const a = answers[questions[i]?.question_id ?? ""]
    setNewWords(a?.scale === "text" ? a.value : "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  if (!q) return null

  function answer(a: TrackerAnswer) {
    setAnswers((prev) => ({ ...prev, [q.question_id]: a }))
    onAnswer(q, a)
    if (isLast) onDone()
    else {
      setDir(1)
      setI(i + 1)
    }
  }

  const back = () => {
    if (i === 0) return onExit()
    setDir(-1)
    setI(i - 1)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-5 py-4">
      {/* Progress — dots, not a bar. Ten is few enough to COUNT, and seeing that
          there are ten and you are on three is more reassuring than a bar that
          could mean anything. */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {questions.map((qq, n) => (
            <span
              key={qq.question_id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                n < i ? "bg-primary" : n === i ? "bg-primary/60" : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
          {t.of(i + 1, total)}
        </span>
      </div>

      {/* Question.
          `key` on question_id is what makes this animate: React tears the old
          block down and mounts a new one, so the 500ms entrance replays every
          time. Without it React would reuse the node and quietly swap the text —
          which is exactly the "did it change?" problem. Ten near-identical screens
          need the movement to say "that was a NEW question". */}
      <div
        key={q.question_id}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-5",
          dir === 1 ? "animate-q-in-next" : "animate-q-in-prev"
        )}
      >
        <MayaBubble>{say(q.text)}</MayaBubble>
        {q.hint && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {say(q.hint)}
          </p>
        )}

        <div className="pt-1">
          {q.scale === "bmk" && (
            <Options
              key={q.question_id}
              items={(["belum", "muncul", "konsisten"] as BmkRating[]).map((v) => ({
                value: v,
                label: BMK_LABELS[v],
              }))}
              selected={current?.scale === "bmk" ? current.value : undefined}
              onPick={(v) => answer({ scale: "bmk", value: v as BmkRating })}
            />
          )}

          {q.scale === "ccs" && (
            <Options
              key={q.question_id}
              items={CCS_LEVELS.map((v) => ({
                value: v,
                // The level code is the DATA; the sentence is what she reads.
                // "CCS3" means nothing to a parent, and a bare number invites her
                // to read it as a grade out of five.
                label: t.ccs[v],
                tag: v,
              }))}
              selected={current?.scale === "ccs" ? current.value : undefined}
              onPick={(v) => answer({ scale: "ccs", value: v as CcsLevel })}
            />
          )}

          {q.scale === "ja" && (
            <Options
              key={q.question_id}
              items={JA_LEVELS.map((v) => ({
                value: v,
                label: say(day.ja_descriptors[v]),
                tag: v,
              }))}
              selected={current?.scale === "ja" ? current.value : undefined}
              onPick={(v) => answer({ scale: "ja", value: v as JaLevel })}
            />
          )}

          {q.scale === "rutin" && (
            <Options
              key={q.question_id}
              items={(["penuh", "separuh", "tidak_sempat"] as RutinRating[]).map((v) => ({
                value: v,
                label: RUTIN_LABELS[v],
              }))}
              selected={current?.scale === "rutin" ? current.value : undefined}
              onPick={(v) => answer({ scale: "rutin", value: v as RutinRating })}
            />
          )}

          {q.scale === "text" && (
            <textarea
              value={newWords}
              onChange={(e) => setNewWords(e.target.value)}
              rows={3}
              placeholder={t.newWordsPlaceholder}
              className="w-full resize-none rounded-2xl border-[1.5px] border-border bg-muted px-4 py-3.5 text-base text-foreground outline-none transition focus:border-primary"
            />
          )}
        </div>
      </div>

      {/* Footer — back, plus a way past the free-text screen. */}
      <div className="mt-4 flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={back}
          aria-label="Back"
          className="size-11 shrink-0"
        >
          <ArrowLeft className="size-5" />
        </Button>

        {q.scale === "text" ? (
          <>
            {/* "Tiada hari ini" is a REAL answer, not a skip. Most days there is
                nothing new, and a parent who has to invent something to get past
                this screen is poisoning the word bank. */}
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => answer({ scale: "text", value: "" })}
            >
              {t.noneYet}
            </Button>
            <Button
              className="flex-1"
              size="lg"
              disabled={!newWords.trim()}
              onClick={() => answer({ scale: "text", value: newWords })}
            >
              {isLast ? t.finish : t.next}
            </Button>
          </>
        ) : (
          // Every other screen auto-advances on tap, so there is nothing to press.
          // The space is held so the footer does not change height between screens.
          <div className="h-11 flex-1" />
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/** Tap to answer. One tap, one answer, straight to the next question. */
function Options({
  items,
  selected,
  onPick,
}: {
  items: { value: string; label: string; tag?: string }[]
  /** The answer already on record. Shown ticked when she steps back into it. */
  selected?: string
  onPick: (v: string) => void
}) {
  // Seeded from the stored answer — and `key`ed on question_id by the caller, so
  // it genuinely re-mounts per question. Without that key, React reuses this
  // component across questions and the tick from question 3 ("Belum") would still
  // be showing on question 4.
  const [picked, setPicked] = useState<string | null>(selected ?? null)

  return (
    <div className="space-y-2.5">
      {items.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            // Show the tick for a beat before moving on — an answer that vanishes
            // the instant you touch it leaves you unsure it registered.
            setPicked(o.value)
            window.setTimeout(() => onPick(o.value), 180)
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-all active:scale-[0.99]",
            picked === o.value
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
              picked === o.value ? "border-primary bg-primary" : "border-border"
            )}
          >
            {picked === o.value && (
              <Check className="size-3 text-primary-foreground" strokeWidth={3} />
            )}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
            {o.label}
          </span>
          {o.tag && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {o.tag}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
