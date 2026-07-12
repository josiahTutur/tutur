import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  Heart,
  KeyRound,
  Star,
  Stethoscope,
} from "lucide-react"
import { useLang, useT } from "@/lib/i18n"
import { QUESTIONS } from "@/components/Chat"

/* ========================================================================== *
 *  Welcome — the founding-member onboarding, one message per full page.
 *
 *  3 story pages (welcome · vision · founding benefits) built around the
 *  provided illustrations, then the first 5 "getting-to-know-you" questions —
 *  one per page, tap-to-answer (names typed). Runs BEFORE the "What is Tutur"
 *  story and the 20-question profiling; the 5 answers are carried forward so
 *  profiling never re-asks them. Questions reuse the profiling QUESTIONS data.
 * ========================================================================== */

const FIVE = QUESTIONS.slice(0, 5)
const INTRO_IMAGES = [
  "/welcome/welcome-1a.png",
  "/welcome/welcome-2a.png",
  "/welcome/welcome-3.png",
]
const BENEFIT_ICONS = [Star, Gift, Stethoscope, KeyRound, Heart] as const
const TOTAL = 3 + FIVE.length // 3 story pages + 5 questions
const OTHER = "Lain-lain" // canonical "Other" option value

/* Local persistence — so an accidental refresh resumes on the same page with
 * the answers already given, instead of restarting the sector. */
const STORAGE_KEY = "tutur.welcome.v1"

interface SavedWelcome {
  step: number
  answers: string[]
  input: string
  otherActive: boolean
}

function readSaved(): SavedWelcome {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const v = JSON.parse(raw)
      if (v && typeof v.step === "number" && Array.isArray(v.answers)) {
        return {
          step: Math.min(Math.max(v.step, 0), TOTAL - 1),
          answers: v.answers,
          input: typeof v.input === "string" ? v.input : "",
          otherActive: !!v.otherActive,
        }
      }
    }
  } catch {
    /* corrupt or unavailable — start fresh */
  }
  return { step: 0, answers: [], input: "", otherActive: false }
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Clears the Welcome sector's saved progress (used on sign-out). */
export function clearWelcomeProgress() {
  clearSaved()
}

export default function Welcome({
  onComplete,
  onJoinCode,
}: {
  /** Receives the 5 canonical answers (child age, child name, parent name,
   *  relationship, parent age) to carry into profiling. */
  onComplete: (answers: string[]) => void
  /** "Have an invite code?" — a co-parent joins a shared child instead. */
  onJoinCode?: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const w = t.welcome

  const [saved] = useState(readSaved) // hydrate once on mount
  const [step, setStep] = useState<number>(saved.step) // 0–2 story, 3–7 questions
  const [answers, setAnswers] = useState<string[]>(saved.answers)
  const [input, setInput] = useState(saved.input)
  const [otherActive, setOtherActive] = useState(saved.otherActive)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Persist step + answers + in-progress typing so a refresh resumes in place
  // with the current field's text intact.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, answers, input, otherActive })
      )
    } catch {
      /* ignore persistence failures (private mode / quota) */
    }
  }, [step, answers, input, otherActive])

  const qi = step - 3 // question index (>= 0 when on a question page)
  const q = qi >= 0 ? FIVE[qi] : null

  function goNext() {
    setStep((v) => Math.min(v + 1, TOTAL - 1))
  }
  function goBack() {
    setInput("")
    setOtherActive(false)
    setStep((v) => Math.max(v - 1, 0))
  }

  // Record an answer for the current question and advance (or finish).
  function commit(value: string) {
    const v = value.trim()
    if (!v) return
    const next = [...answers]
    next[qi] = v
    setAnswers(next)
    setInput("")
    setOtherActive(false)
    if (qi < FIVE.length - 1) setStep(step + 1)
    else {
      // Sector finished — the 5 answers now live in App; clear the local copy.
      clearSaved()
      onComplete(next)
    }
  }

  // Progress tracks the 5 questions only (Q1 → Q5); story pages show none.
  const qProgress = qi >= 0 ? ((qi + 1) / FIVE.length) * 100 : 0

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Soft violet backdrop (adapts to light/dark) */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 40% at 50% -5%, hsl(var(--primary) / 0.10), transparent 70%)",
        }}
      />

      {/* Top bar — back button always; progress bar only during the 5 questions */}
      <header className="relative mx-auto flex w-full max-w-2xl items-center gap-3 px-6 pt-6 lg:pt-10">
        <button
          type="button"
          onClick={goBack}
          aria-label="Kembali"
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all",
            // Hidden on the 3 story pages; only the 5 questions can go back.
            step < 3 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {qi >= 0 && (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${qProgress}%`,
                  background:
                    "linear-gradient(to right, hsl(258 65% 55%), hsl(258 70% 45%))",
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {w.questionOf} {qi + 1} / {FIVE.length}
            </span>
          </>
        )}
      </header>

      {/* Page body — story pages sit up top (image-first); questions center */}
      <div
        className={[
          "relative flex flex-1 overflow-y-auto px-6 py-8",
          step < 3 ? "items-start" : "items-center",
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-2xl">
          {step < 3 ? (
            <StoryPage step={step} w={w} />
          ) : (
            q && (
              <QuestionPage
                q={q}
                lang={lang}
                input={input}
                setInput={setInput}
                otherActive={otherActive}
                setOtherActive={setOtherActive}
                inputRef={inputRef}
                onSelect={commit}
                placeholders={{ age: w.agePlaceholder, text: w.typePlaceholder }}
              />
            )
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="relative mx-auto w-full max-w-2xl px-6 pb-8 pt-2 lg:pb-12">
        <div className="mx-auto max-w-md">
          {step < 3 ? (
            <PrimaryButton onClick={goNext}>
              {step === 2 ? w.start : w.next}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          ) : q && (q.kind === "text" || otherActive) ? (
            <PrimaryButton
              onClick={() => commit(input)}
              disabled={!input.trim()}
            >
              {w.next}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          ) : null}

          {/* Co-parent entry — only on the very first page */}
          {step === 0 && onJoinCode && (
            <button
              type="button"
              onClick={onJoinCode}
              className="mx-auto mt-4 block text-xs font-medium text-primary underline-offset-4 transition-opacity hover:underline"
            >
              {t.join.haveCode}
            </button>
          )}
        </div>
      </footer>
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/*  Story pages (1–3)                                                          */
/* -------------------------------------------------------------------------- */

/** Exported so the pilot onboarding reuses the SAME 3 story pages, not a clone. */
export function StoryPage({
  step,
  w,
}: {
  step: number
  w: ReturnType<typeof useT>["welcome"]
}) {
  const badge = step === 0 ? w.badge : step === 1 ? w.p2Badge : w.p3Badge

  return (
    <div className="animate-fade-up" style={{ animationFillMode: "both" }}>
      {/* Chip sits above the illustration on every story page */}
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: "hsl(var(--primary) / 0.12)",
            color: "hsl(var(--primary))",
          }}
        >
          {badge}
        </span>
      </div>

      <img
        src={INTRO_IMAGES[step]}
        alt=""
        className="w-full select-none rounded-3xl shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
        draggable={false}
      />

      {/* Page 1 — welcome copy below the illustration.
          The closing phrase carries the violet accent the "— Maya" signature
          used to; the signature itself is gone. */}
      {step === 0 && (
        <div className="mt-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
            {w.p1Title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
            {w.p1Body}{" "}
            <span className="font-semibold text-primary">{w.p1Accent}</span>
          </p>
        </div>
      )}

      {/* Page 2 — vision copy, same accent treatment. */}
      {step === 1 && (
        <div className="mt-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
            {w.p2Title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
            {w.p2Body}{" "}
            <span className="font-semibold text-primary">{w.p2Accent}</span>
          </p>
        </div>
      )}

      {/* Page 3 — founding benefits, below the badge illustration */}
      {step === 2 && (
        <div className="mt-6">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {w.benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[i] ?? Star
              return (
                <li
                  key={b.title}
                  className="flex items-start gap-3 rounded-2xl glass p-3.5"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary"
                    style={{ background: "hsl(var(--primary) / 0.12)" }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug">
                      {b.title}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                      {b.desc}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Question pages (4–8)                                                       */
/* -------------------------------------------------------------------------- */

type Q = (typeof QUESTIONS)[number]

function QuestionPage({
  q,
  lang,
  input,
  setInput,
  otherActive,
  setOtherActive,
  inputRef,
  onSelect,
  placeholders,
}: {
  q: Q
  lang: "ms" | "en"
  input: string
  setInput: (v: string) => void
  otherActive: boolean
  setOtherActive: (v: boolean) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (canonical: string) => void
  placeholders: { age: string; text: string }
}) {
  const isTextOnly = q.kind === "text"
  const options = q.options?.[lang] ?? []
  const canonicalOpts = q.options?.ms ?? []

  return (
    <div
      className="mx-auto max-w-lg animate-fade-up"
      style={{ animationFillMode: "both" }}
    >
      <h2 className="text-balance text-center font-display text-xl font-bold leading-snug tracking-tight sm:text-2xl">
        {q.text[lang]}
      </h2>

      <div className="mt-8">
        {/* Free-text (names) — or the revealed "Other" field */}
        {(isTextOnly || otherActive) && (
          <input
            ref={inputRef}
            type="text"
            inputMode={q.kind === "age" ? "numeric" : "text"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder={
              q.kind === "age"
                ? placeholders.age
                : q.placeholder?.[lang] ?? placeholders.text
            }
            className="w-full rounded-2xl border-[1.5px] border-border bg-muted px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:[box-shadow:var(--ring-focus)]"
          />
        )}

        {/* Selection cards */}
        {!isTextOnly && !otherActive && (
          <div className="grid grid-cols-2 gap-2.5">
            {options.map((label, i) => {
              const canonical = canonicalOpts[i]
              const isOther = canonical === OTHER
              return (
                <button
                  key={canonical}
                  type="button"
                  onClick={() => {
                    if (isOther) {
                      setOtherActive(true)
                      setInput("")
                      setTimeout(() => inputRef.current?.focus(), 50)
                    } else {
                      onSelect(canonical)
                    }
                  }}
                  className="group flex items-center justify-between gap-2 rounded-2xl border-[1.5px] border-border bg-card px-4 py-3.5 text-left text-sm font-semibold transition-all hover:border-primary hover:bg-[hsl(var(--primary)/0.06)] active:scale-[0.98]"
                >
                  <span className="min-w-0 truncate">{label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Shared primary button                                                     */
/* -------------------------------------------------------------------------- */

/** Exported so every pilot screen uses the SAME CTA — one button, one look. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-base font-bold text-primary-foreground shadow-glow-cyan transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{ background: "hsl(var(--primary))", letterSpacing: "-0.01em" }}
    >
      {children}
    </button>
  )
}
