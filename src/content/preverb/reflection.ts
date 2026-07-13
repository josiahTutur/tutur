/* ========================================================================== *
 *  C15–C17 · REFLEKSI IBU BAPA — the same every day, by design.
 *
 *  ── THIS IS THE LEADING INDICATOR ─────────────────────────────────────────
 *  The SLT document says it outright, twice: "Refleksi ibu bapa = leading
 *  indicator. Kemajuan anak = lagging indicator." The child's change may not
 *  appear until Day 7–14. The PARENT's change appears in days — and it is what
 *  causes the child's.
 *
 *  So this is not an epilogue to the tracker. It is the measurement. A pilot that
 *  collected ten observations of the child and nothing about the parent would be
 *  measuring the lagging half of its own thesis.
 *
 *  ── AND IT IS COACHING, NOT A REPORT ──────────────────────────────────────
 *  "Hari ini saya sedar…" — I noticed. Every statement is about HER, and two of
 *  the four are admissions ("saya terlalu cepat membantu"). That is deliberate:
 *  naming the thing you did is how you stop doing it. Which is also why nothing
 *  here is scored, and why ticking "saya terlalu cepat membantu" must never be
 *  treated as a wrong answer. It is the single most useful thing she can tell us.
 *
 *  Content is Malay-only (spec §1.3), like every other 14-day string.
 * ========================================================================== */

/** C15 — "Hari ini saya sedar…" Multi-select; none is a valid answer. */
export interface ReflectionStatement {
  id: string
  text: string
}

export const REFLECTION_STATEMENTS: ReflectionStatement[] = [
  { id: "cepat_bantu", text: "Saya terlalu cepat membantu (perlu sabar lagi)" },
  { id: "tunggu_5s", text: "Saya berjaya tunggu 5 saat atau lebih" },
  { id: "anak_pandang", text: "Anak lebih banyak pandang saya hari ini" },
  { id: "lebih_yakin", text: "Saya rasa lebih yakin sebagai pengajar" },
]

/**
 * C16 — "Hari ini saya rasa…"
 *
 * `perlukan_bantuan` is the one that matters operationally: it opens the support
 * branch and writes a `support_trigger`. A parent who says she needs help and is
 * then handed a confetti screen has been ignored by a machine, and she will not
 * say it twice.
 */
export type Feeling = "lebih_seronok" | "lebih_yakin" | "masih_keliru" | "perlukan_bantuan"

export const FEELINGS: { id: Feeling; text: string }[] = [
  { id: "lebih_seronok", text: "Lebih seronok" },
  { id: "lebih_yakin", text: "Lebih yakin" },
  { id: "masih_keliru", text: "Masih keliru" },
  { id: "perlukan_bantuan", text: "Perlukan bantuan" },
]
