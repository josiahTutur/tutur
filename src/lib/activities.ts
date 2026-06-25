/* ========================================================================== *
 *  Activity library — intervention database
 *
 *  Each activity belongs to a daily routine (R1–R10), builds specific parent
 *  skills, and has a distinct execution pathway per communication stage (the
 *  CCS1–CCS5 levels, stored as T1–T5). Per stage we capture: Arahan
 *  (instructions), Skrip (dialogue), and Isyarat Anak yang Dicari (the target
 *  child signal). After each step Maya prompts the parent to reflect.
 *
 *  Day-based programme for the goal: "Saya nak kami boleh berhubung dan
 *  berkomunikasi dengan lebih baik."
 * ========================================================================== */

export type StageCode = "T1" | "T2" | "T3" | "T4" | "T5"

/** Per-stage parent-coaching content (one CCS level). */
export interface StageContent {
  stage: StageCode
  instructions: string // Arahan
  dialogue: string[] // Skrip
  /** Isyarat Anak yang Dicari — the child signal the parent looks for. */
  targetSignal?: string
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
  /** Day in the programme sequence (1-based). */
  day?: number
  /** Situational set-up note, with embedded (T)(P)(D) technique cues. */
  setup?: string
  /** "Kemahiran dibina untuk parents" — the skills this activity builds. */
  parentSkills?: string[]
  strategy: string // S1–S5
  strategyName: string // e.g. "Withhold & Wait"
  coreSkill: string // e.g. "Joint Attention + Parallel Talk"
  type: "Normal" | "Seasonal"
  materials: string[]
  /** AAC symbols relevant to this activity (for the in-activity AAC board). */
  aacWords: AacWord[]
  /** Optional demo video — not every activity has one. */
  video?: ActivityVideo
  stages: StageContent[]
}

/** Reflection prompt Maya shows after each step. */
export const MAYA_REFLECTION_PROMPT = "Apa yang anda perhatikan / rasa?"

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

/** Routines available in the current pilot — the rest are "coming soon". */
export const AVAILABLE_ROUTINES = ["R1", "R2", "R3", "R9"]

export function isRoutineComingSoon(code: string): boolean {
  return !AVAILABLE_ROUTINES.includes(code)
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
/*  Activities — day-based programme                                          */
/* -------------------------------------------------------------------------- */

export const ACTIVITIES: Activity[] = [
  {
    code: "A1",
    title: "Masa Buih (Bubble Time)",
    routine: "R2",
    day: 1,
    setup:
      "Duduk hadap anak (T). Perhati bila anak pandang buih (P). Kira 5 saat dalam hati — jangan tiup dulu (D).",
    parentSkills: [
      "Self Talk (Naratif tindakan sendiri)",
      "Auditory Closure + Withhold & Wait (Tahan tiupan sehingga anak beri isyarat)",
    ],
    strategy: "S2",
    strategyName: "Self Talk & Withhold",
    coreSkill: "Auditory Closure + Withhold & Wait",
    type: "Normal",
    materials: ["Botol buih", "Sabun buih"],
    aacWords: [
      { label: "Buih", emoji: "🫧" },
      { label: "Tiup", emoji: "💨" },
      { label: "Nak", emoji: "✋" },
      { label: "Lagi", emoji: "➕" },
      { label: "Lihat", emoji: "👀" },
      { label: "Habis", emoji: "✅" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Tiup → berhenti → pandang. Raikan capai/senyum.",
        dialogue: [
          "“Knock knock knock! ‘Ibu tiuppp’ (gambarkan tindakan sendiri)… tahan tiupan sehingga anak beri isyarat. BUIH!”",
        ],
        targetSignal: "Pandang buih / capai tangan",
      },
      {
        stage: "T2",
        instructions: "Hulur tangan / buat bunyi (Wuu).",
        dialogue: ["‘Nak lagi?’ [tunggu 5s] → bagi bila anak hulur/bunyi."],
        targetSignal: "Hulur tangan / buat bunyi",
      },
      {
        stage: "T3",
        instructions:
          "Ibu memegang buih dan botol sabun, pandang mata anak, tumpu perhatian, senyum. [beri dua pilihan]",
        dialogue: ["“Wahhh buihhh. Nak buih ke nak botol?”"],
        targetSignal: "Tunjuk / kata “Nak”",
      },
      {
        stage: "T4",
        instructions:
          "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
        dialogue: ["“Siapa nak tiup buih?”"],
        targetSignal: "Minta dengan kata/ayat: “Ali nak tiup pula”",
      },
      {
        stage: "T5",
        instructions:
          "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
        dialogue: ["“Siapa nak tiup buih?”"],
        targetSignal: "Minta dengan kata/ayat: “Ali nak tiup pula”",
      },
    ],
  },
  {
    code: "A2",
    title: "Waktu Makan, Duduk Bersama (Mealtime Engagement)",
    routine: "R3",
    day: 2,
    setup:
      "Duduk hadap anak — mata ke mata (T). Perhati bila anak pandang makanan atau pandang ibu (P). JANGAN beri makanan sebelum kira 5 — ini momen komunikasi (D).",
    parentSkills: ["Withhold & Wait (Beri Pilihan + Hargai Usaha)"],
    strategy: "S2",
    strategyName: "Withhold & Wait",
    coreSkill: "Withhold & Wait + Beri Pilihan",
    type: "Normal",
    materials: ["Makanan kegemaran anak", "Pinggan / mangkuk"],
    aacWords: [
      { label: "Nasi", emoji: "🍚" },
      { label: "Roti", emoji: "🍞" },
      { label: "Nak", emoji: "✋" },
      { label: "Makan", emoji: "🍽️" },
      { label: "Lagi", emoji: "➕" },
      { label: "Habis", emoji: "✅" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Letak makanan dalam pandangan. Kira 5. Beri bila anak capai/pandang.",
        dialogue: ["“[Pandang, kira 5 saat, beri] ‘Nasi!’ [nama selepas beri].”"],
        targetSignal: "Capai tangan / pandang ibu",
      },
      {
        stage: "T2",
        instructions: "Bunyi / hulur tangan.",
        dialogue: ["‘Nak?’ [tunggu 5s] → bagi bila anak hulur/bunyi."],
        targetSignal: "Hulur tangan / buat bunyi",
      },
      {
        stage: "T3",
        instructions:
          "Ibu pegang nasi dan roti, pandang mata anak, tumpu perhatian, senyum. [beri dua pilihan]",
        dialogue: ["“Wahhh sedapnyaaa! Nak nasi ke roti?”"],
        targetSignal: "Tunjuk pilihan / kata nama makanan",
      },
      {
        stage: "T4",
        instructions:
          "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
        dialogue: ["“Nak makan apa hari ni? Boleh pilih sendiri.”"],
        targetSignal:
          "Minta dengan kata/ayat: “Saya nak nasi dengan telur goreng” (atau lauk kegemaran anak)",
      },
      {
        stage: "T5",
        instructions:
          "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
        dialogue: ["“Nak makan apa hari ni? Boleh pilih sendiri.”"],
        targetSignal:
          "Minta dengan kata/ayat: “Saya nak nasi dengan telur goreng” (atau lauk kegemaran anak)",
      },
    ],
  },
  {
    code: "A3",
    title: "Sorok Sorok (Peekaboo Routine)",
    routine: "R1",
    day: 3,
    setup:
      "Tengok wajah anak sebelum tunjuk muka (T). Perhati reaksi — senyum, tegang, jangka (P). Beri tempoh, muka menunggu selepas ‘Mana ibu?’ — jangan tergesa (D).",
    parentSkills: [
      "Ambil Giliran: Respons anak (pandangan/bunyi/ketawa) = satu giliran penuh.",
      "Fikiran Yang Sama: Ikut ‘mood’ anak dalam permainan.",
    ],
    strategy: "S4",
    strategyName: "Ambil Giliran",
    coreSkill: "Ambil Giliran + Fikiran Yang Sama",
    type: "Normal",
    materials: ["Kain / tuala kecil"],
    aacWords: [
      { label: "Mana", emoji: "❓" },
      { label: "Ibu", emoji: "👩" },
      { label: "Booo", emoji: "🙈" },
      { label: "Lagi", emoji: "➕" },
      { label: "Giliran", emoji: "🔄" },
      { label: "Main", emoji: "🧸" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Sorok muka dengan kain/tangan. Berhenti. ‘Mana……….ibu?’ [tunggu 3–5 saat]",
        dialogue: ["“Tunjuk muka ‘Booo!’ — ulang rentak sama 5x.”"],
        targetSignal: "Pandang muka ibu / ketawa / jangka",
      },
      {
        stage: "T2",
        instructions:
          "Sorok → tunggu lebih lama, muka menunggu → ‘Mana...?’ [Auditory Closure].",
        dialogue: ["“Mana...? [tunggu 5 saat] ...ibu!”"],
        targetSignal: "Cuba tarik kain / bunyi ‘boo’",
      },
      {
        stage: "T3",
        instructions: "Biar anak sorok muka sendiri, ikut giliran.",
        dialogue: ["“Giliran siapa sekarang?”"],
        targetSignal: "Sorok muka sendiri / ambil giliran",
      },
      {
        stage: "T4",
        instructions: "Cadang / biarkan anak arah permainan.",
        dialogue: ["“Haa, giliran siapa lepas ni?” (sambil tunjuk anak atau diri sendiri)"],
        targetSignal: "Minta dengan kata/ayat: “Saya nak main pula”",
      },
      {
        stage: "T5",
        instructions: "Cadang / biarkan anak arah permainan.",
        dialogue: ["“Haa, giliran siapa lepas ni?” (sambil tunjuk anak atau diri sendiri)"],
        targetSignal: "Minta dengan kata/ayat: “Saya nak main pula”",
      },
    ],
  },
  {
    code: "A4",
    title: "Main Cermin (Mirror Play)",
    routine: "R1",
    day: 4,
    setup:
      "Duduk setaraf anak depan cermin — mata ke mata melalui bayangan (T). Perhati bahagian badan yang anak sentuh/pandang (P). Tunggu 2 saat selepas setiap ayat (D).",
    parentSkills: [
      "Self Talk — naratif TINDAKAN sendiri, bukan identifikasi. Self Talk (‘Ibu gosok hidung’) bukan arahan (‘Gosok hidung!’). Parallel Talk (‘Adik pegang telinga!’) bukan soalan.",
      "Intonasi / Acoustic Highlighting — tekanan pada bahagian badan: ‘ini MATA ibu’. Tiada soalan langsung.",
    ],
    strategy: "S1",
    strategyName: "Self Talk & Parallel Talk",
    coreSkill: "Self Talk + Acoustic Highlighting",
    type: "Normal",
    materials: ["Cermin"],
    aacWords: [
      { label: "Mata", emoji: "👁️" },
      { label: "Hidung", emoji: "👃" },
      { label: "Telinga", emoji: "👂" },
      { label: "Ini", emoji: "👇" },
      { label: "Tengok", emoji: "👀" },
      { label: "Adik", emoji: "🧒" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Mata. Hidung. [2 perkataan saja]",
        dialogue: ["“Ini MATA ibu! Ini MATA adik!”"],
        targetSignal: "Pandang cermin / senyum kepada bayangan",
      },
      {
        stage: "T2",
        instructions: "Tunjuk muka anak dalam cermin. ‘Mata adik! Hidung adik!’",
        dialogue: ["“Ini mata ibu! Ini mata adik!”"],
        targetSignal: "Tunjuk muka sendiri / tiru gerak ibu",
      },
      {
        stage: "T3",
        instructions: "Biar anak sorok muka sendiri, ikut giliran.",
        dialogue: ["“Ini... [tunggu 5 saat] ...hidung!”"],
        targetSignal: "Sebut HIDUNG",
      },
      {
        stage: "T4",
        instructions: "Bercerita / describe bayangan.",
        dialogue: ["“Adik nampak apa dalam cermin? Cerita kat ibu.”"],
        targetSignal: "Bercerita / gambarkan bayangan dalam cermin",
      },
      {
        stage: "T5",
        instructions: "Bercerita / describe bayangan.",
        dialogue: ["“Adik nampak apa dalam cermin? Cerita kat ibu.”"],
        targetSignal: "Bercerita / gambarkan bayangan dalam cermin",
      },
    ],
  },
  {
    code: "A5",
    title: "Bagi Mummy (Give Mummy Game)",
    routine: "R1",
    day: 5,
    setup:
      "Tengok objek yang anak pegang SEBELUM minta (T). Perhati sama ada anak pandang ibu selepas hulur — itu komunikasi (P). Raikan SEGERA dalam masa 2 saat (D).",
    parentSkills: [
      "Ambil Giliran — ‘Giliran anak boleh jadi sekadar pandangan atau senyuman — itu sah.’",
      "Recasting — jika anak kata ‘ni’ [hulur bola] → ‘Bola! Bola biru. Terima kasih!’",
    ],
    strategy: "S3",
    strategyName: "Ambil Giliran & Recasting",
    coreSkill: "Ambil Giliran + Recasting",
    type: "Normal",
    materials: ["Objek / mainan kecil", "Bola"],
    aacWords: [
      { label: "Bagi", emoji: "🤲" },
      { label: "Nah", emoji: "🫴" },
      { label: "Bola", emoji: "⚽" },
      { label: "Nak", emoji: "✋" },
      { label: "Terima kasih", emoji: "🙏" },
      { label: "Lagi", emoji: "➕" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Terima APA SAHAJA yang anak hulur. Raikan. Beri balik.",
        dialogue: ["“[Hulur tangan] [terima apa jua] ‘Terima kasih! Nah!’ [beri balik]”"],
        targetSignal: "Hulur apa-apa objek ke arah ibu",
      },
      {
        stage: "T2",
        instructions: "‘Bagi ibu.’ [tunggu] terima, nama objek, beri balik.",
        dialogue: ["“Bagi ibu. Terima kasih! BOLA!” (apa jua barang yang diberi — bola hanya contoh)"],
        targetSignal: "Hulur objek yang diminta",
      },
      {
        stage: "T3",
        instructions:
          "Bagi ibu bola. Terima kasih! Ini... [tunggu] ...bola! (apa jua barang yang diberi anak)",
        dialogue: ["“Ini... [tunggu 5 saat] ...bola!” (apa jua barang yang diberi — bola hanya contoh)"],
        targetSignal: "Hulur + pandang ibu / senyum",
      },
      {
        stage: "T4",
        instructions: "Bercerita / gambarkan objek.",
        dialogue: ["“Apa yang kamu bagi ini?”"],
        targetSignal: "Nama + gambarkan objek yang dibagi",
      },
      {
        stage: "T5",
        instructions: "Bercerita / gambarkan objek.",
        dialogue: ["“Apa yang kamu bagi ini?”"],
        targetSignal: "Nama + gambarkan objek yang dibagi",
      },
    ],
  },
  {
    code: "A6",
    title: "Buku Gambar / Buku Cerita (Shared Book Reading)",
    routine: "R9",
    day: 6,
    setup:
      "Tengok ke mana anak tunjuk — bukan halaman ikut order (T). Perhati ‘referential look’ — anak pandang gambar → pandang ibu → pandang gambar balik (P). JANGAN buka halaman sehingga anak beri isyarat (D).",
    parentSkills: [
      "Ikut Tumpuan Anak (Joint Attention) — label apa yang anak pandang.",
      "Banyakkan komen, kurangkan soalan (80% komen, 20% soalan).",
    ],
    strategy: "S1",
    strategyName: "Komen & Joint Attention",
    coreSkill: "Joint Attention + Komen",
    type: "Normal",
    materials: ["Buku gambar / buku cerita"],
    aacWords: [
      { label: "Kucing", emoji: "🐱" },
      { label: "Tengok", emoji: "👀" },
      { label: "Buku", emoji: "📖" },
      { label: "Nampak", emoji: "👁️" },
      { label: "Lagi", emoji: "➕" },
      { label: "Apa", emoji: "❓" },
    ],
    stages: [
      {
        stage: "T1",
        instructions: "Label apa yang ANAK pandang, bukan susunan halaman.",
        dialogue: ["“Kucing! Kucing tidur.” [label apa anak pandang]"],
        targetSignal: "Tunjuk / pandang gambar",
      },
      {
        stage: "T2",
        instructions: "‘Oh! [ikut pandang] ...kucing!’ Tunggu sebelum buka halaman.",
        dialogue: ["“Oh! [pandang bersama] Kucing! Kucing besar.”"],
        targetSignal: "Bunyi / tunjuk + pandang ibu (joint attention)",
      },
      {
        stage: "T3",
        instructions: "Komen banyak — 80% komen, 20% soalan. Bukan kuiz.",
        dialogue: ["“Nampak apa? Kucing buat apa?”"],
        targetSignal: "Isi nama gambar / label",
      },
      {
        stage: "T4",
        instructions: "Beri soalan terbuka berkaitan kisah di buku itu.",
        dialogue: ["“Apa yang jadi kat kucing tu?”"],
        targetSignal: "Predict / cerita / soal kembali: “Kucing tu lari” (contoh)",
      },
      {
        stage: "T5",
        instructions: "Beri soalan terbuka berkaitan kisah di buku itu.",
        dialogue: ["“Apa yang jadi kat kucing tu?”"],
        targetSignal: "Predict / cerita / soal kembali: “Kucing tu lari” (contoh)",
      },
    ],
  },
]
