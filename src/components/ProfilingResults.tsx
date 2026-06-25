import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Check, Radar, Sparkles } from "lucide-react"

/* ========================================================================== *
 *  ProfilingResults
 *  Bridges Page 3 (AI Profiling chat) → Page 4 (Dashboard).
 *
 *  Pipeline:
 *    answers[16] ─▶ scoring engine ─▶ 3s analysis animation ─▶ reveal card
 *                                                            ─▶ stage explorer
 *                                                            ─▶ "Ke Papan Pemuka"
 *
 *  answers[0]      = Age (Question 1)
 *  answers[1..4]   = Demographics (child name, parent name, relationship, age)
 *  answers[5..19]  = 15 assessment questions (Questions 6–20)
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/*  Scoring engine                                                            */
/* -------------------------------------------------------------------------- */

// Likert → markah. Order matters: test "sangat kerap" before "kerap".
function answerToScore(raw: string): number {
  const t = raw.toLowerCase()
  if (t.includes("sangat kerap")) return 3
  if (t.includes("kerap")) return 2
  if (t.includes("kadang")) return 1
  if (t.includes("tidak pernah")) return 0
  return 0
}

// Normalise the free-form age answer ("2 tahun", "8 bulan", "1 tahun 6 bulan",
// or a bare number) into months. Returns a large sentinel when unparseable so
// the age cap (Rule 3) never misfires on noise.
function parseAgeMonths(raw: string): number {
  const lower = (raw ?? "").toLowerCase()
  const tahun = lower.match(/(\d+(?:\.\d+)?)\s*tahun/)
  const bulan = lower.match(/(\d+)\s*bulan/)

  if (tahun || bulan) {
    return (tahun ? parseFloat(tahun[1]) * 12 : 0) + (bulan ? parseInt(bulan[1], 10) : 0)
  }

  const bare = parseFloat(lower.replace(/[^\d.]/g, ""))
  return isNaN(bare) ? 999 : bare * 12 // bare number assumed to be years
}

type ResultReason = "empty" | "inconsistent" | "ageCapped" | "normal"

interface ProfilingResult {
  /** Final calculated stage, 1–5. */
  stage: number
  /** Which guardrail (if any) shaped the final placement. */
  reason: ResultReason
  /** Per-stage cluster scores (max 9 each) — handy for debugging/telemetry. */
  stageScores: number[]
}

const MASTERY_THRESHOLD = 5

/**
 * Weighted multi-tier scoring with four sequential guardrails.
 * Pure function — no React, fully unit-testable.
 */
function computeResult(answers: string[]): ProfilingResult {
  const age = parseAgeMonths(answers[0] ?? "")
  // Questions 6–20 (array indices 5–19) are the 15 clinical assessment items.
  const assessment = answers.slice(5, 20).map(answerToScore) // 15 scores, 0–3

  // 3 questions per stage → 5 clusters, each capped at 9 points.
  const stageScores = [0, 1, 2, 3, 4].map((s) =>
    assessment.slice(s * 3, s * 3 + 3).reduce((sum, v) => sum + v, 0)
  )

  /* ---- Rule 1: Kosong Keseluruhan (all 15 answers "Tidak Pernah") -------- */
  const allZero = assessment.length === 15 && assessment.every((v) => v === 0)
  if (allZero) {
    return { stage: 1, reason: "empty", stageScores }
  }

  /* ---- Rule 2: Strict Sequential & Borderline check --------------------- */
  // Walk stages from Tahap 1; halt at the first cluster below mastery.
  let mastered = 0
  for (let s = 0; s < stageScores.length; s++) {
    if (stageScores[s] >= MASTERY_THRESHOLD) mastered++
    else break
  }
  const sequentialStage = Math.max(1, mastered) // floor at Tahap 1

  // "Lompatan tidak logik": a later, discarded cluster still hit mastery.
  const inconsistentSkip = stageScores
    .slice(mastered + 1)
    .some((score) => score >= MASTERY_THRESHOLD)

  /* ---- Rule 3: Age-Score Cap (Bayi Super) ------------------------------- */
  let finalStage = sequentialStage
  let ageCapped = false
  if (age < 12 && finalStage > 2) {
    finalStage = 2
    ageCapped = true
  } else if (age < 36 && finalStage > 3) {
    finalStage = 3
    ageCapped = true
  }

  /* ---- Rule 4: Resolve which message wins (most-final override) ---------- */
  const reason: ResultReason = ageCapped
    ? "ageCapped"
    : inconsistentSkip
      ? "inconsistent"
      : "normal"

  return { stage: finalStage, reason, stageScores }
}

const OVERRIDE_MESSAGE: Record<Exclude<ResultReason, "normal">, string> = {
  empty:
    "Setiap anak bermula dari langkah pertama. Kami telah menyusun profil Tahap 1 khusus untuk merangsang komunikasi awal anak anda. Mari kita mulakan perjalanan ini bersama-sama!",
  inconsistent:
    "Kami dapati ada sedikit percanggahan pada jawapan anda. Untuk memastikan asas komunikasinya benar-benar kukuh, kami akan mulakan perjalanan Tutur dari fasa ini.",
  ageCapped:
    "Wah, nampaknya anak anda sangat aktif! Untuk memastikan asas komunikasinya benar-benar kukuh, kami akan mulakan perjalanan Tutur dari had maksimum umur mereka.",
}

/* -------------------------------------------------------------------------- */
/*  Stage content (Educational Explorer)                                      */
/* -------------------------------------------------------------------------- */

interface Stage {
  level: number
  name: string
  age: string
  desc: string
  hue: number // base neon hue for this stage's glow
}

const STAGES: Stage[] = [
  {
    level: 1,
    name: "Peneroka",
    age: "6+ Bulan",
    desc: "Anak mula memberi respons kepada bunyi dan ekspresi wajah. Walau bagaimanapun, mereka belum berkomunikasi secara sengaja atau mempunyai maksud tertentu.",
    hue: 187,
  },
  {
    level: 2,
    name: "Isyarat",
    age: "10+ Bulan",
    desc: "Anak mula berkomunikasi menggunakan bahasa badan, isyarat tangan, bunyi, dan hubungan mata (eye gaze). Perkataan yang konsisten belum bermula lagi.",
    hue: 210,
  },
  {
    level: 3,
    name: "Perkataan",
    age: "1+ Tahun",
    desc: "Anak sudah mula menggunakan perkataan tunggal dan gabungan awal dua perkataan. Mereka juga sudah pandai menamakan objek di sekeliling mereka.",
    hue: 270,
  },
  {
    level: 4,
    name: "Ayat",
    age: "3+ Tahun",
    desc: 'Anak mampu membina ayat pendek yang mengandungi 3 hingga 4 perkataan. Mereka juga boleh menjawab soalan mudah seperti "apa", "di mana", dan "siapa".',
    hue: 300,
  },
  {
    level: 5,
    name: "Cerita",
    age: "5+ Tahun",
    desc: "Anak boleh menggunakan ayat yang panjang dan kompleks, bercerita secara tersusun mengikut urutan, serta mampu meluahkan emosi dan perasaan mereka.",
    hue: 330,
  },
]

const ANALYSIS_LOGS = [
  "Menilai maklum balas...",
  "Memetakan data perkembangan...",
  "Menjana profil peribadi Maya...",
]

const ANALYSIS_DURATION = 3000 // exactly 3 seconds, per spec
const SWIPE_THRESHOLD = 48

/* -------------------------------------------------------------------------- */
/*  Phase 1 — High-Tech Analysis animation                                    */
/* -------------------------------------------------------------------------- */

function AnalysisScreen() {
  // Reveal the log lines one after another across the 3s window.
  const [logStep, setLogStep] = useState(1)

  useEffect(() => {
    const id = setInterval(
      () => setLogStep((s) => Math.min(s + 1, ANALYSIS_LOGS.length)),
      ANALYSIS_DURATION / ANALYSIS_LOGS.length
    )
    return () => clearInterval(id)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      {/* Holographic radar */}
      <div className="relative mb-10 flex h-40 w-40 items-center justify-center">
        {/* concentric pulse rings */}
        <div className="absolute inset-0 animate-pulse-glow rounded-full border border-primary/20" />
        <div className="absolute inset-4 rounded-full border border-primary/15" />
        <div className="absolute inset-8 rounded-full border border-primary/10" />

        {/* sweeping radar beam */}
        <div
          className="absolute inset-0 animate-[spin_1.8s_linear_infinite] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, hsl(187 100% 50% / 0.45) 60deg, transparent 120deg)",
          }}
        />
        {/* counter-rotating accent ring */}
        <div className="absolute inset-2 animate-[spin_3s_linear_infinite_reverse] rounded-full border-2 border-transparent border-t-secondary/70 border-r-primary/50" />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-full glass-strong shadow-glow-cyan">
          <Radar className="h-9 w-9 animate-pulse text-primary" />
        </div>
      </div>

      <div className="shimmer-overlay rounded-full px-2">
        <h2 className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-xl font-bold tracking-tight text-transparent">
          Maya sedang menganalisis…
        </h2>
      </div>

      {/* Rapid text logs */}
      <div className="mt-7 w-full max-w-xs space-y-2.5 text-left">
        {ANALYSIS_LOGS.map((log, i) => {
          const visible = i < logStep
          return (
            <div
              key={log}
              className={cn(
                "flex items-center gap-2.5 rounded-xl glass px-3.5 py-2.5 text-sm transition-all duration-500",
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" strokeWidth={3} />
              </span>
              <span className="font-mono text-foreground/80">{log}</span>
            </div>
          )
        })}
      </div>
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProfilingResults({
  answers,
  onComplete,
}: {
  answers: string[]
  onComplete: (stage: number) => void
}) {
  // Engine runs once; the reveal is gated behind the 3s animation.
  const result = useMemo(() => computeResult(answers), [answers])
  const resultStage = STAGES[result.stage - 1]
  const message =
    result.reason === "normal" ? null : OVERRIDE_MESSAGE[result.reason]

  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), ANALYSIS_DURATION)
    return () => clearTimeout(id)
  }, [])

  /* ---- Stage Explorer carousel — opens focused on the child's level ---- */
  const [slide, setSlide] = useState(result.stage - 1)
  const touchStartX = useRef<number | null>(null)

  function goTo(next: number) {
    setSlide(Math.max(0, Math.min(STAGES.length - 1, next)))
  }
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(slide + (delta < 0 ? 1 : -1))
    touchStartX.current = null
  }

  /* ----------------------------- Phase 1 ----------------------------- */
  if (!revealed) return <AnalysisScreen />

  /* -------------------------- Phase 2 + 3 ---------------------------- */
  const hue = resultStage.hue

  return (
    <main className="flex min-h-screen flex-col px-6 pb-10 pt-12">
      {/* ---- Phase 2: Final Reveal Card ---- */}
      <section
        className="animate-fade-up text-center"
        style={{ animationFillMode: "both" }}
      >
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Tahap Komunikasi Anak Anda
        </p>

        {/* Level badge with neon backdrop glow */}
        <div className="relative mx-auto mt-6 w-fit">
          <div
            className="absolute -inset-6 rounded-full blur-2xl"
            style={{ background: `hsl(${hue} 100% 55% / 0.28)` }}
            aria-hidden
          />
          <div
            className="relative flex flex-col items-center gap-2 rounded-3xl glass-strong px-8 py-6"
            style={{
              boxShadow: `0 0 50px -12px hsl(${hue} 100% 55% / 0.6)`,
              borderColor: `hsl(${hue} 100% 60% / 0.35)`,
            }}
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold"
              style={{
                background: `hsl(${hue} 100% 55% / 0.15)`,
                color: `hsl(${hue} 100% 75%)`,
                boxShadow: `inset 0 0 20px -6px hsl(${hue} 100% 60% / 0.7)`,
              }}
            >
              {result.stage}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              Tahap {result.stage} —{" "}
              <span style={{ color: `hsl(${hue} 100% 78%)` }}>
                {resultStage.name}
              </span>
            </h1>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: `hsl(${hue} 100% 55% / 0.15)`,
                color: `hsl(${hue} 100% 82%)`,
              }}
            >
              {resultStage.age}
            </span>
          </div>
        </div>

        {/* Override message (only when a guardrail reshaped placement) */}
        {message && (
          <div
            className="mx-auto mt-6 max-w-md animate-fade-in rounded-2xl glass border-l-2 p-4 text-left"
            style={{ borderLeftColor: `hsl(${hue} 100% 60% / 0.7)` }}
          >
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Nota daripada Maya
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              {message}
            </p>
          </div>
        )}
      </section>

      {/* ---- Phase 3: Educational Stage Explorer ---- */}
      <section className="mt-9 flex-1">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold tracking-tight text-foreground/90">
            Terokai Setiap Tahap
          </h2>
          <span className="text-xs text-muted-foreground">
            Leret untuk lihat →
          </span>
        </div>

        <div
          className="overflow-hidden rounded-3xl"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {STAGES.map((s) => {
              const isChildLevel = s.level === result.stage
              return (
                <div key={s.level} className="w-full shrink-0 px-1">
                  <article
                    className={cn(
                      "flex min-h-[15rem] flex-col rounded-3xl p-6 text-left transition-all duration-300",
                      isChildLevel
                        ? "glass-strong ring-1"
                        : "glass opacity-90"
                    )}
                    style={
                      isChildLevel
                        ? {
                            boxShadow: `0 0 44px -14px hsl(${s.hue} 100% 55% / 0.65)`,
                            // ring colour via outline-ish border
                            borderColor: `hsl(${s.hue} 100% 60% / 0.4)`,
                          }
                        : undefined
                    }
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold"
                        style={{
                          background: `hsl(${s.hue} 100% 55% / 0.15)`,
                          color: `hsl(${s.hue} 100% 76%)`,
                        }}
                      >
                        {s.level}
                      </span>
                      {isChildLevel && (
                        <span
                          className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background: `hsl(${s.hue} 100% 55% / 0.18)`,
                            color: `hsl(${s.hue} 100% 80%)`,
                          }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Tahap Anak Anda
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold tracking-tight">
                      Tahap {s.level} — {s.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {s.age}
                    </p>
                    <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {s.desc}
                    </p>
                  </article>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {STAGES.map((s, i) => {
            const active = i === slide
            const isChildLevel = s.level === result.stage
            return (
              <button
                key={s.level}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Lihat Tahap ${s.level}`}
                aria-current={active}
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  active ? "w-6" : "w-2",
                  !active && isChildLevel && "ring-1 ring-primary/50"
                )}
                style={{
                  background: active
                    ? `hsl(${s.hue} 100% 60%)`
                    : "hsl(0 0% 100% / 0.2)",
                  boxShadow: active
                    ? `0 0 12px hsl(${s.hue} 100% 60% / 0.7)`
                    : undefined,
                }}
              />
            )
          })}
        </div>
      </section>

      {/* ---- Gateway CTA ---- */}
      <div className="mt-8">
        <Button
          size="lg"
          onClick={() => onComplete(result.stage)}
          className="shimmer-overlay group w-full animate-pulse-glow rounded-2xl text-base font-semibold"
        >
          Ke Papan Pemuka
          <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </main>
  )
}
