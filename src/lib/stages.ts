import { type Lang } from "@/lib/i18n"

/* ========================================================================== *
 *  Communication stages — the single source of truth for the 5 child
 *  communication levels (Tahap 1–5).
 *
 *  Shared by StageIntro (the educational carousel shown during onboarding) and
 *  ProfilingResults (the post-analysis stage explorer), so a stage's name, age
 *  band, description and accent hue live in ONE place per language.
 *
 *  `hue` is the base neon hue for that stage's glow; it climbs 187 → 330
 *  (teal → pink) so the set reads as one warming spectrum across both screens.
 * ========================================================================== */

export interface Stage {
  /** 1–5. */
  level: number
  name: string
  /** Typical age band, e.g. "6+ Bulan". */
  age: string
  desc: string
  /** Base HSL hue for this stage's accent glow. */
  hue: number
}

export const STAGE_HUES = [187, 210, 270, 300, 330] as const

export const STAGES_BY_LANG: Record<Lang, Stage[]> = {
  ms: [
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
  ],
  en: [
    {
      level: 1,
      name: "Explorer",
      age: "6+ Months",
      desc: "Your child is starting to respond to sounds and facial expressions. However, they aren't yet communicating intentionally or with a specific meaning.",
      hue: 187,
    },
    {
      level: 2,
      name: "Gestures",
      age: "10+ Months",
      desc: "Your child is starting to communicate using body language, hand gestures, sounds, and eye gaze. Consistent words haven't begun yet.",
      hue: 210,
    },
    {
      level: 3,
      name: "Words",
      age: "1+ Year",
      desc: "Your child is starting to use single words and early two-word combinations. They're also getting good at naming the objects around them.",
      hue: 270,
    },
    {
      level: 4,
      name: "Sentences",
      age: "3+ Years",
      desc: 'Your child can build short sentences of 3 to 4 words. They can also answer simple questions like "what", "where", and "who".',
      hue: 300,
    },
    {
      level: 5,
      name: "Stories",
      age: "5+ Years",
      desc: "Your child can use long and complex sentences, tell stories in an organised sequence, and express their emotions and feelings.",
      hue: 330,
    },
  ],
}
