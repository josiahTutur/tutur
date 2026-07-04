import { type Loc } from "@/lib/i18n"

/* ========================================================================== *
 *  Feedback survey definition — the single source of truth for the Borang
 *  Maklum Balas questions, in Bahasa Malaysia + English.
 *
 *  Both FeedbackView (the form) and WawasanView (the admin analysis) import
 *  from here. Text is bilingual (`Loc`), so a question's wording lives in ONE
 *  place per language. IMPORTANT: submitted answers are stored using the
 *  CANONICAL Bahasa Malaysia option text (see FeedbackView), regardless of the
 *  display language, so analytics can aggregate every response consistently.
 *  Answers are keyed by question id (`q1`), "Lain-lain" by `${id}_other`, and
 *  the open-text follow-up by `${id}_text`.
 * ========================================================================== */

// The three 5-point scales used across the form (ordered worst → best).
export const AGREE: Loc<string[]> = {
  ms: ["Sangat Tidak Setuju", "Tidak Setuju", "Neutral", "Setuju", "Sangat Setuju"],
  en: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
}
export const SATISFY: Loc<string[]> = {
  ms: [
    "Sangat Tidak Puas Hati",
    "Tidak Puas Hati",
    "Neutral",
    "Puas Hati",
    "Sangat Puas Hati",
  ],
  en: [
    "Very Dissatisfied",
    "Dissatisfied",
    "Neutral",
    "Satisfied",
    "Very Satisfied",
  ],
}
export const RECOMMEND: Loc<string[]> = {
  ms: ["Sangat Tidak Mungkin", "Tidak Mungkin", "Tidak Pasti", "Mungkin", "Sangat Mungkin"],
  en: ["Very Unlikely", "Unlikely", "Not Sure", "Likely", "Very Likely"],
}

const REASON_FU: Loc = {
  ms: "Apakah sebab utama anda memberikan skor tersebut?",
  en: "What is the main reason for your score?",
}

export type Question = {
  id: string
  no: number
  text: Loc
  type: "scale" | "single" | "multi" | "text"
  scale?: Loc<string[]>
  options?: Loc<string[]>
  other?: boolean // include a "Lain-lain" free-text option (multi/single)
  followUp?: Loc // an open-text prompt shown under the choice
  long?: boolean // textarea (vs input) for "text" questions
}

export type Section = { key: string; title: Loc; questions: Question[] }

export const SECTIONS: Section[] = [
  {
    key: "A",
    title: {
      ms: "Bahagian A: Pengalaman Menggunakan Tutur",
      en: "Section A: Your Experience Using Tutur",
    },
    questions: [
      {
        id: "q1",
        no: 1,
        text: {
          ms: "Secara keseluruhan, sejauh manakah anda berpuas hati menggunakan Tutur?",
          en: "Overall, how satisfied are you with using Tutur?",
        },
        type: "scale",
        scale: SATISFY,
        followUp: REASON_FU,
      },
      {
        id: "q2",
        no: 2,
        text: {
          ms: "Sejauh manakah anda akan mencadangkan Tutur kepada ibu bapa atau penjaga lain?",
          en: "How likely are you to recommend Tutur to other parents or guardians?",
        },
        type: "scale",
        scale: RECOMMEND,
        followUp: REASON_FU,
      },
      {
        id: "q3",
        no: 3,
        text: {
          ms: "Saya bercadang untuk terus menggunakan Tutur selepas tempoh percubaan ini.",
          en: "I intend to keep using Tutur after this trial period.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Apakah SATU perkara yang anda ingin ubah, tambah atau perbaiki dalam Tutur?",
          en: "What is ONE thing you would like to change, add, or improve in Tutur?",
        },
      },
      {
        id: "q4",
        no: 4,
        text: {
          ms: "Tutur membantu saya menjalankan aktiviti atau latihan komunikasi bersama anak saya.",
          en: "Tutur helps me carry out communication activities or practice with my child.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Jika ya, boleh kongsikan pengalaman atau perubahan yang anda perhatikan?",
          en: "If yes, could you share the experience or changes you've noticed?",
        },
      },
      {
        id: "q5",
        no: 5,
        text: {
          ms: "Aktiviti harian dalam Tutur mudah disesuaikan dengan rutin harian keluarga saya (contohnya semasa makan, mandi, bermain atau membaca).",
          en: "The daily activities in Tutur are easy to fit into my family's routine (e.g. during meals, bath time, play, or reading).",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Jika tidak, apakah cabaran yang anda hadapi?",
          en: "If not, what challenges did you face?",
        },
      },
      {
        id: "q6",
        no: 6,
        text: {
          ms: "Selepas menggunakan Tutur, saya berasa lebih yakin untuk membantu perkembangan komunikasi anak saya.",
          en: "After using Tutur, I feel more confident in supporting my child's communication development.",
        },
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q7",
        no: 7,
        text: {
          ms: "Saya berasa disokong dan digalakkan oleh Tutur, dan bukannya dihakimi.",
          en: "I feel supported and encouraged by Tutur, rather than judged.",
        },
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q8",
        no: 8,
        text: {
          ms: "Mudah untuk memahami apa yang perlu dilakukan dan cara menggunakan aplikasi Tutur.",
          en: "It's easy to understand what to do and how to use the Tutur app.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Bahagian manakah yang paling mengelirukan atau sukar difahami?",
          en: "Which part was the most confusing or hard to understand?",
        },
      },
      {
        id: "q9",
        no: 9,
        text: {
          ms: "Maya (Pembantu AI Tutur) membantu saya dengan jelas, mesra dan mudah difahami.",
          en: "Maya (Tutur's AI assistant) helps me clearly, warmly, and in an easy-to-understand way.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Apakah yang anda suka atau kurang suka tentang Maya AI?",
          en: "What do you like or dislike about Maya AI?",
        },
      },
      {
        id: "q10",
        no: 10,
        text: {
          ms: "Saya memahami dan percaya bahawa latihan kecil yang dilakukan secara konsisten dapat membantu perkembangan komunikasi anak.",
          en: "I understand and believe that small, consistent practice can help my child's communication development.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Mengapa anda berpendapat demikian?",
          en: "Why do you think so?",
        },
      },
      {
        id: "q11",
        no: 11,
        text: {
          ms: "Bahasa, contoh situasi dan perkataan dalam Papan AAC sesuai dengan kehidupan harian saya dan anak saya.",
          en: "The language, example situations, and words in the AAC Board fit my and my child's daily life.",
        },
        type: "scale",
        scale: AGREE,
        followUp: {
          ms: "Jika tidak, apakah yang boleh diperbaiki?",
          en: "If not, what could be improved?",
        },
      },
      {
        id: "q12",
        no: 12,
        text: {
          ms: "Pada pendapat anda, penggunaan Papan AAC dalam aplikasi Tutur adalah berkesan untuk membantu komunikasi anak.",
          en: "In your opinion, using the AAC Board in the Tutur app is effective in supporting your child's communication.",
        },
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q13",
        no: 13,
        text: {
          ms: "Jika dibandingkan dengan peranti AAC fizikal (hardware AAC), yang manakah anda lebih gemari?",
          en: "Compared with a physical AAC device (AAC hardware), which do you prefer?",
        },
        type: "single",
        options: {
          ms: [
            "Papan AAC dalam aplikasi Tutur",
            "Peranti AAC fizikal (hardware AAC)",
            "Kedua-duanya sama membantu",
            "Tidak pasti",
          ],
          en: [
            "The AAC Board in the Tutur app",
            "A physical AAC device (AAC hardware)",
            "Both help equally",
            "Not sure",
          ],
        },
        followUp: {
          ms: "Mengapa anda memilih jawapan tersebut?",
          en: "Why did you choose that answer?",
        },
      },
    ],
  },
  {
    key: "B",
    title: {
      ms: "Bahagian B: Pengalaman Sebelum Menggunakan Tutur",
      en: "Section B: Your Experience Before Using Tutur",
    },
    questions: [
      {
        id: "q14",
        no: 14,
        text: {
          ms: "Sebelum ini, pernahkah anda menggunakan aplikasi lain untuk membantu perkembangan anak?",
          en: "Before this, have you used other apps to support your child's development?",
        },
        type: "single",
        options: { ms: ["Ya", "Tidak"], en: ["Yes", "No"] },
        followUp: {
          ms: "Jika ya, apakah aplikasi tersebut?",
          en: "If yes, which apps?",
        },
      },
      {
        id: "q15",
        no: 15,
        text: {
          ms: "Jika anda pernah menggunakan aplikasi lain, apakah yang menyebabkan anda berhenti menggunakannya?",
          en: "If you have used other apps, what made you stop using them?",
        },
        type: "text",
        long: true,
      },
      {
        id: "q16",
        no: 16,
        text: {
          ms: "Selain aplikasi mudah alih, apakah medium yang paling anda selesa gunakan untuk mendapatkan panduan membantu anak? (Boleh pilih lebih daripada satu)",
          en: "Besides mobile apps, which mediums are you most comfortable using to get guidance for helping your child? (You may choose more than one)",
        },
        type: "multi",
        options: {
          ms: [
            "WhatsApp / Telegram",
            "Video pendek",
            "Podcast",
            "Facebook Group / Komuniti",
            "Bengkel atau kelas fizikal",
            "Sesi bersama ahli terapi",
            "Buku atau artikel",
            "Laman web",
          ],
          en: [
            "WhatsApp / Telegram",
            "Short videos",
            "Podcast",
            "Facebook Group / Community",
            "Workshops or in-person classes",
            "Sessions with a therapist",
            "Books or articles",
            "Websites",
          ],
        },
        other: true,
      },
    ],
  },
  {
    key: "C",
    title: {
      ms: "Bahagian C: Penggunaan dan Cadangan",
      en: "Section C: Usage and Suggestions",
    },
    questions: [
      {
        id: "q17",
        no: 17,
        text: {
          ms: "Sepanjang tempoh percubaan, berapa kerap anda menggunakan Tutur?",
          en: "During the trial period, how often did you use Tutur?",
        },
        type: "single",
        options: {
          ms: [
            "Setiap hari",
            "4–6 kali seminggu",
            "2–3 kali seminggu",
            "Sekali seminggu",
            "Kurang daripada sekali seminggu",
          ],
          en: [
            "Every day",
            "4–6 times a week",
            "2–3 times a week",
            "Once a week",
            "Less than once a week",
          ],
        },
      },
      {
        id: "q18",
        no: 18,
        text: {
          ms: "Pada pendapat anda, siapakah yang paling sesuai menggunakan Tutur? (Boleh pilih lebih daripada satu)",
          en: "In your opinion, who is best suited to use Tutur? (You may choose more than one)",
        },
        type: "multi",
        options: {
          ms: [
            "Ibu bapa",
            "Datuk / Nenek",
            "Pengasuh",
            "Guru Pendidikan Khas",
            "Guru Prasekolah / Tadika",
            "Ahli Terapi Pertuturan Bahasa",
            "Semua di atas",
          ],
          en: [
            "Parents",
            "Grandparents",
            "Caregivers",
            "Special Education teachers",
            "Preschool / Kindergarten teachers",
            "Speech-Language Therapists",
            "All of the above",
          ],
        },
        other: true,
      },
      {
        id: "q19",
        no: 19,
        text: {
          ms: "Jika anda boleh menggambarkan Tutur dengan satu perkataan atau satu ayat, apakah yang anda akan katakan?",
          en: "If you could describe Tutur in one word or one sentence, what would you say?",
        },
        type: "text",
      },
      {
        id: "q20",
        no: 20,
        text: {
          ms: "Adakah anda mempunyai sebarang cadangan lain untuk membantu kami menambah baik Tutur?",
          en: "Do you have any other suggestions to help us improve Tutur?",
        },
        type: "text",
        long: true,
      },
    ],
  },
]

export const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions)
