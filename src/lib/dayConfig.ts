/* ========================================================================== *
 *  Per-day content config — the schema for Modul 1 (Mula Berhubung), D1–D14.
 *
 *  The app ships ONE generic "day player"; days 1–14 are pure data. Content
 *  owns the JSON in `src/content/days/`; engineering owns the player.
 *
 *  Source of truth: `JO 110726 Tutur_14days_Revised_Draft_v2.pdf` (H1–H14),
 *  reconciled with `TUTUR_Pilot_Build_Spec_v1.md` §4 and the Maya screen
 *  scripts v2 (screen IDs C1–C18).
 *
 *  LANGUAGE: Malay only. Per spec §1.3, clinical English appears solely in the
 *  SLT export — never in Maya's voice — so these fields are plain `string`,
 *  not the bilingual `Loc<T>` used elsewhere in the app.
 *
 *  NAMING (ratified): `JA1–JA5` = joint-attention ladder (per-day, re-worded
 *  each day). `CCS1–CCS5` = the child's communication stage. These are two
 *  different scales — the old code overloaded `T1–T5` for both. Never reuse it.
 * ========================================================================== */

/** The child's communication stage. CCS4 and CCS5 share one prompt tier. */
export type CcsTier = "CCS1" | "CCS2" | "CCS3" | "CCS4_5"

/** Joint-attention ladder. Descriptors are per-day (see `ja_descriptors`). */
export type JaLevel = "JA1" | "JA2" | "JA3" | "JA4" | "JA5"

/** The 8 pre-speech skills (Kemahiran Pra-Pertuturan). */
export type KpCode = "KP1" | "KP2" | "KP3" | "KP4" | "KP5" | "KP6" | "KP7" | "KP8"

/**
 * Non-KP observation categories that also appear as tracker rows.
 * The PDF mixes these in with KP codes in the 5-row grid.
 */
export type ObservationCategory =
  | KpCode
  | "NIAT_KOMUNIKASI"
  | "REGULASI_EMOSI"
  | "PERMAINAN_SIMBOLIK"

/** The only rating scale for observations. Belum / Muncul / Konsisten. */
export type BmkRating = "belum" | "muncul" | "konsisten"

/** Foundation-pyramid threads woven through each day. */
export type PyramidThread =
  | "connection"
  | "joint_attention"
  | "imitation"
  | "turn_taking"
  | "gesture"
  | "play"
  | "listening"
  | "vocalisation"

/** Which parent/child goal the day serves. */
export type GoalTag = "G1" | "G2" | "G3"

/** Activity phase. Every day runs Persediaan → Semasa → Selesai. */
export type PhaseName = "persediaan" | "semasa" | "selesai"

/* -------------------------------------------------------------------------- */

/**
 * A CCS-graded coaching prompt. Every day has four of these (CCS1, CCS2, CCS3,
 * CCS4_5) — short escalating lines, NOT four full scripts. The main script
 * (`activity_phases`) is flat and shared across all CCS levels.
 */
export interface CcsPrompt {
  ccs: CcsTier
  /** The technique being coached, e.g. "Withhold & Wait", "Beri Pilihan". */
  technique: string
  /** The line the parent says, incl. bracketed stage directions. */
  line: string
}

/** A physical item the parent needs. Drives the Senarai barang + reminders. */
export interface PrepItem {
  item_id: string
  name: string
  /** True for things every home already has — never nags. */
  always_available: boolean
  /** Nag this many days ahead of first use. Ignored if always_available. */
  advance_notice_days?: number
  substitutable?: boolean
  /** Shown on C1 if the item is still unchecked on the day. */
  substitute_script?: string
}

/** One spoken line in the activity player. */
export interface ScriptLine {
  text: string
  /** Delivery cues, e.g. ["santai"], ["berirama"], ["raikan"]. */
  tone_tags?: string[]
  audio_id?: string
  /** Present → the card runs a timer, then flips to the wait state. */
  timer_seconds?: number
  timer_label?: string
}

/**
 * One phase of the activity. `lines` is the default script; `interest_lines`
 * overrides it on days whose script swaps by the toy the child chose on D1
 * (D1, D13, D14). The player picks by `child_profile.interest`.
 */
export interface ActivityPhase {
  phase: PhaseName
  lines: ScriptLine[]
  /** Keyed by interest id, e.g. "barbie" | "masak_masak" | "lego". */
  interest_lines?: Record<string, ScriptLine[]>
}

/** "Bila/jika anak…" — the drawer the parent opens mid-activity. */
export interface SituationalBranch {
  trigger: string
  responses: string[]
  /** Coaching aside, e.g. "bunyi anticipation = KP8, tandai momen!". */
  note?: string
}

/**
 * Reference content shown in the drawer / learn view — what to watch for,
 * grouped by skill. Not a question; the parent reads this, doesn't answer it.
 */
export interface ChildSignalGroup {
  category: ObservationCategory
  /** Heading, e.g. "Pandangan Mata (KP1) · Masa Bermain". */
  label: string
  signals: string[]
  /** Some signals are graded by CCS rather than listed flat. */
  ccs_signals?: Partial<Record<CcsTier, string>>
}

/**
 * A tracker question (screens C5–C14). Max 6 per day: 1 parent indicator
 * (role: "parent_indicator") + 5 child observations.
 *
 * NOTE: `category` may REPEAT within a day (e.g. Day 4 has KP6 twice). Always
 * key rows by `question_id`, never by category.
 */
export interface ObservationQuestion {
  question_id: string
  role: "parent_indicator" | "child_observation"
  /** Absent for the parent indicator. */
  category?: ObservationCategory
  /** Maya's wording. `{anak}` / `{panggilan}` / `{mainan}` are interpolated. */
  text: string
  scale: "bmk"
  /** First Muncul/Konsisten answer auto-creates this milestone_event. */
  milestone_on_positive?: string
}

/** A tally the parent increments during the activity (days 5, 11, 13). */
export interface CountDef {
  count_id: string
  label: string
}

/** A dated first-occurrence worth celebrating and reporting to the SLT. */
export interface MilestoneDef {
  milestone_id: string
  label: string
}

/** TPD coaching — Tunggu · Perhati · Dengar. */
export interface TpdNote {
  /** T — what to notice/hold. */
  tunggu: string
  /** P — what to watch for. */
  perhati: string
  /** D — the wait discipline, e.g. "kira 5s, anak lead, ibu ikut". */
  dengar: string
}

/** Learn-mode assets. Missing assets degrade to skrip with an "akan datang". */
export interface LearnContent {
  video_id?: string
  storyboard_ids?: string[]
  script_mode_note?: string | null
}

/* -------------------------------------------------------------------------- */

/** A normal activity day. Days 1–6 and 8–13. */
export interface DayConfig {
  kind: "activity"
  day_number: number
  /** 1 = D1–D7, 2 = D8–D14. */
  week: 1 | 2
  /** The routine, e.g. "Masa Bermain Bebas". Shown as the card's small label. */
  title: string
  /** What the day is FOR, e.g. "Kenal Pasti Minat". The card's headline. */
  subtitle: string
  /** The daily routine this lives inside, e.g. "mandi", "makan", "main", "tidur", "tv". */
  routine: string
  goal_tag: GoalTag
  /** RECEPTIF / EKSPRESIF / both. */
  emphasis: ("receptif" | "ekspresif")[]

  pyramid_thread: PyramidThread[]
  /** The KPs this day actively works (header badges). */
  kp_active: KpCode[]
  shared_enjoyment: string

  /** "SUB-GOAL IBU BAPA" or "SUB-GOAL ANAK". */
  sub_goal: string
  /**
   * "Kemahiran hari ini" — every technique in play today. The parent USES all of
   * these; they are only GRADED on one of them (see `focus_skill`).
   */
  skills_today: string[]
  /**
   * Which of `skills_today` the day's `focus_line` actually measures.
   *
   * MUST be stated, not inferred. The obvious shortcut — checking whether a skill
   * name appears inside `focus_line` — silently fails on the real content:
   *
   *   Day 5  skills: "Fikiran Yang Sama"  →  focus: "Label ikut pandangan anak…"
   *   Day 6  skills: "Beri Pilihan (2 SAHAJA)" → focus: "Beri Pilihan 2 SAHAJA…"
   *
   * The SLT describes the BEHAVIOUR in the focus line, not the technique's name,
   * so string matching marks the wrong chip — or none at all. Content states it.
   */
  focus_skill: string
  /** Free-text ARAHAN block — the setup instructions. */
  arahan: string
  /**
   * The G1 leading indicator — "FOKUS HARI INI, satu perkara sahaja".
   * This is also the parent_indicator observation question's subject.
   */
  focus_line: string

  ccs_prompts: CcsPrompt[]
  prep_items: PrepItem[]
  learn_content: LearnContent
  activity_phases: ActivityPhase[]
  situational_branches: SituationalBranch[]
  child_signals: ChildSignalGroup[]

  /** Per-day wording of the JA ladder. All five levels required. */
  ja_descriptors: Record<JaLevel, string>
  tpd: TpdNote

  observation_questions: ObservationQuestion[]
  counts: CountDef[]
  milestones: MilestoneDef[]

  /**
   * D1 only (and D2 as a retry). Renders screen C5 "Mainan mana {anak} pilih
   * DULU tadi?" BEFORE the KP questions, and writes `{mainan}` to the child
   * profile — which then contextualises every `interest_lines` day after it.
   * Answering "tidak memilih" makes D2 re-run the D1 choice setup (spec §5.4).
   */
  records_interest?: boolean

  /**
   * AAC suitability from the source content. HIDDEN in the pilot (spec §1.2):
   * store it, render nothing. Kept so the post-pilot AAC layer has the data.
   */
  aac: {
    suitability: "tidak" | "pilihan" | "ya" | "sangat_sesuai"
    note?: string
    suggested_symbols?: string[]
  }

  tomorrow_preview?: string
}

/** A recap day. Days 7 and 14. Replaces the normal loop. */
export interface RecapConfig {
  kind: "recap"
  day_number: 7 | 14
  week: 1 | 2
  title: string

  /** Part 1 — flash recap of the days just completed. */
  review_prompts: { day: number; prompt: string }[]
  /** Part 2 — parent re-runs ONE prior activity. */
  activity_choices: { day_ref: number; label: string }[]
  /** Part 3 — the open Maya question. */
  maya_question: string

  /** "Mana dah semula jadi?" — parent-skill checklist. */
  parent_checklist: string[];
  /** "Banding H1 vs H7/H14" — child-progress checklist. */
  child_checklist: string[]
  /** JA audit, re-using the JA1–JA5 ladder. */
  ja_audit_prompts: string[]

  /** Re-administer the 5 screening questions (spec §5.12). */
  rescreen: boolean
  /** Confidence 1–5, compared against D0. */
  confidence_check: boolean
  tpd: TpdNote

  /** D14 only — the routing recommendation is computed, not authored. */
  routing_display?: boolean
}

export type AnyDayConfig = DayConfig | RecapConfig

/* -------------------------------------------------------------------------- */

/** The three toys offered on Day 1; the child's pick contextualises D2–D14. */
export const INTERESTS = ["barbie", "masak_masak", "lego"] as const
export type Interest = (typeof INTERESTS)[number] | "lain"

/** Malay labels for the BMK scale (canonical — stored values are the keys). */
export const BMK_LABELS: Record<BmkRating, string> = {
  belum: "Belum",
  muncul: "Muncul",
  konsisten: "Konsisten",
}

/** Human labels for the 8 KPs. */
export const KP_LABELS: Record<KpCode, string> = {
  KP1: "Pandangan Mata",
  KP2: "Joint Attention",
  KP3: "Ambil Giliran",
  KP4: "Meniru",
  KP5: "Gesture",
  KP6: "Mendengar",
  KP7: "Bermain",
  KP8: "Vokalisasi",
}
