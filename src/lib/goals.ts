/* ========================================================================== *
 *  Goal catalogue — parent aspirations.
 *
 *  G1 is the active goal for the current customer test (a day-based connection &
 *  communication programme). The previous ten aspirations are kept as
 *  "coming soon" — visible, but not yet selectable.
 *
 *  Single source of truth shared by GoalSelection (onboarding picker), the
 *  Settings goals list, and the Analisis active-goal banner.
 * ========================================================================== */

import { type Loc } from "@/lib/i18n"

export interface Goal {
  code: string // G1, G2…
  aspiration: Loc
  /** Focus-strategy badges shown on the goal card. */
  badges: string[]
  /** Not yet available — shown with an "Akan datang" badge, not selectable. */
  comingSoon?: boolean
}

export const GOALS: Goal[] = [
  {
    code: "G1",
    aspiration: {
      ms: "Saya nak kami boleh berhubung dan berkomunikasi dengan lebih baik",
      en: "I want us to connect and communicate better",
    },
    badges: ["Self Talk", "Withhold & Wait", "Ambil Giliran", "Joint Attention"],
  },
  // ── Coming soon ─────────────────────────────────────────────────────────
  {
    code: "G2",
    aspiration: {
      ms: "Saya nak anak saya cakap dengan saya",
      en: "I want my child to talk to me",
    },
    badges: ["TPD", "Modelling", "Parallel Talk", "Auditory Closure"],
    comingSoon: true,
  },
  {
    code: "G3",
    aspiration: {
      ms: "Saya nak anak cakap dengan kawan di sekolah",
      en: "I want my child to talk with friends at school",
    },
    badges: ["Ambil Giliran", "Parallel Talk", "Bermain"],
    comingSoon: true,
  },
  {
    code: "G4",
    aspiration: {
      ms: "Saya nak anak tak kena buli secara senyap",
      en: "I want my child not to be quietly bullied",
    },
    badges: ["Komunikasi Asertif", "Expand", "Keyakinan"],
    comingSoon: true,
  },
  {
    code: "G5",
    aspiration: {
      ms: "Saya nak anak boleh minta apa yang dia nak",
      en: "I want my child to be able to ask for what they want",
    },
    badges: ["Auditory Closure (Tunggu)", "Beri Pilihan"],
    comingSoon: true,
  },
  {
    code: "G6",
    aspiration: {
      ms: "Saya nak anak faham apa yang saya cakap",
      en: "I want my child to understand what I say",
    },
    badges: ["Ayat Pendek", "4SR", "Recasting", "Ulangan"],
    comingSoon: true,
  },
  {
    code: "G7",
    aspiration: {
      ms: "Saya nak tahu perkembangan (improvement) anak saya",
      en: "I want to know my child's improvement",
    },
    badges: ["Ukuran 2-Jalur", "Jejak Aha Moment"],
    comingSoon: true,
  },
  {
    code: "G8",
    aspiration: {
      ms: "Saya penat. Saya tak tahu apa yang salah",
      en: "I'm exhausted. I don't know what's wrong",
    },
    badges: ["Mindset Reset", "TPD", "Parallel Talk Dahulu"],
    comingSoon: true,
  },
  {
    code: "G9",
    aspiration: {
      ms: "Saya nak anak cerita apa berlaku di sekolah",
      en: "I want my child to tell me what happened at school",
    },
    badges: ["Naratif", "Expand", "Komen Terbuka"],
    comingSoon: true,
  },
  {
    code: "G10",
    aspiration: {
      ms: "Saya nak terapi berkesan walau tak boleh pergi ke klinik",
      en: "I want therapy that works even when I can't go to the clinic",
    },
    badges: ["Laporan Carryover SLT", "Tambat Rutin"],
    comingSoon: true,
  },
  {
    code: "G11",
    aspiration: {
      ms: "Saya nak anak yakin (confident) untuk bercakap",
      en: "I want my child to feel confident to speak",
    },
    badges: ["Hargai Setiap Usaha", "Recasting", "Raikan"],
    comingSoon: true,
  },
]
