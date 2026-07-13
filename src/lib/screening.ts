/* ========================================================================== *
 *  Screening (A7–A12) — flags, and the A13 result variant.
 *
 *  IMPORTANT: this is NOT an assessment that configures content. It cannot
 *  produce a CCS or a stage. It is a SAFETY NET: it decides whether the parent
 *  is told to see a Speech-Language Therapist. The 14-day content is identical
 *  for variant A, B and C.
 *
 *  Spec §5.1 · §5.2. Every screen carries the footer "Ini bukan diagnosis."
 * ========================================================================== */

/** The fixed 3-point screening scale. No "Lain-lain" — it must stay closed. */
export type ScreeningAnswer = "kerap" | "kadang" | "jarang"

/**
 * Display labels only. The STORED value is always the enum key ("kerap"), never
 * the label — so the flag rule, the DB rows and the SLT export stay identical
 * whichever language the parent read the question in.
 */
export const SCREENING_LABELS: Record<"ms" | "en", Record<ScreeningAnswer, string>> = {
  ms: {
    kerap: "Ya, kerap",
    kadang: "Kadang-kadang",
    jarang: "Jarang atau tidak pernah",
  },
  en: {
    kerap: "Yes, often",
    kadang: "Sometimes",
    jarang: "Rarely or never",
  },
}

/** A12 — existing diagnosis. Anything but `tiada` routes to variant C. */
export type Diagnosis = "tiada" | "pendengaran" | "pertuturan" | "aac" | "lain"

/** A3 — child age bucket. "bawah_12m" skips screening Q5 (spec §5.2). */
export type ChildAgeBucket = "bawah_12m" | "1_2" | "2_3" | "3_4" | "lain"

/** A6 — parent age bucket. Analytics only; never affects content. */
export type ParentAgeBucket = "bawah_25" | "25_34" | "35_44" | "45_54" | "lain"

/**
 * The language the CHILD HEARS most at home — not the parent's preference.
 *
 * `lain` is not a failure state: it is the roadmap. It tells us which language
 * to build next, and how many families are waiting for it.
 *
 * NOTE: `campur` (code-switched Malay + English) was removed from the options by
 * product decision. The DB CHECK in 0014 still permits the value, so it can be
 * reinstated without a migration if the pilot shows families struggling to pick.
 */
export type HomeLanguage = "melayu" | "english" | "lain"

/** A5 — sets `{panggilan}` used inside every activity script. */
export type Relationship = "ibu" | "ayah" | "nenek" | "datuk" | "lain"

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  ibu: "Ibu",
  ayah: "Ayah",
  nenek: "Nenek",
  datuk: "Datuk",
  lain: "Lain-lain",
}

/** A13 outcome. Drives the dashboard SLT banner, nothing else. */
export type ResultVariant = "A" | "B" | "C"

export interface ScreeningInput {
  /** A7–A11. q5 is null when the child is under 12 months (A11 is skipped). */
  q1: ScreeningAnswer
  q2: ScreeningAnswer
  q3: ScreeningAnswer
  q4: ScreeningAnswer
  q5: ScreeningAnswer | null
  q6: Diagnosis
}

/**
 * Whether "Kadang-kadang" counts as a flag.
 *
 * ⚠ OPEN DECISION — spec §8 item 1, owner: SLT. The spec's stated default is
 * "not a flag", so that is what ships until an SLT says otherwise. Flipping this
 * one constant is the entire change, which is why it lives here alone.
 */
export const KADANG_IS_FLAG = false

/** Which of q1–q5 are flagged. `q5` is excluded when the child is <12 months. */
export function screeningFlags(input: ScreeningInput): string[] {
  const flagged = (a: ScreeningAnswer | null): boolean => {
    if (a === null) return false
    if (a === "jarang") return true
    return a === "kadang" && KADANG_IS_FLAG
  }

  const flags: string[] = []
  if (flagged(input.q1)) flags.push("q1_pandangan_mata")
  if (flagged(input.q2)) flags.push("q2_minat_interaksi")
  if (flagged(input.q3)) flags.push("q3_meniru")
  if (flagged(input.q4)) flags.push("q4_gesture")
  if (flagged(input.q5)) flags.push("q5_vokalisasi")
  return flags
}

/**
 * A13 routing, in priority order (spec §5.1):
 *   1. an existing diagnosis  → C  (use Tutur ALONGSIDE the child's therapy)
 *   2. any screening flag     → B  (recommend an SLT assessment; banner persists)
 *   3. otherwise              → A  (no flags)
 *
 * Note C beats B: a diagnosed child may also be flagged, and the "use this with
 * your therapist" message is the more useful one.
 */
export function resultVariant(input: ScreeningInput): ResultVariant {
  if (input.q6 !== "tiada") return "C"
  return screeningFlags(input).length > 0 ? "B" : "A"
}

/** A3 → does A11 (vokalisasi, relevant only from 12 months) get asked? */
export function asksVokalisasi(age: ChildAgeBucket): boolean {
  return age !== "bawah_12m"
}
