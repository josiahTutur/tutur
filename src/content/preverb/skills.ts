/* ========================================================================== *
 *  PREVERB · the skill glossary — what each technique actually means.
 *
 *  ⚠ PLACEHOLDER. These explanations are MINE, not an SLT's. The day configs name
 *  the skills ("Self Talk", "Withhold & Wait") but nothing in the content defines
 *  them, and a parent tapping a chip has to be told something. Every line below
 *  needs sign-off before the pilot — a parent will read these as instructions.
 *
 *  ── MALAY ONLY, ON PURPOSE ────────────────────────────────────────────────
 *  Spec §1.3: the 14-day content is Malay-only for the pilot; only the app's
 *  chrome is bilingual. These are content — they are what the SLT is teaching —
 *  so they follow the same rule as `arahan` and `focus_line` beside them.
 *
 *  The KEYS are the skill names exactly as they appear in `skills_today`. A skill
 *  with no entry here simply doesn't expand, rather than showing an empty panel.
 * ========================================================================== */

export interface SkillExplainer {
  /** One line: what the technique IS. */
  what: string
  /** One line the parent can actually say or do tonight. */
  how: string
}

export const SKILLS: Record<string, SkillExplainer> = {
  "Self Talk": {
    what: "Anda cerita apa yang ANDA sedang buat, kuat-kuat, sambil buat.",
    how: "“Mama tuang air… air penuh… mama minum.” Tak perlu anak jawab. Anda cuma beri perkataan kepada perbuatan.",
  },
  "Parallel Talk": {
    what: "Anda cerita apa yang ANAK sedang buat, kuat-kuat, sambil dia buat.",
    how: "“Adam tolak kereta… kereta laju!” Ikut dia — jangan arah dia. Anda beri perkataan kepada dunia dia.",
  },
  "Withhold & Wait": {
    what: "Anda berhenti, dan beri anak RUANG untuk mula dahulu.",
    how: "Tunggu 5 saat. Jangan cadang, jangan bantu, jangan ulang soalan. Bila dia beri isyarat — beri SEGERA, dalam 2 saat.",
  },
}
