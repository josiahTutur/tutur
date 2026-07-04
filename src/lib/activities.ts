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

import { type Loc } from "@/lib/i18n"

export type StageCode = "T1" | "T2" | "T3" | "T4" | "T5"

/** Per-stage parent-coaching content (one CCS level). */
export interface StageContent {
  stage: StageCode
  instructions: Loc // Arahan
  dialogue: Loc<string[]> // Skrip
  /** Isyarat Anak yang Dicari — the child signal the parent looks for. */
  targetSignal?: Loc
}

/** Optional demo video accompanying an activity. */
export interface ActivityVideo {
  title: Loc
  duration: string // e.g. "3 min"
  focus: Loc // e.g. "Perhatian Bersama"
}

/** An AAC symbol the parent models during the activity. */
export interface AacWord {
  label: string
  emoji: string
}

export interface Activity {
  code: string // e.g. "A1"
  title: Loc
  routine: string // R1–R10
  /** Day in the programme sequence (1-based). */
  day?: number
  /** Situational set-up note, with embedded (T)(P)(D) technique cues. */
  setup?: Loc
  /** "Kemahiran dibina untuk parents" — the skills this activity builds. */
  parentSkills?: string[]
  strategy: string // S1–S5
  strategyName: Loc // e.g. "Withhold & Wait"
  coreSkill: Loc // e.g. "Joint Attention + Parallel Talk"
  type: "Normal" | "Seasonal"
  materials: Loc<string[]>
  /** AAC symbols relevant to this activity (for the in-activity AAC board). */
  aacWords: AacWord[]
  /** Optional demo video — not every activity has one. */
  video?: ActivityVideo
  stages: StageContent[]
}

/** Reflection prompt Maya shows after each step. */
export const MAYA_REFLECTION_PROMPT: Loc = {
  ms: "Apa yang anda perhatikan / rasa?",
  en: "What did you notice / feel?",
}

/* -------------------------------------------------------------------------- */
/*  Reference maps                                                            */
/* -------------------------------------------------------------------------- */

export const ROUTINE_LABELS: Record<string, Loc> = {
  R1: { ms: "Masa Bermain", en: "Playtime" },
  R2: { ms: "Masa Mandi", en: "Bath Time" },
  R3: { ms: "Masa Makan", en: "Mealtime" },
  R4: { ms: "Aktiviti Luar", en: "Outdoor Activities" },
  R5: { ms: "Berpakaian", en: "Getting Dressed" },
  R6: { ms: "Dalam Kereta", en: "In the Car" },
  R7: { ms: "Sebelum Tidur", en: "Bedtime" },
  R8: { ms: "Pasar Raya", en: "Grocery Shopping" },
  R9: { ms: "Masa Buku", en: "Book Time" },
  R10: { ms: "Arts & Craft", en: "Arts & Craft" },
}

/** Routines available in the current pilot — the rest are "coming soon". */
export const AVAILABLE_ROUTINES = ["R1", "R2", "R3", "R9"]

export function isRoutineComingSoon(code: string): boolean {
  return !AVAILABLE_ROUTINES.includes(code)
}

/** Stage display name + its fundamentally distinct therapeutic objective. */
export const STAGE_INFO: Record<StageCode, { name: Loc; goal: Loc }> = {
  T1: {
    name: { ms: "Peneroka", en: "Explorer" },
    goal: {
      ms: "Bina perhatian & kesedaran persekitaran",
      en: "Build attention & awareness of surroundings",
    },
  },
  T2: {
    name: { ms: "Pengguna Isyarat", en: "Signal User" },
    goal: {
      ms: "Bina komunikasi yang disengajakan",
      en: "Build intentional communication",
    },
  },
  T3: {
    name: { ms: "Pengguna Perkataan", en: "Word User" },
    goal: {
      ms: "Kembangkan perkataan tunggal kepada frasa 2-perkataan",
      en: "Grow single words into 2-word phrases",
    },
  },
  T4: {
    name: { ms: "Pengguna Ayat", en: "Sentence User" },
    goal: {
      ms: "Bina pembentukan ayat & jawapan soalan WH",
      en: "Build sentence formation & answering WH questions",
    },
  },
  T5: {
    name: { ms: "Pencerita Harian", en: "Everyday Storyteller" },
    goal: {
      ms: "Bina bahasa naratif, ingatan, penaakulan emosi & urutan",
      en: "Build narrative language, memory, emotional reasoning & sequencing",
    },
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
    title: { ms: "Masa Buih (Bubble Time)", en: "Bubble Time" },
    routine: "R2",
    day: 1,
    setup: {
      ms: "Duduk hadap anak (T). Perhati bila anak pandang buih (P). Kira 5 saat dalam hati — jangan tiup dulu (D).",
      en: "Sit facing your child (T). Notice when they look at the bubbles (P). Count 5 seconds in your head — don't blow just yet (D).",
    },
    parentSkills: [
      "Self Talk (Naratif tindakan sendiri)",
      "Auditory Closure + Withhold & Wait (Tahan tiupan sehingga anak beri isyarat)",
    ],
    strategy: "S2",
    strategyName: { ms: "Self Talk & Withhold", en: "Self Talk & Withhold" },
    coreSkill: {
      ms: "Auditory Closure + Withhold & Wait",
      en: "Auditory Closure + Withhold & Wait",
    },
    type: "Normal",
    materials: {
      ms: ["Botol buih", "Sabun buih"],
      en: ["Bubble bottle", "Bubble soap"],
    },
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
        instructions: {
          ms: "Tiup → berhenti → pandang. Raikan capai/senyum.",
          en: "Blow → stop → look. Celebrate any reach or smile.",
        },
        dialogue: {
          ms: [
            "“Knock knock knock! ‘Ibu tiuppp’ (gambarkan tindakan sendiri)… tahan tiupan sehingga anak beri isyarat. BUIH!”",
          ],
          en: [
            "“Knock knock knock! ‘Mummy is blowingg’ (narrate your own action)… hold the blow until your child gives a signal. BUBBLES!”",
          ],
        },
        targetSignal: {
          ms: "Pandang buih / capai tangan",
          en: "Looks at the bubbles / reaches out a hand",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "Hulur tangan / buat bunyi (Wuu).",
          en: "Reach out a hand / make a sound (Wuu).",
        },
        dialogue: {
          ms: ["‘Nak lagi?’ [tunggu 5s] → bagi bila anak hulur/bunyi."],
          en: ["‘Want more?’ [wait 5s] → give it when your child reaches/makes a sound."],
        },
        targetSignal: {
          ms: "Hulur tangan / buat bunyi",
          en: "Reaches out a hand / makes a sound",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Ibu memegang buih dan botol sabun, pandang mata anak, tumpu perhatian, senyum. [beri dua pilihan]",
          en: "Hold the bubbles and the soap bottle, make eye contact, stay focused, smile. [offer two choices]",
        },
        dialogue: {
          ms: ["“Wahhh buihhh. Nak buih ke nak botol?”"],
          en: ["“Wowww bubbless. Want the bubbles or the bottle?”"],
        },
        targetSignal: {
          ms: "Tunjuk / kata “Nak”",
          en: "Points / says “Want”",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
          en: "Sit with your child and ask a question. Make eye contact, stay focused, smile. Ask nicely.",
        },
        dialogue: {
          ms: ["“Siapa nak tiup buih?”"],
          en: ["“Who wants to blow bubbles?”"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Ali nak tiup pula”",
          en: "Asks with a word/sentence: “Ali wants a turn to blow”",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
          en: "Sit with your child and ask a question. Make eye contact, stay focused, smile. Ask nicely.",
        },
        dialogue: {
          ms: ["“Siapa nak tiup buih?”"],
          en: ["“Who wants to blow bubbles?”"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Ali nak tiup pula”",
          en: "Asks with a word/sentence: “Ali wants a turn to blow”",
        },
      },
    ],
  },
  {
    code: "A2",
    title: {
      ms: "Waktu Makan, Duduk Bersama (Mealtime Engagement)",
      en: "Mealtime Engagement",
    },
    routine: "R3",
    day: 2,
    setup: {
      ms: "Duduk hadap anak — mata ke mata (T). Perhati bila anak pandang makanan atau pandang ibu (P). JANGAN beri makanan sebelum kira 5 — ini momen komunikasi (D).",
      en: "Sit facing your child — eye to eye (T). Notice when they look at the food or look at you (P). Do NOT give the food before counting 5 — this is a communication moment (D).",
    },
    parentSkills: ["Withhold & Wait (Beri Pilihan + Hargai Usaha)"],
    strategy: "S2",
    strategyName: { ms: "Withhold & Wait", en: "Withhold & Wait" },
    coreSkill: {
      ms: "Withhold & Wait + Beri Pilihan",
      en: "Withhold & Wait + Offer Choices",
    },
    type: "Normal",
    materials: {
      ms: ["Makanan kegemaran anak", "Pinggan / mangkuk"],
      en: ["Your child's favourite food", "Plate / bowl"],
    },
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
        instructions: {
          ms: "Letak makanan dalam pandangan. Kira 5. Beri bila anak capai/pandang.",
          en: "Place the food in view. Count 5. Give it when your child reaches/looks.",
        },
        dialogue: {
          ms: ["“[Pandang, kira 5 saat, beri] ‘Nasi!’ [nama selepas beri].”"],
          en: ["“[Look, count 5 seconds, give] ‘Rice!’ [name it after giving].”"],
        },
        targetSignal: {
          ms: "Capai tangan / pandang ibu",
          en: "Reaches out a hand / looks at you",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "Bunyi / hulur tangan.",
          en: "Makes a sound / reaches out a hand.",
        },
        dialogue: {
          ms: ["‘Nak?’ [tunggu 5s] → bagi bila anak hulur/bunyi."],
          en: ["‘Want?’ [wait 5s] → give it when your child reaches/makes a sound."],
        },
        targetSignal: {
          ms: "Hulur tangan / buat bunyi",
          en: "Reaches out a hand / makes a sound",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Ibu pegang nasi dan roti, pandang mata anak, tumpu perhatian, senyum. [beri dua pilihan]",
          en: "Hold the rice and the bread, make eye contact, stay focused, smile. [offer two choices]",
        },
        dialogue: {
          ms: ["“Wahhh sedapnyaaa! Nak nasi ke roti?”"],
          en: ["“Wowww so yummyyy! Want rice or bread?”"],
        },
        targetSignal: {
          ms: "Tunjuk pilihan / kata nama makanan",
          en: "Points to a choice / says the name of the food",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
          en: "Sit with your child and ask a question. Make eye contact, stay focused, smile. Ask nicely.",
        },
        dialogue: {
          ms: ["“Nak makan apa hari ni? Boleh pilih sendiri.”"],
          en: ["“What would you like to eat today? You can choose yourself.”"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Saya nak nasi dengan telur goreng” (atau lauk kegemaran anak)",
          en: "Asks with a word/sentence: “I want rice with fried egg” (or your child's favourite dish)",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Ibu duduk bersama anak, tanya soalan. Pandang mata anak, tumpu perhatian, senyum. Minta baik-baik.",
          en: "Sit with your child and ask a question. Make eye contact, stay focused, smile. Ask nicely.",
        },
        dialogue: {
          ms: ["“Nak makan apa hari ni? Boleh pilih sendiri.”"],
          en: ["“What would you like to eat today? You can choose yourself.”"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Saya nak nasi dengan telur goreng” (atau lauk kegemaran anak)",
          en: "Asks with a word/sentence: “I want rice with fried egg” (or your child's favourite dish)",
        },
      },
    ],
  },
  {
    code: "A3",
    title: { ms: "Sorok Sorok (Peekaboo Routine)", en: "Peekaboo Routine" },
    routine: "R1",
    day: 3,
    setup: {
      ms: "Tengok wajah anak sebelum tunjuk muka (T). Perhati reaksi — senyum, tegang, jangka (P). Beri tempoh, muka menunggu selepas ‘Mana ibu?’ — jangan tergesa (D).",
      en: "Look at your child's face before revealing yours (T). Notice their reaction — smiling, tensing, anticipating (P). Give a pause, hold a waiting face after ‘Where's mummy?’ — don't rush (D).",
    },
    parentSkills: [
      "Ambil Giliran: Respons anak (pandangan/bunyi/ketawa) = satu giliran penuh.",
      "Fikiran Yang Sama: Ikut ‘mood’ anak dalam permainan.",
    ],
    strategy: "S4",
    strategyName: { ms: "Ambil Giliran", en: "Taking Turns" },
    coreSkill: {
      ms: "Ambil Giliran + Fikiran Yang Sama",
      en: "Taking Turns + Shared Thinking",
    },
    type: "Normal",
    materials: {
      ms: ["Kain / tuala kecil"],
      en: ["Cloth / small towel"],
    },
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
        instructions: {
          ms: "Sorok muka dengan kain/tangan. Berhenti. ‘Mana……….ibu?’ [tunggu 3–5 saat]",
          en: "Hide your face with the cloth/hands. Pause. ‘Where………is mummy?’ [wait 3–5 seconds]",
        },
        dialogue: {
          ms: ["“Tunjuk muka ‘Booo!’ — ulang rentak sama 5x.”"],
          en: ["“Reveal your face ‘Booo!’ — repeat the same rhythm 5x.”"],
        },
        targetSignal: {
          ms: "Pandang muka ibu / ketawa / jangka",
          en: "Looks at your face / laughs / anticipates",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "Sorok → tunggu lebih lama, muka menunggu → ‘Mana...?’ [Auditory Closure].",
          en: "Hide → wait longer, hold a waiting face → ‘Where...?’ [Auditory Closure].",
        },
        dialogue: {
          ms: ["“Mana...? [tunggu 5 saat] ...ibu!”"],
          en: ["“Where...? [wait 5 seconds] ...mummy!”"],
        },
        targetSignal: {
          ms: "Cuba tarik kain / bunyi ‘boo’",
          en: "Tries to pull the cloth / makes a ‘boo’ sound",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Biar anak sorok muka sendiri, ikut giliran.",
          en: "Let your child hide their own face, take turns.",
        },
        dialogue: {
          ms: ["“Giliran siapa sekarang?”"],
          en: ["“Whose turn is it now?”"],
        },
        targetSignal: {
          ms: "Sorok muka sendiri / ambil giliran",
          en: "Hides their own face / takes a turn",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Cadang / biarkan anak arah permainan.",
          en: "Suggest / let your child lead the game.",
        },
        dialogue: {
          ms: ["“Haa, giliran siapa lepas ni?” (sambil tunjuk anak atau diri sendiri)"],
          en: ["“Haa, whose turn is next?” (while pointing to your child or yourself)"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Saya nak main pula”",
          en: "Asks with a word/sentence: “I want a turn to play”",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Cadang / biarkan anak arah permainan.",
          en: "Suggest / let your child lead the game.",
        },
        dialogue: {
          ms: ["“Haa, giliran siapa lepas ni?” (sambil tunjuk anak atau diri sendiri)"],
          en: ["“Haa, whose turn is next?” (while pointing to your child or yourself)"],
        },
        targetSignal: {
          ms: "Minta dengan kata/ayat: “Saya nak main pula”",
          en: "Asks with a word/sentence: “I want a turn to play”",
        },
      },
    ],
  },
  {
    code: "A4",
    title: { ms: "Main Cermin (Mirror Play)", en: "Mirror Play" },
    routine: "R1",
    day: 4,
    setup: {
      ms: "Duduk setaraf anak depan cermin — mata ke mata melalui bayangan (T). Perhati bahagian badan yang anak sentuh/pandang (P). Tunggu 2 saat selepas setiap ayat (D).",
      en: "Sit at your child's level in front of the mirror — eye to eye through the reflection (T). Notice which body part your child touches/looks at (P). Wait 2 seconds after each sentence (D).",
    },
    parentSkills: [
      "Self Talk — naratif TINDAKAN sendiri, bukan identifikasi. Self Talk (‘Ibu gosok hidung’) bukan arahan (‘Gosok hidung!’). Parallel Talk (‘Adik pegang telinga!’) bukan soalan.",
      "Intonasi / Acoustic Highlighting — tekanan pada bahagian badan: ‘ini MATA ibu’. Tiada soalan langsung.",
    ],
    strategy: "S1",
    strategyName: {
      ms: "Self Talk & Parallel Talk",
      en: "Self Talk & Parallel Talk",
    },
    coreSkill: {
      ms: "Self Talk + Acoustic Highlighting",
      en: "Self Talk + Acoustic Highlighting",
    },
    type: "Normal",
    materials: {
      ms: ["Cermin"],
      en: ["Mirror"],
    },
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
        instructions: {
          ms: "Mata. Hidung. [2 perkataan saja]",
          en: "Eyes. Nose. [just 2 words]",
        },
        dialogue: {
          ms: ["“Ini MATA ibu! Ini MATA adik!”"],
          en: ["“These are mummy's EYES! These are baby's EYES!”"],
        },
        targetSignal: {
          ms: "Pandang cermin / senyum kepada bayangan",
          en: "Looks at the mirror / smiles at the reflection",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "Tunjuk muka anak dalam cermin. ‘Mata adik! Hidung adik!’",
          en: "Point to your child's face in the mirror. ‘Baby's eyes! Baby's nose!’",
        },
        dialogue: {
          ms: ["“Ini mata ibu! Ini mata adik!”"],
          en: ["“These are mummy's eyes! These are baby's eyes!”"],
        },
        targetSignal: {
          ms: "Tunjuk muka sendiri / tiru gerak ibu",
          en: "Points to their own face / imitates your movements",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Biar anak sorok muka sendiri, ikut giliran.",
          en: "Let your child hide their own face, take turns.",
        },
        dialogue: {
          ms: ["“Ini... [tunggu 5 saat] ...hidung!”"],
          en: ["“This is... [wait 5 seconds] ...the nose!”"],
        },
        targetSignal: {
          ms: "Sebut HIDUNG",
          en: "Says NOSE",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Bercerita / describe bayangan.",
          en: "Tell a story / describe the reflection.",
        },
        dialogue: {
          ms: ["“Adik nampak apa dalam cermin? Cerita kat ibu.”"],
          en: ["“What do you see in the mirror? Tell mummy about it.”"],
        },
        targetSignal: {
          ms: "Bercerita / gambarkan bayangan dalam cermin",
          en: "Tells a story / describes the reflection in the mirror",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Bercerita / describe bayangan.",
          en: "Tell a story / describe the reflection.",
        },
        dialogue: {
          ms: ["“Adik nampak apa dalam cermin? Cerita kat ibu.”"],
          en: ["“What do you see in the mirror? Tell mummy about it.”"],
        },
        targetSignal: {
          ms: "Bercerita / gambarkan bayangan dalam cermin",
          en: "Tells a story / describes the reflection in the mirror",
        },
      },
    ],
  },
  {
    code: "A5",
    title: { ms: "Bagi Mummy (Give Mummy Game)", en: "Give Mummy Game" },
    routine: "R1",
    day: 5,
    setup: {
      ms: "Tengok objek yang anak pegang SEBELUM minta (T). Perhati sama ada anak pandang ibu selepas hulur — itu komunikasi (P). Raikan SEGERA dalam masa 2 saat (D).",
      en: "Look at the object your child is holding BEFORE asking (T). Notice whether they look at you after handing it over — that's communication (P). Celebrate IMMEDIATELY, within 2 seconds (D).",
    },
    parentSkills: [
      "Ambil Giliran — ‘Giliran anak boleh jadi sekadar pandangan atau senyuman — itu sah.’",
      "Recasting — jika anak kata ‘ni’ [hulur bola] → ‘Bola! Bola biru. Terima kasih!’",
    ],
    strategy: "S3",
    strategyName: {
      ms: "Ambil Giliran & Recasting",
      en: "Taking Turns & Recasting",
    },
    coreSkill: {
      ms: "Ambil Giliran + Recasting",
      en: "Taking Turns + Recasting",
    },
    type: "Normal",
    materials: {
      ms: ["Objek / mainan kecil", "Bola"],
      en: ["An object / small toy", "Ball"],
    },
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
        instructions: {
          ms: "Terima APA SAHAJA yang anak hulur. Raikan. Beri balik.",
          en: "Accept WHATEVER your child hands over. Celebrate it. Give it back.",
        },
        dialogue: {
          ms: ["“[Hulur tangan] [terima apa jua] ‘Terima kasih! Nah!’ [beri balik]”"],
          en: ["“[Reach out a hand] [accept anything] ‘Thank you! Here you go!’ [give it back]”"],
        },
        targetSignal: {
          ms: "Hulur apa-apa objek ke arah ibu",
          en: "Hands any object towards you",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "‘Bagi ibu.’ [tunggu] terima, nama objek, beri balik.",
          en: "‘Give it to mummy.’ [wait] accept it, name the object, give it back.",
        },
        dialogue: {
          ms: ["“Bagi ibu. Terima kasih! BOLA!” (apa jua barang yang diberi — bola hanya contoh)"],
          en: ["“Give it to mummy. Thank you! BALL!” (whatever object is given — ball is just an example)"],
        },
        targetSignal: {
          ms: "Hulur objek yang diminta",
          en: "Hands over the object requested",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Bagi ibu bola. Terima kasih! Ini... [tunggu] ...bola! (apa jua barang yang diberi anak)",
          en: "Give mummy the ball. Thank you! This is... [wait] ...a ball! (whatever object your child gives)",
        },
        dialogue: {
          ms: ["“Ini... [tunggu 5 saat] ...bola!” (apa jua barang yang diberi — bola hanya contoh)"],
          en: ["“This is... [wait 5 seconds] ...a ball!” (whatever object is given — ball is just an example)"],
        },
        targetSignal: {
          ms: "Hulur + pandang ibu / senyum",
          en: "Hands it over + looks at you / smiles",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Bercerita / gambarkan objek.",
          en: "Tell a story / describe the object.",
        },
        dialogue: {
          ms: ["“Apa yang awak bagi ini?”"],
          en: ["“What is this that you're giving?”"],
        },
        targetSignal: {
          ms: "Nama + gambarkan objek yang dibagi",
          en: "Names + describes the object given",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Bercerita / gambarkan objek.",
          en: "Tell a story / describe the object.",
        },
        dialogue: {
          ms: ["“Apa yang awak bagi ini?”"],
          en: ["“What is this that you're giving?”"],
        },
        targetSignal: {
          ms: "Nama + gambarkan objek yang dibagi",
          en: "Names + describes the object given",
        },
      },
    ],
  },
  {
    code: "A6",
    title: {
      ms: "Buku Gambar / Buku Cerita (Shared Book Reading)",
      en: "Picture Book / Storybook (Shared Book Reading)",
    },
    routine: "R9",
    day: 6,
    setup: {
      ms: "Tengok ke mana anak tunjuk — bukan halaman ikut order (T). Perhati ‘referential look’ — anak pandang gambar → pandang ibu → pandang gambar balik (P). JANGAN buka halaman sehingga anak beri isyarat (D).",
      en: "Follow where your child points — not the pages in order (T). Watch for the ‘referential look’ — child looks at the picture → looks at you → looks back at the picture (P). Do NOT turn the page until your child gives a signal (D).",
    },
    parentSkills: [
      "Ikut Tumpuan Anak (Joint Attention) — label apa yang anak pandang.",
      "Banyakkan komen, kurangkan soalan (80% komen, 20% soalan).",
    ],
    strategy: "S1",
    strategyName: {
      ms: "Komen & Joint Attention",
      en: "Commenting & Joint Attention",
    },
    coreSkill: {
      ms: "Joint Attention + Komen",
      en: "Joint Attention + Commenting",
    },
    type: "Normal",
    materials: {
      ms: ["Buku gambar / buku cerita"],
      en: ["Picture book / storybook"],
    },
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
        instructions: {
          ms: "Label apa yang ANAK pandang, bukan susunan halaman.",
          en: "Label what your CHILD looks at, not the page order.",
        },
        dialogue: {
          ms: ["“Kucing! Kucing tidur.” [label apa anak pandang]"],
          en: ["“Cat! The cat is sleeping.” [label what your child looks at]"],
        },
        targetSignal: {
          ms: "Tunjuk / pandang gambar",
          en: "Points at / looks at the picture",
        },
      },
      {
        stage: "T2",
        instructions: {
          ms: "‘Oh! [ikut pandang] ...kucing!’ Tunggu sebelum buka halaman.",
          en: "‘Oh! [follow their gaze] ...a cat!’ Wait before turning the page.",
        },
        dialogue: {
          ms: ["“Oh! [pandang bersama] Kucing! Kucing besar.”"],
          en: ["“Oh! [look together] A cat! A big cat.”"],
        },
        targetSignal: {
          ms: "Bunyi / tunjuk + pandang ibu (joint attention)",
          en: "Sound / point + looks at you (joint attention)",
        },
      },
      {
        stage: "T3",
        instructions: {
          ms: "Komen banyak — 80% komen, 20% soalan. Bukan kuiz.",
          en: "Comment a lot — 80% comments, 20% questions. Not a quiz.",
        },
        dialogue: {
          ms: ["“Nampak apa? Kucing buat apa?”"],
          en: ["“What do you see? What is the cat doing?”"],
        },
        targetSignal: {
          ms: "Isi nama gambar / label",
          en: "Fills in the picture's name / labels it",
        },
      },
      {
        stage: "T4",
        instructions: {
          ms: "Beri soalan terbuka berkaitan kisah di buku itu.",
          en: "Ask open-ended questions about the story in the book.",
        },
        dialogue: {
          ms: ["“Apa yang jadi kat kucing tu?”"],
          en: ["“What happened to that cat?”"],
        },
        targetSignal: {
          ms: "Predict / cerita / soal kembali: “Kucing tu lari” (contoh)",
          en: "Predicts / narrates / asks back: “That cat ran away” (example)",
        },
      },
      {
        stage: "T5",
        instructions: {
          ms: "Beri soalan terbuka berkaitan kisah di buku itu.",
          en: "Ask open-ended questions about the story in the book.",
        },
        dialogue: {
          ms: ["“Apa yang jadi kat kucing tu?”"],
          en: ["“What happened to that cat?”"],
        },
        targetSignal: {
          ms: "Predict / cerita / soal kembali: “Kucing tu lari” (contoh)",
          en: "Predicts / narrates / asks back: “That cat ran away” (example)",
        },
      },
    ],
  },
]
