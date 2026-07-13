/* ========================================================================== *
 *  HELP · Maya's FAQ — the content.
 *
 *  ⚠ PLACEHOLDER. Spec §8 item 9 makes the FAQ set a CONTENT-LEAD deliverable,
 *  and the clinical answers below are my drafting, not an SLT's. Every answer
 *  that touches technique, waiting times, or when to seek help needs sign-off
 *  before the pilot — a parent will read these as instructions.
 *
 *  ── "SMART", HONESTLY ─────────────────────────────────────────────────────
 *  There is NO language model here. Spec §1.3: "Maya: scripted dialogue trees,
 *  tap-to-answer. No generative AI in the pilot."
 *
 *  What makes it feel smart is keyword matching: each entry carries `keywords`,
 *  so typing "tunggu" or "wait" surfaces the withhold questions even though
 *  neither word appears in their titles. It answers what the parent MEANT, not
 *  what they typed — which is the part that actually matters — without inventing
 *  clinical advice, which is the part that would be dangerous.
 *
 *  Every `faq_opened{topic}` is logged (spec §6.1). What parents ASK is a pilot
 *  finding in its own right: it tells you where the programme is confusing.
 * ========================================================================== */

export type FaqCategory = "program" | "aktiviti" | "anak" | "bantuan"

export interface FaqEntry {
  id: string
  category: FaqCategory
  q: { ms: string; en: string }
  a: { ms: string; en: string }
  /** Extra terms that should match this entry in search. Lowercase. */
  keywords: string[]
}

export const FAQ_CATEGORIES: Record<FaqCategory, { ms: string; en: string }> = {
  program: { ms: "Tentang program", en: "About the programme" },
  aktiviti: { ms: "Aktiviti harian", en: "Daily activity" },
  anak: { ms: "Tentang anak anda", en: "About your child" },
  bantuan: { ms: "Perlukan bantuan", en: "Getting help" },
}

export const FAQ: FaqEntry[] = [
  /* ── Tentang program ──────────────────────────────────────────────────── */
  {
    id: "berapa_lama",
    category: "program",
    q: {
      ms: "Berapa lama setiap hari?",
      en: "How long does each day take?",
    },
    a: {
      ms: "Kira-kira 15 minit — dan ia berlaku DALAM rutin biasa anda (mandi, makan, main). Anda tidak perlu cari masa tambahan. Selepas aktiviti, ada beberapa soalan ringkas untuk rekod kemajuan.",
      en: "About 15 minutes — and it happens INSIDE your normal routine (bath, meals, play). You don't need to find extra time. After the activity there are a few short questions to record progress.",
    },
    keywords: ["masa", "minit", "lama", "time", "minutes", "long", "sibuk", "busy"],
  },
  {
    id: "terlepas_hari",
    category: "program",
    q: {
      ms: "Saya terlepas satu hari. Perlu ulang?",
      en: "I missed a day. Do I start over?",
    },
    a: {
      ms: "Tidak. Anda tidak terlepas apa-apa — anda cuma sambung di HARI seterusnya, bukan tarikh seterusnya. Kalau Hari 3 tertangguh, esok anda buat Hari 3. Rutin sibuk memang normal.",
      en: "No. You haven't missed anything — you simply continue on the next DAY of the programme, not the next date. If Day 3 was skipped, tomorrow you do Day 3. Busy weeks are normal.",
    },
    keywords: ["terlepas", "miss", "skip", "lupa", "forgot", "tertinggal", "sambung"],
  },
  {
    id: "gantikan_terapi",
    category: "program",
    q: {
      ms: "Adakah Tutur menggantikan terapi?",
      en: "Does Tutur replace therapy?",
    },
    a: {
      ms: "Tidak. Tutur adalah sistem bimbingan IBU BAPA — ia direka untuk MELENGKAPKAN terapi, bukan menggantikannya. Jika anak anda sedang menjalani terapi, kongsikan tracker anda dengan Ahli Terapi Pertuturan pada setiap sesi.",
      en: "No. Tutur is a PARENT-coaching system — it's designed to COMPLEMENT therapy, not replace it. If your child is already in therapy, share your tracker with their Speech-Language Therapist at each session.",
    },
    keywords: ["terapi", "therapy", "slt", "doktor", "doctor", "ganti", "replace"],
  },

  /* ── Aktiviti harian ──────────────────────────────────────────────────── */
  {
    id: "kenapa_tunggu",
    category: "aktiviti",
    q: {
      ms: "Kenapa saya perlu tunggu 5 saat?",
      en: "Why do I have to wait 5 seconds?",
    },
    a: {
      ms: "Sebab anak perlukan RUANG untuk mula. Kalau kita cepat bantu, anak tidak perlu berkomunikasi — kita dah selesaikan untuk dia. Tunggu terasa lama, tapi 5 saat itulah ruang di mana isyarat pertama muncul.\n\nBila dia beri isyarat — bagi SEGERA, dalam 2 saat.",
      en: "Because your child needs SPACE to start. If we help too quickly, they never need to communicate — we've already solved it for them. Waiting feels long, but those 5 seconds are the space where the first signal appears.\n\nThe moment they signal — give it IMMEDIATELY, within 2 seconds.",
    },
    keywords: [
      "tunggu", "wait", "withhold", "5 saat", "seconds", "tahan", "sabar", "hold",
    ],
  },
  {
    id: "apa_itu_ccs",
    category: "aktiviti",
    q: {
      ms: "Apa itu CCS?",
      en: "What is CCS?",
    },
    a: {
      ms: "CCS = tahap komunikasi anak. Ia bukan markah, dan bukan ujian.\n\nIa cuma menunjukkan cara anak berkomunikasi SEKARANG, supaya anda boleh sesuaikan cara anda bercakap dengannya. Tiada CCS “baik” atau “teruk” — penanda aras anda ialah anak anda sendiri pada Hari 1.",
      en: "CCS = your child's communication level. It is not a score, and not a test.\n\nIt simply shows how your child communicates RIGHT NOW, so you can adjust the way you speak with them. There is no “good” or “bad” CCS — your benchmark is your own child on Day 1.",
    },
    keywords: ["ccs", "tahap", "level", "markah", "score", "ujian", "test"],
  },
  {
    id: "anak_tak_pilih",
    category: "aktiviti",
    q: {
      ms: "Anak saya tidak pilih mainan langsung.",
      en: "My child didn't choose a toy at all.",
    },
    a: {
      ms: "Tak apa — itu pun maklumat. Kadang-kadang anak perlukan masa, atau hari itu memang bukan harinya.\n\nEsok kita cuba lagi dengan tiga mainan yang sama. Jangan cadangkan; cuma tunggu dan perhatikan.",
      en: "That's okay — that's information too. Sometimes a child needs more time, or today just wasn't the day.\n\nTomorrow we try again with the same three toys. Don't suggest; just wait and watch.",
    },
    keywords: ["pilih", "choose", "mainan", "toy", "tak nak", "refuse", "minat"],
  },

  /* ── Tentang anak anda ────────────────────────────────────────────────── */
  {
    id: "tak_pandang",
    category: "anak",
    q: {
      ms: "Anak saya tidak pandang saya. Apa patut saya buat?",
      en: "My child doesn't look at me. What should I do?",
    },
    a: {
      ms: "Jangan paksa pandangan mata — itu boleh buat anak menjauh.\n\nSebaliknya, turun ke ARAS MATA dia, dan pergi ke tempat dia sedang pandang. Pandangan datang selepas perhubungan, bukan sebelum. Ramai anak mula pandang sekali-sekala dahulu, dan itu sudah satu permulaan.",
      en: "Don't force eye contact — it can make a child pull away.\n\nInstead, get down to their EYE LEVEL, and go to where they're already looking. Eye contact follows connection, it doesn't come before it. Many children start with just the occasional glance — and that is already a beginning.",
    },
    keywords: [
      "pandang", "mata", "eye contact", "look", "kp1", "tengok", "avoid",
    ],
  },
  {
    id: "bila_nampak_hasil",
    category: "anak",
    q: {
      ms: "Bila saya akan nampak perubahan pada anak?",
      en: "When will I see a change in my child?",
    },
    a: {
      ms: "Perubahan ANDA datang dahulu — biasanya dalam beberapa hari. Perubahan ANAK menyusul, dan selalunya baru kelihatan sekitar Hari 7–14.\n\nItu normal, dan bukan tanda ia tidak berkesan. Yang anda buat setiap hari itulah yang menyebabkan perubahan anak nanti.",
      en: "YOUR change comes first — usually within a few days. Your CHILD's change follows, and often only becomes visible around Day 7–14.\n\nThat's normal, and it isn't a sign it isn't working. What you do each day is precisely what causes your child's change later.",
    },
    keywords: [
      "hasil", "result", "berkesan", "working", "perubahan", "change", "bila", "when", "lama",
    ],
  },

  /* ── Perlukan bantuan ─────────────────────────────────────────────────── */
  {
    id: "bila_jumpa_slt",
    category: "bantuan",
    q: {
      ms: "Bila saya patut jumpa Ahli Terapi Pertuturan?",
      en: "When should I see a Speech-Language Therapist?",
    },
    a: {
      ms: "Dapatkan penilaian SLT jika anak jarang atau tidak pernah: membuat pandangan mata · menunjukkan minat untuk berinteraksi · meniru bunyi atau aksi · menggunakan isyarat seperti menunjuk · mengeluarkan bunyi menjelang 12 bulan.\n\nAnda tetap boleh teruskan program ini — ia melengkapkan terapi, bukan menggantikannya. Tiada tergesa-gesa, tetapi lebih awal lebih baik.",
      en: "Seek an SLT assessment if your child rarely or never: makes eye contact · shows interest in interacting · imitates sounds or actions · uses gestures like pointing · makes sounds by 12 months.\n\nYou can still continue this programme — it complements therapy rather than replacing it. There's no rush, but earlier is better.",
    },
    keywords: [
      "slt", "terapi", "therapist", "jumpa", "penilaian", "assessment", "risau", "worried", "bantuan",
    ],
  },
  {
    id: "rasa_gagal",
    category: "bantuan",
    q: {
      ms: "Saya rasa saya gagal sebagai ibu bapa.",
      en: "I feel like I'm failing as a parent.",
    },
    a: {
      ms: "Anda tidak gagal. Anda sedang belajar satu cara baharu untuk berhubung — dan itu memang sukar pada mulanya.\n\nAnda muncul setiap hari untuk anak anda. Itu bukan kegagalan; itulah kerja sebenar. Kalau anda perlukan seseorang untuk bercakap, hubungi pasukan Tutur.",
      en: "You are not failing. You are learning a new way of connecting — and that is genuinely hard at first.\n\nYou are showing up for your child every day. That isn't failure; that's the actual work. If you'd like to talk to someone, reach out to the Tutur team.",
    },
    keywords: [
      "gagal", "fail", "sedih", "sad", "penat", "tired", "putus asa", "give up", "susah", "hard",
    ],
  },
]

/**
 * Keyword search. Matches the question, the answer, and the entry's `keywords`.
 *
 * ⚠ NOT CURRENTLY USED. The FAQ is tap-only — there is no text input, because an
 * input box promises "ask me anything" and we can only answer what is written.
 * Kept because the `keywords` are already authored, so if a search box is ever
 * added back (over the AUTHORED questions, not over free text), this is ready.
 *
 * Deliberately simple and DETERMINISTIC — no model, no ranking magic.
 */
export function searchFaq(query: string, lang: "ms" | "en"): FaqEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return FAQ

  const terms = q.split(/\s+/).filter(Boolean)
  return FAQ.filter((e) => {
    const hay = [e.q[lang], e.a[lang], ...e.keywords].join(" ").toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}
