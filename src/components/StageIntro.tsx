import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Hand,
  Sparkles,
  X,
} from "lucide-react"
import { useLang, useT } from "@/lib/i18n"
import { STAGES_BY_LANG } from "@/lib/stages"

/* ========================================================================== *
 *  StageIntro — the "Child Communication Stages" educational sector.
 *
 *  Replaces the old "What is Tutur" carousel. One full page per card, advanced
 *  with a Next button (no swipe). The progress bar tracks the 5 stages only —
 *  the intro card and the fork sit outside it:
 *
 *    intro ─▶ [ Tahap 1 ─▶ 2 ─▶ 3 ─▶ 4 ─▶ 5 ] ─▶ fork
 *              └──────── progress bar ───────┘
 *
 *  The fork lets the parent either pick their child's stage themselves (opens a
 *  popup, → jumps straight to the dashboard) or take the 15-question assessment
 *  (→ the profiling chat). Stage copy is shared with ProfilingResults via
 *  @/lib/stages so both screens stay in sync.
 *
 *  Images are graphic-only 16:9 illustrations at /stages/stage-0…5.png. Until
 *  they land, each card falls back to a soft gradient in the stage's hue.
 * ========================================================================== */

const INTRO_HUE = 258 // brand violet for the overview card
const FORK_STEP = 6 // intro(0) · stages(1–5) · fork(6)

/* Local persistence — remember the card the parent last viewed so a refresh
 * resumes there instead of restarting from the intro. */
const STORAGE_KEY = "tutur.stageIntro.v1"

function readStep(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const v = JSON.parse(raw)
      if (typeof v?.step === "number" && v.step >= 0 && v.step <= FORK_STEP) {
        return v.step
      }
    }
  } catch {
    /* corrupt or unavailable — start fresh */
  }
  return 0
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Clears the StageIntro sector's saved card position (used on sign-out). */
export function clearStageIntroProgress() {
  clearSaved()
}

export default function StageIntro({
  onPickStage,
  onTakeQuestions,
}: {
  /** Parent chose their child's stage manually → jump to the dashboard. */
  onPickStage: (stage: number) => void
  /** Parent opted into the 15-question assessment → profiling chat. */
  onTakeQuestions: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const s = t.stageIntro
  const stages = STAGES_BY_LANG[lang]

  const [step, setStep] = useState<number>(readStep) // 0 intro · 1–5 stages · 6 fork
  const [modalOpen, setModalOpen] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  const onFork = step === FORK_STEP
  const onStage = step >= 1 && step <= 5
  const stage = onStage ? stages[step - 1] : null
  const hue = stage?.hue ?? INTRO_HUE
  const progress = onStage ? (step / 5) * 100 : 0 // bar tracks Tahap 1–5 only

  // Persist the current card so a refresh resumes here.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step }))
    } catch {
      /* ignore persistence failures */
    }
  }, [step])

  function goNext() {
    setStep((v) => Math.min(v + 1, FORK_STEP))
  }
  function goBack() {
    setStep((v) => Math.max(v - 1, 0))
  }

  // Leaving the sector (either fork choice) — the saved position is done with.
  function handleTakeQuestions() {
    clearSaved()
    onTakeQuestions()
  }
  function handlePickStage(stageLevel: number) {
    clearSaved()
    onPickStage(stageLevel)
  }

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Accent backdrop — tinted to the current card's hue */}
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-700"
        aria-hidden
        style={{
          background: `radial-gradient(55% 40% at 50% -5%, hsl(${hue} 70% 55% / 0.12), transparent 70%)`,
        }}
      />

      {/* Top bar — back button + (stages only) progress bar */}
      <header className="relative mx-auto flex w-full max-w-2xl items-center gap-3 px-6 pt-6 lg:pt-10">
        <button
          type="button"
          onClick={goBack}
          aria-label={s.back}
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all",
            step === 0 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {onStage ? (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(to right, hsl(${hue} 65% 55%), hsl(${hue} 70% 45%))`,
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {s.stageWord} {step} / 5
            </span>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </header>

      {/* Body */}
      <div className="relative flex flex-1 items-start overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-2xl">
          {onFork ? (
            <ForkPage
              s={s}
              onOpenManual={() => setModalOpen(true)}
              onTakeQuestions={handleTakeQuestions}
            />
          ) : step === 0 ? (
            <CardShell
              badge={s.badgeIntro}
              hue={INTRO_HUE}
              img="/stages/stage-0.png"
              title={s.introTitle}
              body={s.introBody}
            />
          ) : (
            stage && (
              <CardShell
                badge={`${s.stageWord} ${stage.level}`}
                hue={stage.hue}
                img={`/stages/stage-${stage.level}.png`}
                title={stage.name}
                age={stage.age}
                body={stage.desc}
              />
            )
          )}
        </div>
      </div>

      {/* Footer CTA — Next on the cards; the fork's actions live in its cards */}
      <footer className="relative mx-auto w-full max-w-2xl px-6 pb-8 pt-2 lg:pb-12">
        <div className="mx-auto max-w-md">
          {!onFork && (
            <PrimaryButton hue={hue} onClick={goNext}>
              {s.next}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
        </div>
      </footer>

      {/* Manual stage picker — a centered popup, so there's nothing to scroll to */}
      {modalOpen && (
        <StagePickerModal
          s={s}
          stages={stages}
          picked={picked}
          onPick={setPicked}
          closeLabel={t.common.close}
          onClose={() => {
            setModalOpen(false)
            setPicked(null)
          }}
          onConfirm={() => picked && handlePickStage(picked)}
        />
      )}
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/*  Card (intro + each stage)                                                  */
/* -------------------------------------------------------------------------- */

function CardShell({
  badge,
  hue,
  img,
  title,
  age,
  body,
}: {
  badge: string
  hue: number
  img: string
  title: string
  age?: string
  body: string
}) {
  return (
    <div key={img} className="animate-fade-up" style={{ animationFillMode: "both" }}>
      {/* Accent chip */}
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: `hsl(${hue} 70% 55% / 0.14)`,
            color: `hsl(${hue} 60% 40%)`,
          }}
        >
          {badge}
        </span>
      </div>

      <StageImage src={img} hue={hue} />

      <div className="mt-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          {title}
        </h1>
        {age && (
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: `hsl(${hue} 70% 55% / 0.15)`,
              color: `hsl(${hue} 60% 40%)`,
            }}
          >
            {age}
          </span>
        )}
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
          {body}
        </p>
      </div>
    </div>
  )
}

/** 16:9 illustration with a hue-tinted gradient fallback (before art lands). */
function StageImage({ src, hue }: { src: string; hue: number }) {
  const [ok, setOk] = useState(true)
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 65% 60% / 0.22), hsl(${hue} 70% 45% / 0.30))`,
        boxShadow: `0 16px 40px -16px hsl(${hue} 60% 45% / 0.40)`,
      }}
    >
      {ok ? (
        <img
          src={src}
          alt=""
          onError={() => setOk(false)}
          className="h-full w-full select-none object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Sparkles
            className="h-10 w-10"
            style={{ color: `hsl(${hue} 60% 50% / 0.5)` }}
          />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Fork — pick a stage manually, or take the 15-question assessment           */
/* -------------------------------------------------------------------------- */

function ForkPage({
  s,
  onOpenManual,
  onTakeQuestions,
}: {
  s: ReturnType<typeof useT>["stageIntro"]
  onOpenManual: () => void
  onTakeQuestions: () => void
}) {
  return (
    <div className="animate-fade-up" style={{ animationFillMode: "both" }}>
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: "hsl(var(--primary) / 0.12)",
            color: "hsl(var(--primary))",
          }}
        >
          {s.forkBadge}
        </span>
      </div>

      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          {s.forkTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
          {s.forkBody}
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-md gap-3">
        {/* Option A — take the 15-question assessment (recommended) */}
        <button
          type="button"
          onClick={onTakeQuestions}
          className="group flex items-start gap-3.5 rounded-2xl border-[1.5px] border-primary/40 bg-[hsl(var(--primary)/0.06)] p-4 text-left transition-all hover:border-primary hover:shadow-glow-cyan active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary"
            style={{ background: "hsl(var(--primary) / 0.14)" }}
          >
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-display text-[15px] font-bold">
                {s.quizTitle}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: "hsl(var(--primary) / 0.16)",
                  color: "hsl(var(--primary))",
                }}
              >
                {s.recommended}
              </span>
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {s.quizDesc}
            </span>
          </span>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>

        {/* Option B — pick a stage manually (opens the popup) */}
        <button
          type="button"
          onClick={onOpenManual}
          className="group flex items-start gap-3.5 rounded-2xl border-[1.5px] border-border bg-card p-4 text-left transition-all hover:border-primary/50 active:scale-[0.99]"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary"
            style={{ background: "hsl(var(--primary) / 0.10)" }}
          >
            <Hand className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[15px] font-bold">
              {s.knowTitle}
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
              {s.knowDesc}
            </span>
          </span>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Manual stage picker — centered popup                                       */
/* -------------------------------------------------------------------------- */

function StagePickerModal({
  s,
  stages,
  picked,
  onPick,
  onClose,
  onConfirm,
  closeLabel,
}: {
  s: ReturnType<typeof useT>["stageIntro"]
  stages: (typeof STAGES_BY_LANG)["ms"]
  picked: number | null
  onPick: (stage: number) => void
  onClose: () => void
  onConfirm: () => void
  closeLabel: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Backdrop */}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm animate-fade-up rounded-3xl glass-strong p-5 shadow-2xl"
        style={{ animationFillMode: "both" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold tracking-tight">
            {s.choosePrompt}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          {stages.map((st) => {
            const active = picked === st.level
            return (
              <button
                key={st.level}
                type="button"
                onClick={() => onPick(st.level)}
                aria-pressed={active}
                className={[
                  "flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left transition-all active:scale-[0.99]",
                  active
                    ? "border-transparent"
                    : "border-border bg-card hover:border-primary/40",
                ].join(" ")}
                style={
                  active
                    ? {
                        background: `hsl(${st.hue} 70% 55% / 0.12)`,
                        boxShadow: `inset 0 0 0 1.5px hsl(${st.hue} 60% 55% / 0.6)`,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{
                    background: `hsl(${st.hue} 70% 55% / 0.15)`,
                    color: `hsl(${st.hue} 60% 40%)`,
                  }}
                >
                  {st.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {s.stageWord} {st.level} — {st.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {st.age}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          <PrimaryButton
            hue={picked ? stages[picked - 1].hue : INTRO_HUE}
            onClick={onConfirm}
            disabled={!picked}
          >
            {s.confirm}
            <ArrowRight className="h-5 w-5" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Shared primary button (hue-tinted)                                         */
/* -------------------------------------------------------------------------- */

function PrimaryButton({
  children,
  onClick,
  disabled,
  hue,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  hue: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-base font-bold text-primary-foreground shadow-glow-cyan transition-transform active:scale-[0.98] disabled:opacity-50"
      style={{ background: `hsl(${hue} 70% 48%)`, letterSpacing: "-0.01em" }}
    >
      {children}
    </button>
  )
}
