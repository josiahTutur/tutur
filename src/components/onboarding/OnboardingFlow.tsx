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
import { useLang, useT } from "@/lib/i18n"
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
  type HomeLanguage,
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
  /** What the CHILD hears most at home — the input that should drive content. */
  homeLanguage: HomeLanguage
  homeLanguageOther?: string
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
  | "A2" | "A3" | "A4" | "A5" | "A6" | "LANG"
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

/* -------------------------------------------------------------------------- *
 *  Copy — Malay first, English second.
 *
 *  IMPORTANT: only the LABELS are translated. Every stored value stays an enum
 *  ("kerap", "ibu", "2_3"), so the screening flags, the database rows and the
 *  SLT export are byte-identical whichever language the parent happened to read
 *  the question in. Translating the data as well as the copy would silently make
 *  a Malay family and an English family non-comparable in the pilot dataset.
 * -------------------------------------------------------------------------- */
const STR = {
  ms: {
    // Maya intro
    mayaTitle: "Hai! Saya Maya.",
    mayaBody: "Saya akan temani anda selama 14 hari — 15 minit sehari, dalam rutin biasa di rumah.",

    // Chrome
    back: "Kembali",
    next: "Seterusnya",
    backToChoices: "Lihat pilihan lain",
    continue: "Teruskan",
    lastQuestion: "Soalan terakhir",
    saving: "Menyimpan…",
    saveFailed: "Gagal menyimpan. Cuba lagi.",
    toDashboard: "Pergi ke dashboard",
    letsContinue: "Jom teruskan",

    // A2 · child nickname
    q_nickname: "Sebelum kita mula — siapa nama panggilan anak anda?",
    ph_nickname: "cth: Adam",

    // A3 · child age
    q_childAge: (n: string) => `Berapa umur ${n} sekarang?`,
    childAge: {
      bawah_12m: "Bawah 12 bulan",
      "1_2": "1 – 2 tahun",
      "2_3": "2 – 3 tahun",
      "3_4": "3 – 4 tahun",
      lain: "Lain-lain",
    },
    ph_childAgeOther: "cth: 5 (tahun)",

    // A4 · parent name
    q_parentName: "Dan anda? Apa nama anda?",
    ph_parentName: "cth: Siti",

    // A5 · relationship
    q_relationship: (n: string) => `Apa hubungan anda dengan ${n}?`,
    relationship: {
      ibu: "Ibu",
      ayah: "Ayah",
      nenek: "Nenek",
      datuk: "Datuk",
      lain: "Lain-lain",
    },
    hint_panggilan: (n: string) => `Apa ${n} panggil anda?`,
    ph_panggilan: "cth: Mak Long",

    // A6 · parent age
    q_parentAge: "Berapa umur anda?",
    parentAge: {
      bawah_25: "Bawah 25 tahun",
      "25_34": "25 – 34 tahun",
      "35_44": "35 – 44 tahun",
      "45_54": "45 – 54 tahun",
      lain: "Lain-lain",
    },
    ph_parentAgeOther: "cth: 58",

    // LANG · home language
    q_language: (n: string) => `Bahasa apa yang paling kerap didengar ${n} di rumah?`,
    hint_language: (n: string) =>
      `Fikirkan siapa yang paling lama bersama ${n} setiap hari — nenek, datuk, pengasuh, atau anda.`,
    language: {
      melayu: "Bahasa Melayu",
      english: "English",
      lain: "Lain-lain",
    },

    // A7–A11 · screening
    q_s1: (n: string) => `Adakah ${n} kerap membuat pandangan mata dengan anda?`,
    q_s2: (n: string) => `Adakah ${n} menunjukkan minat untuk berinteraksi dengan anda atau orang lain?`,
    q_s3: (n: string) => `Adakah ${n} meniru bunyi atau aksi anda? Contohnya bunyi “brmm” atau tepuk tangan.`,
    q_s4: (n: string) => `Adakah ${n} menggunakan isyarat seperti menunjuk pada benda yang dia mahu?`,
    q_s5: (n: string) => `Adakah ${n} mengeluarkan bunyi atau vokalisasi — walaupun bukan perkataan sebenar?`,
    notDiagnosis: "Ini bukan diagnosis.",
    notDiagnosisLong: "Ini bukan diagnosis — jawapan anda membantu Tutur sesuaikan program.",

    // A12 · diagnosis
    q_diagnosis: (n: string) => `Adakah ${n} pernah didiagnosis oleh profesional dengan mana-mana keadaan berikut?`,
    diagnosis: {
      tiada: "Tiada",
      pendengaran: "Masalah pendengaran",
      pertuturan: "Masalah pertuturan (cth: CAS, dysarthria)",
      aac: "Menggunakan AAC",
      lain: "Lain-lain",
    },
    ph_diagnosisOther: "Nyatakan diagnosis",

    // SLT credibility
    slt_badge: "Dibangunkan bersama pakar",
    slt_title: "Program ini dibina bersama Ahli Terapi Pertuturan",
    slt_body: "Kandungan Tutur disemak dua Ahli Terapi Pertuturan berdaftar",
    slt_accent: "— 40 tahun pengalaman.",

    // A13 · results
    rA_badge: "Sedia bermula",
    rA_titleAfter: " dan anda dah sedia",
    rA_body: "Sepanjang 14 hari, fokus kita: perubahan ANDA dulu — anak akan menyusul.",
    rB_badge: "Cadangan penilaian",
    rB_title: "Kami syorkan penilaian oleh SLT",
    rB_body: "Anda tetap boleh mula program ini — ia direka untuk melengkapkan terapi, bukan menggantikannya.",
    rC_badge: "Guna bersama terapi",
    rC_titleBefore: "Program ini sesuai bersama terapi ",
    rC_body: "Kongsikan tracker anda dengan SLT anda pada setiap sesi.",

    // A14 · confidence
    q_confidence: (n: string) => `Sejauh mana yakin anda SEKARANG untuk membimbing ${n} berkomunikasi?`,
    hint_confidence: "Satu soalan terakhir.",
    conf_low: "1 · Tidak yakin",
    conf_high: "5 · Sangat yakin",

    fallbackChild: "anak anda",
  },
  en: {
    mayaTitle: "Hi! I'm Maya.",
    mayaBody: "I'll be with you for 14 days — 15 minutes a day, inside your normal routine at home.",

    back: "Back",
    next: "Next",
    backToChoices: "See the other choices",
    continue: "Continue",
    lastQuestion: "Last question",
    saving: "Saving…",
    saveFailed: "Couldn't save. Please try again.",
    toDashboard: "Go to dashboard",
    letsContinue: "Let's continue",

    q_nickname: "Before we start — what do you call your child?",
    ph_nickname: "e.g. Adam",

    q_childAge: (n: string) => `How old is ${n} now?`,
    childAge: {
      bawah_12m: "Under 12 months",
      "1_2": "1 – 2 years",
      "2_3": "2 – 3 years",
      "3_4": "3 – 4 years",
      lain: "Other",
    },
    ph_childAgeOther: "e.g. 5 (years)",

    q_parentName: "And you? What's your name?",
    ph_parentName: "e.g. Siti",

    q_relationship: (n: string) => `What is your relationship to ${n}?`,
    relationship: {
      ibu: "Mother",
      ayah: "Father",
      nenek: "Grandmother",
      datuk: "Grandfather",
      lain: "Other",
    },
    hint_panggilan: (n: string) => `What does ${n} call you?`,
    ph_panggilan: "e.g. Mak Long",

    q_parentAge: "How old are you?",
    parentAge: {
      bawah_25: "Under 25",
      "25_34": "25 – 34",
      "35_44": "35 – 44",
      "45_54": "45 – 54",
      lain: "Other",
    },
    ph_parentAgeOther: "e.g. 58",

    q_language: (n: string) => `Which language does ${n} hear most at home?`,
    hint_language: (n: string) =>
      `Think about who spends the most time with ${n} each day — a grandparent, a carer, or you.`,
    language: {
      melayu: "Malay",
      english: "English",
      lain: "Other",
    },

    q_s1: (n: string) => `Does ${n} often make eye contact with you?`,
    q_s2: (n: string) => `Does ${n} show interest in interacting with you or other people?`,
    q_s3: (n: string) => `Does ${n} imitate your sounds or actions? For example a “brmm” sound, or clapping.`,
    q_s4: (n: string) => `Does ${n} use gestures, such as pointing at something they want?`,
    q_s5: (n: string) => `Does ${n} make sounds or vocalisations — even if they aren't real words?`,
    notDiagnosis: "This is not a diagnosis.",
    notDiagnosisLong: "This is not a diagnosis — your answers help Tutur tailor the programme.",

    q_diagnosis: (n: string) => `Has ${n} ever been diagnosed by a professional with any of the following?`,
    diagnosis: {
      tiada: "None",
      pendengaran: "Hearing difficulties",
      pertuturan: "Speech difficulties (e.g. CAS, dysarthria)",
      aac: "Uses AAC",
      lain: "Other",
    },
    ph_diagnosisOther: "Please specify the diagnosis",

    slt_badge: "Built with experts",
    slt_title: "This programme was built with Speech-Language Therapists",
    slt_body: "Tutur's content is reviewed by two registered Speech-Language Therapists",
    slt_accent: "— 40 years of experience.",

    rA_badge: "Ready to begin",
    rA_titleAfter: " and you are ready",
    rA_body: "Over the 14 days, our focus is YOUR change first — your child will follow.",
    rB_badge: "Assessment recommended",
    rB_title: "We recommend an assessment by an SLT",
    rB_body: "You can still start this programme — it's designed to complement therapy, not replace it.",
    rC_badge: "Use alongside therapy",
    rC_titleBefore: "This programme works well alongside ",
    rC_body: "Share your tracker with your SLT at every session.",

    q_confidence: (n: string) => `How confident do you feel RIGHT NOW about guiding ${n} to communicate?`,
    hint_confidence: "One last question.",
    conf_low: "1 · Not confident",
    conf_high: "5 · Very confident",

    fallbackChild: "your child",
  },
}

/**
 * The active language's copy. Derived from the MS table, which makes MS the
 * canonical shape: add a key there and EN fails to compile until it's translated
 * too. That's the point — a missing translation should be a build error, not a
 * Malay string quietly appearing on an English screen.
 */
type Copy = (typeof STR)["ms"]

const PART1: Step[] = ["A2", "A3", "A4", "A5", "A6", "LANG"] // about you and your child
const PART2: Step[] = ["A7", "A8", "A9", "A10", "A11", "A12"] // soalan ringkas tentang {anak}

/**
 * Character limits for every free-text field.
 *
 * Sized so the text stays inside the box rather than scrolling out of view. The
 * narrowest phone (320px) fits ~30 characters in the input at 16px; 70% of that
 * is ~21, which is the ceiling these are set against.
 *
 * `diagnosis` is the deliberate exception: a real condition name ("Masalah
 * pertuturan") needs the room, and truncating a parent's answer about their
 * child's diagnosis is worse than letting it scroll.
 */
const MAX_LEN = {
  childNickname: 20,
  parentName: 24,
  /** Spoken aloud in every activity script — short by necessity, not just by UI. */
  panggilan: 20,
  diagnosis: 40,
  /** "Lain-lain" home language — a language name, so short. */
  language: 24,
  /** Ages are 1–2 digits. Numeric-only, so no unit text to fit. */
  age: 2,
} as const

/** Strip everything that isn't a digit. Used by the two age fields. */
const digitsOnly = (v: string) => v.replace(/\D/g, "")

/** Built per-render now, because the labels depend on the active language. */
function screeningOpts(lang: "ms" | "en") {
  return (["kerap", "kadang", "jarang"] as ScreeningAnswer[]).map((v) => ({
    value: v,
    label: SCREENING_LABELS[lang][v],
  }))
}

/**
 * A step we're willing to resume onto. The Maya intro and story pages are cheap
 * to re-see, so they're excluded — but `slt` is included: it marks "part 1 done",
 * and dropping someone back to the beginning after they've answered five
 * questions is exactly the drop-off we're trying to avoid.
 */
function resumableStep(s: string | undefined): Step | null {
  const known: Step[] = [
    "A2", "A3", "A4", "A5", "A6", "LANG",
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
  const { lang } = useLang()
  const s = STR[lang]

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
  const [homeLanguage, setHomeLanguage] = useState<HomeLanguage | null>(
    a?.homeLanguage ?? null
  )
  const [homeLanguageOther, setHomeLanguageOther] = useState(id?.homeLanguageOther ?? "")

  const [q1, setQ1] = useState<ScreeningAnswer | null>(a?.q1 ?? null)
  const [q2, setQ2] = useState<ScreeningAnswer | null>(a?.q2 ?? null)
  const [q3, setQ3] = useState<ScreeningAnswer | null>(a?.q3 ?? null)
  const [q4, setQ4] = useState<ScreeningAnswer | null>(a?.q4 ?? null)
  const [q5, setQ5] = useState<ScreeningAnswer | null>(a?.q5 ?? null)
  const [q6, setQ6] = useState<Diagnosis | null>(a?.q6 ?? null)
  const [diagnosisOther, setDiagnosisOther] = useState(id?.diagnosisOther ?? "")
  const [confidence, setConfidence] = useState<number | null>(a?.confidence ?? null)

  const name = anak.trim() || s.fallbackChild

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

  /**
   * ── PROGRESS ─────────────────────────────────────────────────────────────
   *
   * ONE bar, ONE running count ("Soalan 7 / 12").
   *
   * The bar tracks the whole run INCLUDING the SLT credibility screen — it is a
   * step on the journey even though it asks nothing, and letting the bar advance
   * across it means the parent is never stalled at the same position for a screen.
   *
   * The COUNT, though, only counts questions. So the SLT screen moves the bar and
   * shows no number: honest on both axes — you have made progress, and you have
   * not been asked anything.
   *
   * Part 2 shrinks to 5 when the child is under 12 months and A11 is skipped, so
   * both the bar and the total are computed, never hardcoded.
   */
  const part2 = PART2.filter((s) => !(skipA11 && s === "A11"))

  /** Every screen the bar advances across, in order. */
  const TRACKED: Step[] = [...PART1, "slt", ...part2]
  const totalQuestions = PART1.length + part2.length

  const trackedIdx = TRACKED.indexOf(step)
  const pastTracked = step === "A13" || step === "A14"
  const fill =
    trackedIdx >= 0 ? ((trackedIdx + 1) / TRACKED.length) * 100 : pastTracked ? 100 : 0

  /** The running question number, 1…12. Null on the SLT screen — it asks nothing. */
  const inPart1 = PART1.includes(step)
  const inPart2 = part2.includes(step)
  const questionNo = inPart1
    ? PART1.indexOf(step) + 1
    : inPart2
      ? PART1.length + part2.indexOf(step) + 1
      : null

  const showProgress = trackedIdx >= 0 || step === "A14"
  const counter =
    questionNo !== null
      ? `${w.questionOf} ${questionNo} / ${totalQuestions}`
      : step === "A14"
        ? s.lastQuestion
        : null // the SLT screen: the bar moves, but there is no question to number

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
        homeLanguage: homeLanguage ?? undefined,
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
        homeLanguageOther: homeLanguageOther.trim() || undefined,
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
      homeLanguage: homeLanguage!,
      homeLanguageOther:
        homeLanguage === "lain" ? homeLanguageOther.trim() : undefined,
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
   * Question screens use a fixed-height, three-band layout (Maya + question at the
   * top, answers pinned to the bottom) rather than a centred block. The SLT page is
   * image-first, so it is NOT one of these even though it shows the progress bars.
   */
  const isQuestion = inPart1 || inPart2 || step === "A14"

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
          aria-label="Back"
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-all",
            idx === 0 ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {showProgress && (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fill}%`,
                  background:
                    "linear-gradient(to right, hsl(258 65% 55%), hsl(258 70% 45%))",
                }}
              />
            </div>

            {/* The counter slot is ALWAYS rendered, at a fixed width, even on the
                SLT screen where it has no text.

                It used to be conditional — and because the bar is flex-1, dropping
                the counter let the TRACK grow ~85px wider. The fill then went from
                54% of a wide track (292px) to 62% of a narrow one (280px): the
                percentage rose, the pixels shrank, and the bar visibly slid
                BACKWARDS on the way into question 7.

                Reserving the space keeps the track a constant width, so the fill
                only ever moves one way. */}
            <span className="w-28 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
              {counter}
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
          {step === "maya" && <MayaIntro s={s} />}
          {isStory && <StoryPage step={storyStep} w={w} />}

          {step === "A2" && (
            <TextQuestion
              nextLabel={w.next}
              question={s.q_nickname}
              placeholder={s.ph_nickname}
              maxLength={MAX_LEN.childNickname}
              value={anak}
              onChange={setAnak}
              onSubmit={() => go(1)}
            />
          )}

          {step === "A3" && (
            <ChoiceQuestion
              nextLabel={w.next}
              backToChoices={s.backToChoices}
              question={s.q_childAge(name)}
              cols={2}
              value={childAge}
              options={[
                { value: "bawah_12m", label: s.childAge.bawah_12m },
                { value: "1_2", label: s.childAge["1_2"] },
                { value: "2_3", label: s.childAge["2_3"] },
                { value: "3_4", label: s.childAge["3_4"] },
                { value: "lain", label: s.childAge.lain },
              ]}
              otherValue={childAgeOther}
              otherPlaceholder={s.ph_childAgeOther}
              otherMaxLength={MAX_LEN.age}
              otherNumeric
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
              nextLabel={w.next}
              question={s.q_parentName}
              placeholder={s.ph_parentName}
              maxLength={MAX_LEN.parentName}
              value={parentName}
              onChange={setParentName}
              onSubmit={() => go(1)}
            />
          )}

          {step === "A5" && (
            <ChoiceQuestion
              nextLabel={w.next}
              backToChoices={s.backToChoices}
              question={s.q_relationship(name)}
              cols={2}
              value={relationship}
              options={[
                { value: "ibu", label: s.relationship.ibu },
                { value: "ayah", label: s.relationship.ayah },
                { value: "nenek", label: s.relationship.nenek },
                { value: "datuk", label: s.relationship.datuk },
                { value: "lain", label: s.relationship.lain },
              ]}
              otherValue={panggilanOther}
              otherHint={s.hint_panggilan(name)}
              otherPlaceholder={s.ph_panggilan}
              otherMaxLength={MAX_LEN.panggilan}
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
              nextLabel={w.next}
              backToChoices={s.backToChoices}
              question={s.q_parentAge}
              cols={2}
              value={parentAge}
              options={[
                { value: "bawah_25", label: s.parentAge.bawah_25 },
                { value: "25_34", label: s.parentAge["25_34"] },
                { value: "35_44", label: s.parentAge["35_44"] },
                { value: "45_54", label: s.parentAge["45_54"] },
                { value: "lain", label: s.parentAge.lain },
              ]}
              otherValue={parentAgeOther}
              otherPlaceholder={s.ph_parentAgeOther}
              otherMaxLength={MAX_LEN.age}
              otherNumeric
              onOtherChange={setParentAgeOther}
              onPick={(v) => {
                setParentAge(v as ParentAgeBucket)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "LANG" && (
            <ChoiceQuestion
              nextLabel={w.next}
              backToChoices={s.backToChoices}
              question={s.q_language(name)}
              answerHint={s.hint_language(name)}
              cols={1}
              value={homeLanguage}
              options={[
                { value: "melayu", label: s.language.melayu },
                { value: "english", label: s.language.english },
                { value: "lain", label: s.language.lain },
              ]}
              otherValue={homeLanguageOther}
              otherMaxLength={MAX_LEN.language}
              onOtherChange={setHomeLanguageOther}
              onPick={(v) => {
                setHomeLanguage(v as HomeLanguage)
                if (v !== "lain") go(1)
              }}
              onOtherSubmit={() => go(1)}
            />
          )}

          {step === "slt" && <SltCredibility s={s} />}

          {step === "A7" && (
            <ScreeningQuestion
              question={s.q_s1(name)}
              value={q1}
              lang={lang}
              footer={s.notDiagnosisLong}
              onPick={(v) => { setQ1(v); go(1) }}
            />
          )}
          {step === "A8" && (
            <ScreeningQuestion
              question={s.q_s2(name)}
              value={q2}
              lang={lang}
              footer={s.notDiagnosis}
              onPick={(v) => { setQ2(v); go(1) }}
            />
          )}
          {step === "A9" && (
            <ScreeningQuestion
              question={s.q_s3(name)}
              value={q3}
              lang={lang}
              footer={s.notDiagnosis}
              onPick={(v) => { setQ3(v); go(1) }}
            />
          )}
          {step === "A10" && (
            <ScreeningQuestion
              question={s.q_s4(name)}
              value={q4}
              lang={lang}
              footer={s.notDiagnosis}
              onPick={(v) => { setQ4(v); go(1) }}
            />
          )}
          {step === "A11" && (
            <ScreeningQuestion
              question={s.q_s5(name)}
              value={q5}
              lang={lang}
              footer={s.notDiagnosis}
              onPick={(v) => { setQ5(v); go(1) }}
            />
          )}

          {step === "A12" && (
            <ChoiceQuestion
              nextLabel={w.next}
              backToChoices={s.backToChoices}
              question={s.q_diagnosis(name)}
              cols={1}
              footer={s.notDiagnosis}
              value={q6}
              options={[
                { value: "tiada", label: s.diagnosis.tiada },
                { value: "pendengaran", label: s.diagnosis.pendengaran },
                { value: "pertuturan", label: s.diagnosis.pertuturan },
                { value: "aac", label: s.diagnosis.aac },
                { value: "lain", label: s.diagnosis.lain },
              ]}
              otherValue={diagnosisOther}
              otherPlaceholder={s.ph_diagnosisOther}
              otherMaxLength={MAX_LEN.diagnosis}
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
              s={s}
              name={name}
              variant={resultVariant({
                q1: q1!, q2: q2!, q3: q3!, q4: q4!,
                q5: skipA11 ? null : q5,
                q6,
              })}
            />
          )}

          {step === "A14" && (
            <ConfidenceQuestion s={s} name={name} value={confidence} onPick={setConfidence} />
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
              {s.letsContinue}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {step === "A13" && (
            <PrimaryButton onClick={() => go(1)}>
              {s.continue}
              <ArrowRight className="h-5 w-5" />
            </PrimaryButton>
          )}
          {step === "A14" && (
            <>
              {error && (
                <p className="mb-3 rounded-2xl border-[1.5px] border-destructive/40 bg-destructive/5 px-4 py-3 text-center text-xs font-medium text-destructive">
                  {s.saveFailed}
                  <span className="mt-1 block font-mono text-[10px] opacity-70">{error}</span>
                </p>
              )}
              <PrimaryButton disabled={confidence === null || saving} onClick={finish}>
                {saving ? s.saving : s.toDashboard}
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

function MayaIntro({ s }: { s: Copy }) {
  return (
    <div className="mx-auto max-w-lg animate-fade-up text-center" style={{ animationFillMode: "both" }}>
      <img
        src="/maya.png"
        alt="Maya"
        className="mx-auto h-28 w-28 select-none rounded-full border-2 border-primary/20 object-cover shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
        draggable={false}
      />
      <h1 className="mt-6 text-balance font-display text-2xl font-bold tracking-tight lg:text-3xl">
        {s.mayaTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
        {s.mayaBody}
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
function SltCredibility({ s }: { s: Copy }) {
  return (
    // Same shell as StoryPage (Welcome 1 & 2): badge → image → title → body.
    <div className="animate-fade-up" style={{ animationFillMode: "both" }}>
      <div className="mb-5 flex justify-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
        >
          {s.slt_badge}
        </span>
      </div>

      {/* Same treatment as the welcome illustrations — identical 1376 × 768 source,
          corner radius, drop shadow and full-bleed width, so the three pages read
          as one set. */}
      <img
        src="/welcome/credibilities.png"
        alt=""
        className="mx-auto block h-auto w-full max-w-[calc(34svh*1.7917)] select-none rounded-3xl shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
        draggable={false}
      />

      <div className="mt-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
          {s.slt_title}
        </h1>

        {/* The claim: two therapists, 25 + 15 years, added together. "dua ...
            berdaftar" sits immediately before the number, which is what makes the
            40 read as the pair's total rather than one person's career. If that
            phrase is ever cut, the number needs "gabungan" added back to stay true. */}
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:text-base">
          {s.slt_body}{" "}
          <span className="font-semibold text-primary">{s.slt_accent}</span>
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
  question, hint, answerHint, placeholder, value, maxLength, numeric = false,
  nextLabel, onChange, onSubmit,
}: {
  question: string
  nextLabel: string
  hint?: string
  answerHint?: string
  placeholder: string
  value: string
  maxLength: number
  /** Digits only, with a numeric keypad on mobile. */
  numeric?: boolean
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <QuestionShell question={question} hint={hint} answerHint={answerHint}>
      {/* NO autoFocus. Landing on a question with the keyboard already up covers
          half the screen before the parent has even read what's being asked —
          and on these two screens the question IS the whole point. They tap the
          field when they're ready, and the keyboard comes up then. */}
      <input
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        // `maxLength` alone is not enforcement — a paste or an IME can still get
        // past it. Filtering in onChange is what actually holds.
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const next = numeric ? digitsOnly(e.target.value) : e.target.value
          onChange(next.slice(0, maxLength))
        }}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onSubmit()}
        className={INPUT_CLASS}
      />
      <div className="mt-5">
        <PrimaryButton disabled={!value.trim()} onClick={onSubmit}>
          {nextLabel}
          <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </QuestionShell>
  )
}

function ChoiceQuestion({
  question, hint, answerHint, otherHint, footer, cols, options, value,
  otherValue, otherPlaceholder, otherMaxLength, otherNumeric = false,
  nextLabel, backToChoices, onOtherChange, onPick, onOtherSubmit,
}: {
  question: string
  nextLabel: string
  hint?: string
  answerHint?: string
  /**
   * Shown above the "Lain-lain" text field ONLY — not above the option cards.
   *
   * A placeholder is the wrong place for a question: it truncates on a narrow
   * phone, and it vanishes the moment the parent starts typing. Anything they
   * actually need to READ belongs above the box.
   */
  otherHint?: string
  footer?: string
  cols: 1 | 2
  /** Character cap on the "Lain-lain" field. */
  otherMaxLength: number
  /** "Lain-lain" accepts digits only (the two age questions). */
  otherNumeric?: boolean
  options: { value: string; label: string }[]
  /**
   * The already-chosen answer, if any. REQUIRED for going back and for resuming
   * after a refresh: without it the parent sees a blank grid and cannot tell
   * what they picked, even though the answer is safely stored.
   */
  value?: string | null
  otherValue: string
  /** Omit for a blank box — see the LANG step. */
  otherPlaceholder?: string
  onOtherChange: (v: string) => void
  onPick: (v: string) => void
  onOtherSubmit: () => void
  /** "See the choices again" — the way out of the Lain-lain text field. */
  backToChoices: string
}) {
  // If they'd chosen "Lain-lain", drop them straight back into their own text
  // rather than the card grid — that IS their answer.
  const [otherActive, setOtherActive] = useState(value === "lain")
  const inputRef = useRef<HTMLInputElement | null>(null)

  // "Lain-lain" swaps the card grid for a REQUIRED text field — you cannot
  // advance on the catch-all alone, or the value would be meaningless.
  if (otherActive) {
    return (
      <QuestionShell question={question} hint={hint} answerHint={otherHint ?? answerHint} footer={footer}>
        {/* THE WAY BACK.
            Without this, "Lain-lain" was a one-way door. Worse, `otherActive` is
            seeded from the STORED value — so a parent resuming a draft, or simply
            pressing Back into a question she had answered "Lain-lain", landed
            straight in the text field and never saw the option cards at all. An
            empty box and a button, and no sign that this question had ever had
            choices. That is the bug she reported: "I don't see any choices." */}
        <button
          type="button"
          onClick={() => setOtherActive(false)}
          className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-primary transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" />
          {backToChoices}
        </button>
        {/* Also no autoFocus — it would fire on MOUNT, which means resuming into a
            question whose answer was "Lain-lain" would pop the keyboard before the
            parent had read anything. Focus is instead triggered by the tap handler
            below, so it only happens when they actively ask to type. */}
        <input
          ref={inputRef}
          type="text"
          inputMode={otherNumeric ? "numeric" : "text"}
          maxLength={otherMaxLength}
          value={otherValue}
          placeholder={otherPlaceholder}
          onChange={(e) => {
            const next = otherNumeric ? digitsOnly(e.target.value) : e.target.value
            onOtherChange(next.slice(0, otherMaxLength))
          }}
          onKeyDown={(e) => e.key === "Enter" && otherValue.trim() && onOtherSubmit()}
          className={INPUT_CLASS}
        />
        <div className="mt-5">
          <PrimaryButton disabled={!otherValue.trim()} onClick={onOtherSubmit}>
            {nextLabel}
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
  question, value, footer, lang, onPick,
}: {
  question: string
  lang: "ms" | "en"
  /** The already-given answer — so going back shows what they said. */
  value: ScreeningAnswer | null
  /**
   * The reassurance under the options. The FIRST screening question carries the
   * long form ("…jawapan anda membantu saya sesuaikan program"), because that is
   * the moment the parent needs to hear why they're being asked. The remaining
   * five keep the short form — repeating the full sentence six times would turn
   * reassurance into noise.
   */
  footer: string
  onPick: (v: ScreeningAnswer) => void
}) {
  return (
    <QuestionShell question={question} footer={footer}>
      <div className="grid gap-2.5">
        {screeningOpts(lang).map((o) => (
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

function ResultPage({ s, name, variant }: { s: Copy; name: string; variant: ResultVariant }) {
  // The child's name carries the violet accent — the same colour as
  // "40 tahun pengalaman klinikal gabungan" on the credibility page. This result
  // is about THEIR child, not a generic outcome, and the colour is what says so.
  const child = <span className="text-primary">{name}</span>

  const copy = {
    A: {
      badge: s.rA_badge,
      title: <>{child}{s.rA_titleAfter}</>,
      body: s.rA_body,
      note: null,
      illustration: "/welcome/ready.png" as string | null,
    },
    B: {
      badge: s.rB_badge,
      title: <>{s.rB_title}</>,
      body: s.rB_body,
      // The note used to promise a persistent dashboard banner (spec §5.1) that
      // does not exist yet. Removed rather than left as a promise the app breaks.
      // When the banner ships, the sentence can come back — see the plan doc.
      note: null,
      illustration: "/welcome/recommend-SLT.png" as string | null,
    },
    C: {
      badge: s.rC_badge,
      title: <>{s.rC_titleBefore}{child}</>,
      body: s.rC_body,
      note: null,
      // A therapist working with a child — this variant is for families ALREADY in
      // therapy, and the picture should show the therapist, not Maya. Maya isn't
      // the one in the room with them.
      illustration: "/welcome/therapy.png" as string | null,
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

      {copy.illustration ? (
        // Wide 43:24 illustration, same treatment as the welcome and credibility
        // pages. max-h keeps the copy and CTA below it reachable on a short phone.
        <img
          src={copy.illustration}
          alt=""
          className="mx-auto block h-auto w-full max-w-[calc(34svh*1.7917)] select-none rounded-3xl shadow-[0_16px_40px_-16px_hsl(258_60%_40%/0.4)]"
          draggable={false}
        />
      ) : (
        <img
          src="/maya.png"
          alt=""
          className="mx-auto h-20 w-20 select-none rounded-full border-2 border-primary/20 object-cover"
          draggable={false}
        />
      )}

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
  s, name, value, onPick,
}: {
  s: Copy
  name: string
  value: number | null
  onPick: (v: number) => void
}) {
  return (
    <QuestionShell
      question={s.q_confidence(name)}
      hint={s.hint_confidence}
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
        <span>{s.conf_low}</span>
        <span>{s.conf_high}</span>
      </div>
    </QuestionShell>
  )
}
