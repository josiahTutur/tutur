/* ========================================================================== *
 *  Activity library — scalable intervention database
 *
 *  Design contract (every activity satisfies ALL simultaneously):
 *    • Routine context     — occurs inside a daily routine (R1–R10)
 *    • Clinical strategy    — built around a validated strategy (S1–S5)
 *    • Communication stage  — distinct execution pathway for T1–T5
 *    • AAC integration      — T1–T3 model Aided Language Input
 *    • Malaysian localization
 *    • Parent coaching       — exact scripts + actions
 *
 *  Dose model: 3 activities/day · 5 min each · 15 min total daily intervention.
 *  Target catalogue: 100 activities (90 core + 10 seasonal). A1–A3 seeded here;
 *  A4–A20+ append to ACTIVITIES with no schema changes.
 * ========================================================================== */

export type StageCode = "T1" | "T2" | "T3" | "T4" | "T5"

/** Per-stage parent-coaching content. */
export interface StageContent {
  stage: StageCode
  instructions: string // Parent Instructions (BM)
  dialogue: string[] // Dialogue Script (BM)
}

/** Optional demo video accompanying an activity. */
export interface ActivityVideo {
  title: string
  duration: string // e.g. "3 min"
  focus: string // e.g. "Perhatian Bersama"
}

/** An AAC symbol the parent models during the activity. */
export interface AacWord {
  label: string
  emoji: string
}

export interface Activity {
  code: string // e.g. "A1"
  title: string
  routine: string // R1–R10
  strategy: string // S1–S5
  strategyName: string // e.g. "Bercakap Banyak"
  coreSkill: string // e.g. "Joint Attention + Parallel Talk"
  type: "Normal" | "Seasonal"
  materials: string[]
  /** AAC symbols relevant to this activity (for the in-activity AAC board). */
  aacWords: AacWord[]
  /** Optional demo video — not every activity has one. */
  video?: ActivityVideo
  stages: StageContent[]
}

/* -------------------------------------------------------------------------- */
/*  Reference maps                                                            */
/* -------------------------------------------------------------------------- */

export const ROUTINE_LABELS: Record<string, string> = {
  R1: "Masa Bermain",
  R2: "Masa Mandi",
  R3: "Masa Makan",
  R4: "Aktiviti Luar",
  R5: "Berpakaian",
  R6: "Dalam Kereta",
  R7: "Sebelum Tidur",
  R8: "Pasar Raya",
  R9: "Masa Buku",
  R10: "Arts & Craft",
}

/** Stage display name + its fundamentally distinct therapeutic objective. */
export const STAGE_INFO: Record<StageCode, { name: string; goal: string }> = {
  T1: {
    name: "Peneroka",
    goal: "Bina perhatian & kesedaran persekitaran",
  },
  T2: {
    name: "Pengguna Isyarat",
    goal: "Bina komunikasi yang disengajakan",
  },
  T3: {
    name: "Pengguna Perkataan",
    goal: "Kembangkan perkataan tunggal kepada frasa 2-perkataan",
  },
  T4: {
    name: "Pengguna Ayat",
    goal: "Bina pembentukan ayat & jawapan soalan WH",
  },
  T5: {
    name: "Pencerita Harian",
    goal: "Bina bahasa naratif, ingatan, penaakulan emosi & urutan",
  },
}

/** AAC is modeled (not tested) at T1–T3 via Aided Language Input. */
export const AAC_STAGES: StageCode[] = ["T1", "T2", "T3"]
export const AAC_CORE_WORDS = [
  "NAK",
  "LAGI",
  "HABIS",
  "JOM",
  "TOLONG",
  "SINI",
  "LIHAT",
]

export const STAGE_ORDER: StageCode[] = ["T1", "T2", "T3", "T4", "T5"]

/* -------------------------------------------------------------------------- */
/*  Activities                                                                */
/* -------------------------------------------------------------------------- */

export const ACTIVITIES: Activity[] = [
  {
    code: "A1",
    title: "Jom Masuk Keluar Kotak Shopee",
    routine: "R1",
    strategy: "S1",
    strategyName: "Bercakap Banyak",
    coreSkill: "Joint Attention + Parallel Talk",
    type: "Normal",
    materials: ["Kotak Shopee kosong", "Papan AAC"],
    aacWords: [
      { label: "Lihat", emoji: "👀" },
      { label: "Jom", emoji: "🙌" },
      { label: "Nak", emoji: "✋" },
      { label: "Masuk", emoji: "📥" },
      { label: "Keluar", emoji: "📤" },
      { label: "Lagi", emoji: "➕" },
      { label: "Kotak", emoji: "📦" },
      { label: "Habis", emoji: "✅" },
    ],
    video: {
      title: "Demo: Jom Masuk Keluar Kotak",
      duration: "3 min",
      focus: "Perhatian Bersama",
    },
    stages: [
      {
        stage: "T1",
        instructions:
          'Letak anak depan kotak Shopee. Bila anak pandang atau sentuh kotak, terus model perkataan pada papan AAC. Sentuh ikon "LIHAT" sambil tunjuk kotak. Fokus pada perhatian bersama, bukan respons lisan.',
        dialogue: ["Lihaaat... kotak.", "Masuk...", "Keluar...", "Wahhh!", "Jom masuk!"],
      },
      {
        stage: "T2",
        instructions:
          'Jika anak tunjuk, pandang, atau cuba masuk kotak, anggap itu komunikasi. Sentuh simbol "JOM" atau "NAK" pada AAC dan respons kepada niat anak.',
        dialogue: ["Ohh, adik NAK kotak.", "Jom masuk.", "Masuk lagi?", "Wah, adik pilih kotak."],
      },
      {
        stage: "T3",
        instructions:
          'Jika anak sebut satu perkataan seperti "kotak" atau "masuk", kembangkan kepada dua perkataan. Sentuh AAC sebagai sokongan.',
        dialogue: ['Anak: "Masuk."', 'Ibu: "Nak masuk."', 'Anak: "Kotak."', 'Ibu: "Kotak besar."'],
      },
      {
        stage: "T4",
        instructions: "Galakkan soalan WH secara santai semasa bermain.",
        dialogue: ["Nak masuk mana?", "Siapa dalam kotak?", "Apa jadi bila tutup kotak?"],
      },
      {
        stage: "T5",
        instructions: "Galakkan imaginasi dan sebab-akibat.",
        dialogue: [
          "Bayangkan kotak ni kapal angkasa. Kita nak pergi mana?",
          "Kenapa astronaut perlukan kapal?",
          "Ceritakan apa berlaku mula-mula, lepas tu, dan akhirnya.",
        ],
      },
    ],
  },
  {
    code: "A2",
    title: "Celup Biskut Dalam Milo",
    routine: "R3",
    strategy: "S3",
    strategyName: "Ulang, Panjang & Kembang",
    coreSkill: "Language Expansion",
    type: "Normal",
    materials: ["Milo", "Biskut Marie", "Cawan", "Papan AAC"],
    aacWords: [
      { label: "Lihat", emoji: "👀" },
      { label: "Nak", emoji: "✋" },
      { label: "Lagi", emoji: "➕" },
      { label: "Milo", emoji: "🥤" },
      { label: "Biskut", emoji: "🍪" },
      { label: "Celup", emoji: "💧" },
      { label: "Sedap", emoji: "😋" },
      { label: "Habis", emoji: "✅" },
    ],
    video: {
      title: "Demo: Celup Biskut Dalam Milo",
      duration: "4 min",
      focus: "Perluasan Bahasa",
    },
    stages: [
      {
        stage: "T1",
        instructions:
          'Pegang biskut dekat muka sendiri supaya anak nampak. Sentuh simbol "LIHAT" pada AAC setiap kali sebelum celup.',
        dialogue: ["Lihaaat...", "Celup...", "Masuk Milo...", "Oops!"],
      },
      {
        stage: "T2",
        instructions:
          "Tunggu anak pandang biskut atau hulur tangan. Tafsirkan tindakan itu sebagai permintaan.",
        dialogue: ["Ohh, adik NAK biskut.", "Nak lagi?", "Lagi Milo?"],
      },
      {
        stage: "T3",
        instructions: "Kembangkan satu perkataan menjadi dua perkataan.",
        dialogue: ['Anak: "Milo."', 'Ibu: "Nak Milo."', 'Anak: "Biskut."', 'Ibu: "Biskut celup."'],
      },
      {
        stage: "T4",
        instructions: "Galakkan pemerhatian dan penjelasan.",
        dialogue: ["Apa jadi bila biskut masuk Milo?", "Kenapa biskut jadi lembik?"],
      },
      {
        stage: "T5",
        instructions: "Galakkan pemikiran sebab-akibat dan pengalaman peribadi.",
        dialogue: [
          "Kalau celup terlalu lama, apa akan jadi?",
          "Pernah tak biskut jatuh dalam Milo? Ceritakan.",
        ],
      },
    ],
  },
  {
    code: "A3",
    title: "Cari Stoking Hilang",
    routine: "R5",
    strategy: "S2",
    strategyName: "Tunggu & Beri Ruang",
    coreSkill: "Withhold & Wait",
    type: "Normal",
    materials: ["Stoking keluarga", "Papan AAC"],
    aacWords: [
      { label: "Lihat", emoji: "👀" },
      { label: "Mana", emoji: "❓" },
      { label: "Sini", emoji: "👇" },
      { label: "Nak", emoji: "✋" },
      { label: "Stoking", emoji: "🧦" },
      { label: "Jumpa", emoji: "🎉" },
      { label: "Tolong", emoji: "🙏" },
      { label: "Habis", emoji: "✅" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: 'Pegang stoking dekat muka. Sentuh simbol "LIHAT" sebelum tunjuk.',
        dialogue: ["Lihaaat stoking.", "Mana stoking?", "Oh jumpa!"],
      },
      {
        stage: "T2",
        instructions: "Sorok satu stoking. Tunggu anak tunjuk atau pandang sebelum bantu.",
        dialogue: ["Mana satu?", "Ohh adik tunjuk sini.", "Jumpa dah."],
      },
      {
        stage: "T3",
        instructions: "Gunakan pilihan dan perluaskan bahasa.",
        dialogue: ['Anak: "Sini."', 'Ibu: "Stoking sini."', 'Anak: "Jumpa."', 'Ibu: "Dah jumpa."'],
      },
      {
        stage: "T4",
        instructions: "Gunakan soalan WH.",
        dialogue: ["Di mana stoking biru?", "Siapa punya stoking ni?"],
      },
      {
        stage: "T5",
        instructions: "Galakkan ingatan dan penjelasan.",
        dialogue: [
          "Kenapa stoking ni boleh hilang?",
          "Ceritakan langkah-langkah macam mana kita jumpa stoking tadi.",
        ],
      },
    ],
  },
]
