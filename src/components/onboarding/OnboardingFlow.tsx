/* ========================================================================== *
 *  PHASE A · Onboarding — Maya intro → 3 story pages → A2–A14.
 *
 *  DESIGN: this deliberately reuses the LIVE app's onboarding grammar, not a new
 *  one. `StoryPage` and `PrimaryButton` are imported from @/components/Welcome
 *  (not copied), and the question pages mirror Welcome's option cards, inputs,
 *  progress bar and backdrop. If Welcome's look changes, this follows.
 *
 *  Rules from the Maya screen scripts v2, enforced here rather than per-screen:
 *    · ONE question per screen
 *    · max 5 choices; a catch-all is always last, labelled "Lain-lain", and
 *      picking it reveals a REQUIRED text box
 *    · the 3-point screening scale gets NO "Lain-lain" — it must stay closed,
 *      or the flag rule becomes uncomputable
 *    · A3 = "Bawah 12 bulan" → A11 is skipped entirely (spec §5.2)
 *
 *  Target ≤ 3 min. Choice screens auto-advance on tap — no "Next" button —
 *  because 12 screens × one extra tap is a minute of pure friction.
 *
 *  NOT BUILT: the CONSENT screen (4 toggles) belongs between A13 and A14. Its
 *  copy needs Legal (spec §8 item 7); shipping placeholder consent language
 *  would be worse than leaving the hole visible.
 * ========================================================================== */

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

import { PrimaryButton, StoryPage } from "@/components/Welcome"
import { useT } from "@/lib/i18n"
import { APP_HEIGHT, useViewportHeight } from "@/lib/useViewportHeight"
import {
  type Draft,
  type DraftAnswers,
  type DraftIdentity,
} from "@/lib/onboardingDraft"
import {
  asksVokalisasi,
  resultVariant,
  screeningFlags,
  SCREENING_LABELS,
  type ChildAgeBucket,
  type Diagnosis,
  type ParentAgeBucket,
  type Relationship,
  type ResultVariant,
  type ScreeningAnswer,
  type ScreeningInput,
} from "@/lib/screening"

/** Everything onboarding produces. Only `anak` + `panggilan` reach the activity. */
export interface OnboardingResult {
  /** {anak} — used in every script line and every tracker question. */
  anak: string
  childAge: ChildAgeBucket
  childAgeOther?: string
  /** The account holder — the parent who logs in and runs this with their child. */
  parentName: string
  /** {panggilan} — "Ibu letak tiga mainan". */
  panggilan: string
  relationship: Relationship
  parentAge: ParentAgeBucket
  screening: ScreeningInput
  diagnosisOther?: string
  flags: string[]
  variant: ResultVariant
  /** A14 — the Day-0 baseline, compared at D7 and D14. */
  confidenceD0: number
}

/**
 * Story pages: TWO, not three. The founding-benefits page (story2) is retired
 * from onboarding — it's a pitch, and it sat between the parent and the thing
 * they came to do. The legacy Welcome component still renders it; nothing routes
 * there.
 */
type Step =
  | "maya" | "story0" | "story1"
  | "A2" | "A3" | "A4" | "A5" | "A6"
  | "slt"
  | "A7" | "A8" | "A9" | "A10" | "A11" | "A12" | "A13" | "A14"

/**
 * The questionnaire is TWO parts, not one undifferentiated run of 11.
 *
 * They ask fundamentally different things, and the parent can feel it: part 1 is
 * admin ("what's your child called?"), part 2 is clinical and can be frightening
 * ("does your child make eye contact?"). Running them together made the counter
 * read "Soalan 7 / 12" while quietly folding in A14 — a question that doesn't
 * even appear until after the result screen. Hence the earlier 11-vs-12 confusion.
 *
 * Splitting them also earns the right to ask part 2: the SLT credibility screen
 * sits between, so the clinical questions arrive with a reason attached.
 */
const PART1: Step[] = ["A2", "A3", "A4", "A5", "A6"]        // about you and your child
const PART2: Step[] = ["A7", "A8", "A9", "A10", "A11", "A12"] // soalan ringkas tentang {anak}

const SCREENING_OPTS = (["kerap", "kadang", "jarang"] as ScreeningAnswer[]).map((v) => ({
  value: v,
  label: SCREENING_LABELS[v],
}))

/**
 * A step we're willing to resume onto. The Maya intro and story pages are cheap
 * to re-see, so they're excluded — but `slt` is included: it marks "part 1 done",
 * and dropping someone back to the beginning after they've answered five
 * questions is exactly the drop-off we're trying to avoid.
 */
function resumableStep(s: string | undefined): Step | null {
  const known: Step[] = [
    "A2", "A3", "A4", "A5", "A6",
    "slt",
    "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14",
  ]
  return known.includes(s as Step) ? (s as Step) : null
}

export function OnboardingFlow({
  onDone,
  saving = false,
  error = null,
  initial,
  onProgress,
}: {
  onDone: (r: OnboardingResult) => void
  /** A write is in flight — the final CTA locks so it can't create two children. */
  saving?: boolean
  /** The write failed. We stay on A14 and let them retry; nothing is lost. */
  error?: string | null
  /** A draft from a previous, interrupted attempt. Hydrates state on mount. */
  initial?: Draft | null
  /**
   * Called once per ANSWERED SCREEN (not per keystroke) so the draft can be
   * persisted server-side. Fire-and-forget — a failed draft write must never
   * block the parent mid-questionnaire.
   */
  onProgress?: (step: string, answers: DraftAnswers, identity: DraftIdentity) => void
}) {
  const t = useT()
  const w = t.welcome

  // Publishes the REAL usable height (keyboard-aware) as --app-h. Onboarding is
  // the one flow that must never scroll, so it owns this.
  useViewportHeight()

  const a = initial?.answers
  const id = initial?.identity

  // Resume where they left off. A fresh start lands on the Maya intro.
  const [step, setStep] = useState<Step>(() => resumableStep(initial?.step) ?? "maya")

  const [anak, setAnak] = useState(id?.anak ?? "")
  const [childAge, setChildAge] = useState<ChildAgeBucket | null>(a?.childAge ?? null)
  const [childAgeOther, setChildAgeOther] = useState(id?.childAgeOther ?? "")
  const [parentName, setParentName] = useState(id?.parentName ?? "")
  const [relationship, setRelationship] = useState<Relationship | null>(
    a?.relationship ?? null
  )
  const [panggilanOther, setPanggilanOther] = useState(id?.panggilanOther ?? "")
  const [parentAge, setParentAge] = useState<ParentAgeBucket | null>(a?.parentAge ?? null)
  const [parentAgeOther, setParentAgeOther] = useState(id?.parentAgeOther ?? "")

  const [q1, setQ1] = useState<ScreeningAnswer | null>(a?.q1 ?? null)
  const [q2, setQ2] = useState<ScreeningAnswer | null>(a?.q2 ?? null)
  const [q3, setQ3] = useState<ScreeningAnswer | null>(a?.q3 ?? null)
  const [q4, setQ4] = useState<ScreeningAnswer | null>(a?.q4 ?? null)
  const [q5, setQ5] = useState<ScreeningAnswer | null>(a?.q5 ?? null)
  const [q6, setQ6] = useState<Diagnosis | null>(a?.q6 ?? null)
  const [diagnosisOther, setDiagnosisOther] = useState(id?.diagnosisOther ?? "")
  const [confidence, setConfidence] = useState<number | null>(a?.confidence ?? null)

  const name = anak.trim() || "anak anda"

  /**
   * A3 age gate: under 12 months, A11 (vokalisasi) is never asked (spec §5.2).
   * Delegated to `asksVokalisasi` so the rule lives in exactly one place — if the
   * age buckets ever change, this screen doesn't silently keep the old boundary.
   */
  const skipA11 = childAge !== null && !asksVokalisasi(childAge)

  const ORDER: Step[] = [
    "maya", "story0", "story1",
    ...PART1,
    "slt", // why these next questions are worth answering
    "A7", "A8", "A9", "A10",
    ...(skipA11 ? [] : (["A11"] as Step[])),
    "A12", "A13", "A14",
  ]

  const idx = ORDER.indexOf(step)
  const go = (d: 1 | -1) => {
    const next = ORDER[idx + d]
    if (next) setStep(next)
  }

  // The two parts are an INTERNAL structure — the parent must never see them.
  // Each part counts from 1, so the first run reads "Soalan 1/5" and never hints
  // that six more are queued behind it. Part 2 shrinks to 5 when the child is
  // under 12 months and A11 is skipped, so the total is computed, never hardcoded.
  const part2 = PART2.filter((s) => !(skipA11 && s === "A11"))
  const progress: { label: string; n: number; total: number } | null =
    PART1.includes(step)
      ? { label: w.questionOf, n: PART1.indexOf(step) + 1, total: PART1.length }
      : part2.includes(step)
        ? { label: w.questionOf, n: part2.indexOf(step) + 1, total: part2.length }
        : step === "A14"
          ? { label: "Soalan terakhir", n: 1, total: 1 }
          : null

  /**
   * Persist the draft once per SCREEN — keyed on `step`, not on every field.
   *
   * By the time `step` changes, the answer for the screen we just left is
   * already in state, so this captures it exactly once. Keying on the answers
   * instead would fire on every keystroke of the nickname field.
   *
   * Story pages and the Maya intro carry no answers, so they're skipped: a
   * refresh there is a 5-second loss, not worth a round-trip.
   */
  useEffect(() => {
    if (!onProgress) return
    if (step === "maya" || step.startsWith("story")) return

    onProgress(
      step,
      {
        childAge: childAge ?? undefined,
        relationship: relationship ?? undefined,
        parentAge: parentAge ?? undefined,
        q1: q1 ?? undefined,
        q2: q2 ?? undefined,
        q3: q3 ?? undefined,
        q4: q4 ?? undefined,
        q5: q5 ?? undefined,
        q6: q6 ?? undefined,
        confidence: confidence ?? undefined,
      },
      {
        anak: anak.trim() || undefined,
        parentName: parentName.trim() || undefined,
        childAgeOther: childAgeOther.trim() || undefined,
        panggilanOther: panggilanOther.trim() || undefined,
        parentAgeOther: parentAgeOther.trim() || undefined,
        diagnosisOther: diagnosisOther.trim() || undefined,
      }
    )
    // `step` is the only trigger, by design — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function finish() {
    const screening: ScreeningInput = {
      q1: q1!, q2: q2!, q3: q3!, q4: q4!,
      // Under 12 months q5 is genuinely ABSENT, not "unanswered". null preserves
      // that, so analysis can't mistake an age-gate skip for a data gap.
      q5: skipA11 ? null : q5,
      q6: q6!,
    }
    onDone({
      anak: anak.trim(),
      childAge: childAge!,
      childAgeOther: childAge === "lain" ? childAgeOther.trim() : undefined,
      parentName: parentName.trim(),
      panggilan:
        relationship === "lain"
          ? panggilanOther.trim() || "Ibu"
          : ({ ibu: "Ibu", ayah: "Ayah", nenek: "Nenek", datuk: "Datuk" } as const)[
              relationship!
            ],
      relationship: relationship!,
      parentAge: parentAge!,
      screening,
      diagnosisOther: q6 === "lain" ? diagnosisOther.trim() : undefined,
      flags: screeningFlags(screening),
      variant: resultVariant(screening),
      confidenceD0: confidence!,
    })
  }

  const isStory = step.startsWith("story")
  const storyStep = isStory ? Number(step.slice(5)) : 0

  /**
   * Question screens use a fixed-height, three-band layout (Maya + question at
   * the top, answers pinned to the bottom) rather than a centred block. `progress`
   * is non-null on exactly those screens, so it doubles as the switch.
   */
  const isQuestion = progress !== null

  /** Screens that actually render a footer CTA. The rest auto-advance on tap. */
  const hasFooterCta =
    step === "maya" || isStory || step === "slt" || step === "A13" || step === "A14"

  return (
    <main
      // Sized off --app-h (see useViewportHeight): the real, keyboard-aware
      // viewport height. NOT 100vh — that measures the screen as if the browser
      // chrome were hidden, which is precisely what pushes a CTA out of reach.
      //
      // overflow-hidden is deliberate: nothing in onboarding may scroll. The
      // bands inside shrink to fit instead.
      className="relative flex flex-col overflow-hidden"
      style={{ height: APP_HEIGHT, background: "hsl(var(--background))" }}
    >
      {/* Same soft violet backdrop as Welcome */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 40% at 50% -5%, hsl(var(--primary) / 0.10), transparent 70%)",
        }}
      />

      <header className="relative mx-auto flex w-full max-w-2xl items-center gap-3 px-6 pt-6 lg:pt-10">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Kembali"
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all",
            idx === 0 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {progress && (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(progress.n / progress.total) * 100}%`,
                  background:
                    "linear-gradient(to right, hsl(258 65% 55%), hsl(258 70% 45%))",
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {progress.total > 1
                ? `${progress.label} ${progress.n} / ${progress.total}`
                : progress.label}
            </span>
          </>
        )}
      </header>

      <div
        className={[
          "relative flex min-h-0 flex-1 px-6",
          isQuestion
            ? // Question screens: stretch to fill, never scroll. The shell inside
              // handles the top/bottom split.
              "items-stretch py-4"
            : // Everything else keeps the old behaviour: image-first pages are
              // top-aligned like Welcome 2, the rest centre, and both may scroll.
              [
                "overflow-y-auto py-8",
                isStory || step === "slt" ? "items-start" : "items-center",
              ].join(" "),
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto w-full max-w-2xl",
            isQuestion && "flex h-full flex-col",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {step === "maya" && <MayaIntro />}
          {isStory && <StoryPage step={storyStep} w={w} />}

          {step === "A2" && (
            <TextQuestion
              question="Sebelum kita mula — siapa nama panggilan anak anda?"
              placeholder="cth: Adam"
              value={anak}
              onChange={setAnak}
              onSubmit={() => go(1)}
            />
          )}

          {step === "A3" && (
            <ChoiceQuestion
              question={`Berapa umur ${name} sekarang?`}
              cols={2}
              value={childAge}
              options={[
                { value: "bawah_12m", label: "Bawah 12 bulan" },
                { value: "1_2", label: "1 – 2 tahun" },
                { value: "2_3", label: "2 – 3 tahun" },
                { value: "3_4", label: "3 – 4 tahun" },
                { value: "lain", label: "Lain-lain" },
              ]}
              otherValue={childAgeOther}
              otherPlaceholder={`Nyatakan umur ${name}`}
              onOtherChange={setChildAgeOther}
              onPick={(v) => {
                setChildAge(v as ChildAgeBucket)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "A4" && (
            <TextQuestion
              question="Dan anda? Apa nama anda?"
              placeholder="cth: Siti"
              answerHint="Ini akaun anda — ibu bapa yang guna Tutur bersama anak."
              value={parentName}
              onChange={setParentName}
              onSubmit={() => go(1)}
            />
          )}

          {step === "A5" && (
            <ChoiceQuestion
              question={`Apa hubungan anda dengan ${name}?`}
              cols={2}
              value={relationship}
              options={[
                { value: "ibu", label: "Ibu" },
                { value: "ayah", label: "Ayah" },
                { value: "nenek", label: "Nenek" },
                { value: "datuk", label: "Datuk" },
                { value: "lain", label: "Lain-lain" },
              ]}
              otherValue={panggilanOther}
              otherPlaceholder={`Apa ${name} panggil anda? (cth: Mak Long)`}
              onOtherChange={setPanggilanOther}
              onPick={(v) => {
                setRelationship(v as Relationship)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "A6" && (
            <ChoiceQuestion
              question="Berapa umur anda?"
              answerHint="Ini membantu kami memahami keluarga Tutur — tidak akan dikongsi."
              cols={2}
              value={parentAge}
              options={[
                { value: "bawah_25", label: "Bawah 25 tahun" },
                { value: "25_34", label: "25 – 34 tahun" },
                { value: "35_44", label: "35 – 44 tahun" },
                { value: "45_54", label: "45 – 54 tahun" },
                { value: "lain", label: "Lain-lain" },
              ]}
              otherValue={parentAgeOther}
              otherPlaceholder="Nyatakan umur anda"
              onOtherChange={setParentAgeOther}
              onPick={(v) => {
                setParentAge(v as ParentAgeBucket)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "slt" && <SltCredibility />}

          {step === "A7" && (
            <ScreeningQuestion
              question={`Adakah ${name} kerap membuat pandangan mata dengan anda?`}
              value={q1}
              footer="Ini bukan diagnosis — jawapan anda membantu Tutur sesuaikan program."
              onPick={(v) => { setQ1(v); go(1) }}
            />
          )}
          {step === "A8" && (
            <ScreeningQuestion
              question={`Adakah ${name} menunjukkan minat untuk berinteraksi dengan anda atau orang lain?`}
              value={q2}
              onPick={(v) => { setQ2(v); go(1) }}
            />
          )}
          {step === "A9" && (
            <ScreeningQuestion
              question={`Adakah ${name} meniru bunyi atau aksi anda? Contohnya bunyi “brmm” atau tepuk tangan.`}
              value={q3}
              onPick={(v) => { setQ3(v); go(1) }}
            />
          )}
          {step === "A10" && (
            <ScreeningQuestion
              question={`Adakah ${name} menggunakan isyarat seperti menunjuk pada benda yang dia mahu?`}
              value={q4}
              onPick={(v) => { setQ4(v); go(1) }}
            />
          )}
          {step === "A11" && (
            <ScreeningQuestion
              question={`Adakah ${name} mengeluarkan bunyi atau vokalisasi — walaupun bukan perkataan sebenar?`}
              value={q5}
              onPick={(v) => { setQ5(v); go(1) }}
            />
          )}

          {step === "A12" && (
            <ChoiceQuestion
              question={`Adakah ${name} pernah didiagnosis oleh profesional dengan mana-mana keadaan berikut?`}
              cols={1}
              footer="Ini bukan diagnosis."
              value={q6}
              options={[
                { value: "tiada", label: "Tiada" },
                { value: "pendengaran", label: "Masalah pendengaran" },
                { value: "pertuturan", label: "Masalah pertuturan (cth: CAS, dysarthria)" },
                { value: "aac", label: "Menggunakan AAC" },
                { value: "lain", label: "Lain-lain" },
              ]}
              otherValue={diagnosisOther}
              otherPlaceholder="Nyatakan diagnosis"
              onOtherChange={setDiagnosisOther}
              onPick={(v) => {
                setQ6(v as Diagnosis)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "A13" && q6 && (
            <ResultPage
              name={name}
              variant={resultVariant({
                q1: q1!, q2: q2!, q3: q3!, q4: q4!,
                q5: skipA11 ? null : q5,
                q6,
              })}
            />
          )}

          {step === "A14" && (
            <ConfidenceQuestion name={name} value={confidence} onPick={setConfidence} />
          )}
        </div>
      </div>

      {/* Footer CTA — same rounded-full primary button as the live onboarding.
          Auto-advancing choice screens have no CTA, so the footer would otherwise
          reserve dead space at the bottom of an already height-constrained page.
          `hasFooterCta` collapses it entirely on those screens. */}
      <footer
        className={[
          "relative mx-auto w-full max-w-2xl shrink-0 px-6",
          hasFooterCta ? "pb-8 pt-2 lg:pb-12" : "pb-4",
        ].join(" ")}
      >
        <div className="mx-auto max-w-md">
          {step === "maya" && (
            <PrimaryButton onClick={() => go(1)}>
              {w.start}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {isStory && (
            <PrimaryButton onClick={() => go(1)}>
              {w.next}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {step === "slt" && (
            <PrimaryButton onClick={() => go(1)}>
              Jom teruskan
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {step === "A13" && (
            <PrimaryButton onClick={() => go(1)}>
              Teruskan
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {step === "A14" && (
            <>
              {error && (
                <p className="mb-3 rounded-2xl border-[1.5px] border-destructive/40 bg-destructive/5 px-4 py-3 text-center text-xs font-medium text-destructive">
                  Gagal menyimpan. Cuba lagi.
                  <span className="mt-1 block font-mono text-[10px] opacity-70">{error}</span>
                </p>
              )}
              <PrimaryButton disabled={confidence === null || saving} onClick={finish}>
                {saving ? "Menyimpan…" : "Pergi ke dashboard"}
                {!saving && <ArrowRight className="h-5 w-5" />}
              </PrimaryButton>
            </>
          )}
        </div>
      </footer>
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pages                                                                      */
/* -------------------------------------------------------------------------- */

function MayaIntro() {
  return (
    <div className="mx-auto max-w-lg animate-fade-up text-center" style={{ animationFillMode: "both" }}>
      <img
        src="/maya.png"
        alt="Maya"
        className="mx-auto h-28 w-28 select-none rounded-full border-2 border-primary/20 object-cover shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
        draggable={false}
      />
      <h1 className="mt-6 text-balance font-display text-2xl font-bold tracking-tight lg:text-3xl">
        Hai! Saya Maya.
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
        Saya akan temani anda selama 14 hari — 15 minit sehari, dalam rutin biasa di rumah.
      </p>
    </div>
  )
}

/**
 * The bridge between part 1 (admin) and part 2 (clinical).
 *
 * Part 2 asks a frightened parent whether their child makes eye contact. That is
 * an intrusive question, and it deserves a reason BEFORE it is asked, not after.
 * This screen is that reason.
 *
 * ── ON THE "40 TAHUN" CLAIM ───────────────────────────────────────────────
 * Two therapists: 25 years and 15 years. Adding them to 40 is legitimate ONLY if
 * the word "combined" (gabungan) is attached and the two people are visible.
 * "Lebih 40 tahun pengalaman" on its own reads as ONE person with a 40-year
 * career — that is not true, and to a parent making a decision about their
 * child's development it is exactly the kind of thing they'd feel misled by if
 * they found out. So the copy names both, shows both numbers, and says gabungan.
 * The claim is strong AND true; it doesn't need to be shaded.
 */
function SltCredibility() {
  return (
    // Same shell as StoryPage (Welcome 1 & 2): badge → image → title → body.
    <div className="animate-fade-up" style={{ animationFillMode: "both" }}>
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
        >
          Dibangunkan bersama pakar
        </span>
      </div>

      {/* Same treatment as the welcome illustrations — identical 1376 × 768 source,
          corner radius, drop shadow and full-bleed width, so the three pages read
          as one set. */}
      <img
        src="/welcome/credibilities.png"
        alt=""
        className="max-h-[34svh] w-full select-none rounded-3xl object-contain shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
        draggable={false}
      />

      <div className="mt-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          Program ini dibina bersama Ahli Terapi Pertuturan
        </h1>

        {/* The claim: two therapists, 25 + 15 years, added together. "dua ...
            berdaftar" sits immediately before the number, which is what makes the
            40 read as the pair's total rather than one person's career. If that
            phrase is ever cut, the number needs "gabungan" added back to stay true. */}
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
          Kandungan Tutur disemak dua Ahli Terapi Pertuturan berdaftar{" "}
          <span className="font-semibold text-primary">— 40 tahun pengalaman.</span>
        </p>
      </div>
    </div>
  )
}

/**
 * Maya asking. Illustration top-left, question in a speech bubble beside it.
 *
 * SIZE: 96px on phones, 128px from `sm`, 144px on large screens. Deliberately
 * bigger than a typical chat avatar, because the artwork is a SCENE — she's
 * holding a clipboard, writing, with papers at her feet and a question mark
 * overhead. At the 64–72px of a normal avatar all of that compresses into a
 * violet smudge, and you may as well not have drawn it.
 *
 * ART: /maya-ask.png — 500 × 500, transparent PNG. The lavender blob is part of
 * the artwork, so the area around it MUST stay transparent; a white-backed export
 * would render as a glaring square on a card, and worse on the dark theme.
 *
 * Her face sits ~34% down the frame, which is what the bubble's tail offset is
 * tuned against. Re-export her at a different crop and the tail needs re-tuning.
 */
function MayaAsk({ question }: { question: string }) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      {/* Drops to 72px below 360px wide (iPhone SE and friends). At 96px the
          illustration would squeeze the bubble to ~166px there, which turns a
          long screening question into ten stacked lines. The art matters, but the
          question matters more. */}
      <img
        src="/maya-ask.png"
        alt=""
        aria-hidden
        draggable={false}
        className="h-24 w-24 shrink-0 select-none max-[360px]:h-[72px] max-[360px]:w-[72px] sm:h-32 sm:w-32 lg:h-36 lg:w-36"
      />

      {/* Speech bubble with a real tail. Without the tail this reads as "text in a
          box"; with it, Maya is visibly the one asking — which is the whole point
          of putting her on the screen at all. */}
      <div className="relative min-w-0 flex-1 self-start rounded-2xl border-[1.5px] border-border bg-card px-4 py-3.5 shadow-sm">
        {/* A square rotated 45°, half-hidden behind the bubble. Only its left and
            bottom borders show, so it reads as a triangular notch pointing back at
            Maya.

            The offset tracks her FACE, which sits roughly a third of the way down
            the artwork — so it scales with the illustration rather than staying
            pinned near the top edge and pointing at her hijab. */}
        <span
          className="absolute -left-[7px] top-8 h-3 w-3 rotate-45 border-b-[1.5px] border-l-[1.5px] border-border bg-card max-[360px]:top-6 sm:top-10 lg:top-12"
          aria-hidden
        />
        {/* Question sits 2px above the answer cards (text-sm / 14px), not shouting
            over them — Maya is asking, not announcing. */}
        <h2 className="text-balance font-display text-base font-bold leading-snug tracking-tight">
          {question}
        </h2>
      </div>
    </div>
  )
}

/**
 * The three-band question layout, mirroring the reference app:
 *
 *   ── Maya + question   (top, fixed)
 *   ── flexible gap      (absorbs all spare height)
 *   ── answers + footer  (bottom, fixed)
 *
 * The middle band is what makes this fit any viewport: it grows on a tall desktop
 * and collapses to nothing on a short phone, so the answers stay reachable at the
 * bottom without the page ever scrolling. `min-h-0` on the gap is what lets it
 * actually shrink — without it, flex children refuse to go below their content
 * size and the layout overflows.
 */
function QuestionShell({
  question,
  hint,
  answerHint,
  children,
  footer,
}: {
  question: string
  /** Sits under the bubble, next to Maya — reads as part of what she's saying. */
  hint?: string
  /**
   * Sits directly ABOVE the answers, at the bottom of the screen.
   *
   * Use this for anything that explains *why we're asking* or *what happens to
   * the answer* ("this is your account", "won't be shared"). Stranded up by the
   * bubble it reads as a stray aside; sitting on top of the input, it lands
   * exactly when the parent is deciding what to type.
   */
  answerHint?: string
  children: React.ReactNode
  footer?: string
}) {
  return (
    <div
      className="flex h-full animate-fade-up flex-col"
      style={{ animationFillMode: "both" }}
    >
      {/* The QUESTION band takes all the spare height, and is the ONLY part that
          can ever scroll — and only in the pathological case of a very long
          question on a very short phone.

          The ANSWERS band below is shrink-0, so it is physically incapable of
          being pushed off-screen. That's the guarantee: whatever the viewport,
          whatever the keyboard is doing, the parent can always reach the thing
          they have to tap. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MayaAsk question={question} />
        {/* Indent matches the illustration + gap, so the hint hangs under the
            bubble rather than under Maya. */}
        {hint && (
          <p className="mt-2.5 pl-[106px] text-[13px] leading-snug text-muted-foreground sm:pl-[140px] lg:pl-[156px]">
            {hint}
          </p>
        )}
      </div>

      <div className="shrink-0 pb-1 pt-4">
        {answerHint && (
          <p className="mb-3 text-balance text-[13px] leading-snug text-muted-foreground">
            {answerHint}
          </p>
        )}
        {children}
        {footer && (
          <p className="mt-4 text-balance text-center text-xs font-medium text-muted-foreground">
            {footer}
          </p>
        )}
      </div>
    </div>
  )
}

const INPUT_CLASS =
  "w-full rounded-2xl border-[1.5px] border-border bg-muted px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:[box-shadow:var(--ring-focus)]"

function TextQuestion({
  question, hint, answerHint, placeholder, value, onChange, onSubmit,
}: {
  question: string
  hint?: string
  answerHint?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <QuestionShell question={question} hint={hint} answerHint={answerHint}>
      <input
        autoFocus
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSubmit()}
        className={INPUT_CLASS}
      />
      <div className="mt-5">
        <PrimaryButton disabled={!value.trim()} onClick={onSubmit}>
          Seterusnya
          <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </QuestionShell>
  )
}

function ChoiceQuestion({
  question, hint, answerHint, footer, cols, options, value,
  otherValue, otherPlaceholder, onOtherChange, onPick, onOtherSubmit,
}: {
  question: string
  hint?: string
  answerHint?: string
  footer?: string
  cols: 1 | 2
  options: { value: string; label: string }[]
  /**
   * The already-chosen answer, if any. REQUIRED for going back and for resuming
   * after a refresh: without it the parent sees a blank grid and cannot tell
   * what they picked, even though the answer is safely stored.
   */
  value?: string | null
  otherValue: string
  otherPlaceholder: string
  onOtherChange: (v: string) => void
  onPick: (v: string) => void
  onOtherSubmit: () => void
}) {
  // If they'd chosen "Lain-lain", drop them straight back into their own text
  // rather than the card grid — that IS their answer.
  const [otherActive, setOtherActive] = useState(value === "lain")
  const inputRef = useRef<HTMLInputElement | null>(null)

  // "Lain-lain" swaps the card grid for a REQUIRED text field — you cannot
  // advance on the catch-all alone, or the value would be meaningless.
  if (otherActive) {
    return (
      <QuestionShell question={question} hint={hint} answerHint={answerHint} footer={footer}>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={otherValue}
          placeholder={otherPlaceholder}
          onChange={(e) => onOtherChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && otherValue.trim() && onOtherSubmit()}
          className={INPUT_CLASS}
        />
        <div className="mt-5">
          <PrimaryButton disabled={!otherValue.trim()} onClick={onOtherSubmit}>
            Seterusnya
            <ArrowRight className="h-5 w-5" />
          </PrimaryButton>
        </div>
      </QuestionShell>
    )
  }

  return (
    <QuestionShell question={question} hint={hint} answerHint={answerHint} footer={footer}>
      <div className={cols === 2 ? "grid grid-cols-2 gap-2.5" : "grid gap-2.5"}>
        {options.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onClick={() => {
              onPick(o.value)
              if (o.value === "lain") {
                setOtherActive(true)
                setTimeout(() => inputRef.current?.focus(), 50)
              }
            }}
          />
        ))}
      </div>
    </QuestionShell>
  )
}

/**
 * One option card. `selected` is what makes going back — and resuming after a
 * refresh — legible: the parent must be able to see the answer they already gave.
 */
function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group flex items-center justify-between gap-2 rounded-2xl border-[1.5px] px-4 py-3.5 text-left text-sm font-semibold transition-all active:scale-[0.98]",
        selected
          ? "border-primary bg-[hsl(var(--primary)/0.10)] text-foreground"
          : "border-border bg-card text-foreground hover:border-primary hover:bg-[hsl(var(--primary)/0.06)]",
      ].join(" ")}
    >
      <span className="min-w-0 truncate">{label}</span>
      {selected ? (
        <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      )}
    </button>
  )
}

/**
 * The screening scale is FIXED at three options with NO "Lain-lain". A catch-all
 * here would make the flag rule uncomputable, so the component cannot offer one.
 */
function ScreeningQuestion({
  question, value, footer = "Ini bukan diagnosis.", onPick,
}: {
  question: string
  /** The already-given answer — so going back shows what they said. */
  value: ScreeningAnswer | null
  /**
   * The reassurance under the options. The FIRST screening question carries the
   * long form ("…jawapan anda membantu saya sesuaikan program"), because that is
   * the moment the parent needs to hear why they're being asked. The remaining
   * five keep the short form — repeating the full sentence six times would turn
   * reassurance into noise.
   */
  footer?: string
  onPick: (v: ScreeningAnswer) => void
}) {
  return (
    <QuestionShell question={question} footer={footer}>
      <div className="grid gap-2.5">
        {SCREENING_OPTS.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onClick={() => onPick(o.value)}
          />
        ))}
      </div>
    </QuestionShell>
  )
}

function ResultPage({ name, variant }: { name: string; variant: ResultVariant }) {
  // The child's name carries the violet accent — the same colour as
  // "40 tahun pengalaman klinikal gabungan" on the credibility page. This result
  // is about THEIR child, not a generic outcome, and the colour is what says so.
  const child = <span className="text-primary">{name}</span>

  const copy = {
    A: {
      badge: "Sedia bermula",
      title: <>{child} dan anda dah sedia</>,
      body: "Sepanjang 14 hari, fokus kita: perubahan ANDA dulu — anak akan menyusul.",
      note: `Profil ${name} disimpan sebagai penanda aras Hari 0`,
    },
    B: {
      badge: "Cadangan penilaian",
      title: <>Kami syorkan penilaian oleh SLT</>,
      body: "Anda tetap boleh mula program ini — ia direka untuk melengkapkan terapi, bukan menggantikannya.",
      note: "Cadangan ini akan kekal di dashboard anda.",
    },
    C: {
      badge: "Guna bersama terapi",
      title: <>Program ini sesuai bersama terapi {child}</>,
      body: "Kongsikan tracker anda dengan SLT anda pada setiap sesi.",
      note: null,
    },
  }[variant]

  return (
    <div className="mx-auto max-w-lg animate-fade-up text-center" style={{ animationFillMode: "both" }}>
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
        >
          {copy.badge}
        </span>
      </div>
      <img
        src="/maya.png"
        alt=""
        className="mx-auto h-20 w-20 select-none rounded-full border-2 border-primary/20 object-cover"
        draggable={false}
      />
      <h1 className="mt-5 text-balance font-display text-2xl font-bold tracking-tight">
        {copy.title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        {copy.body}
      </p>
      {copy.note && (
        <div className="mx-auto mt-6 max-w-md rounded-2xl glass p-3.5">
          <p className="text-sm font-semibold text-foreground">{copy.note}</p>
        </div>
      )}
    </div>
  )
}

function ConfidenceQuestion({
  name, value, onPick,
}: {
  name: string
  value: number | null
  onPick: (v: number) => void
}) {
  return (
    <QuestionShell
      question={`Sejauh mana yakin anda SEKARANG untuk membimbing ${name} berkomunikasi?`}
      hint="Satu soalan terakhir. Kita banding semula pada Hari 7 dan Hari 14."
    >
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            className={[
              "flex-1 rounded-2xl border-[1.5px] py-5 font-display text-lg font-bold transition-all active:scale-[0.98]",
              value === n
                ? "border-primary bg-[hsl(var(--primary)/0.10)] text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>1 · Tidak yakin</span>
        <span>5 · Sangat yakin</span>
      </div>
    </QuestionShell>
  )
}
