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

export interface Goal {
  code: string // G1, G2…
  aspiration: string
  /** Focus-strategy badges shown on the goal card. */
  badges: string[]
  /** Not yet available — shown with an "Akan datang" badge, not selectable. */
  comingSoon?: boolean
}

export const GOALS: Goal[] = [
  {
    code: "G1",
    aspiration:
      "Saya nak kami boleh berhubung dan berkomunikasi dengan lebih baik",
    badges: ["Self Talk", "Withhold & Wait", "Ambil Giliran", "Joint Attention"],
  },
  // ── Coming soon ─────────────────────────────────────────────────────────
  {
    code: "G2",
    aspiration: "Saya nak anak saya cakap dengan saya",
    badges: ["TPD", "Modelling", "Parallel Talk", "Auditory Closure"],
    comingSoon: true,
  },
  {
    code: "G3",
    aspiration: "Saya nak anak cakap dengan kawan di sekolah",
    badges: ["Ambil Giliran", "Parallel Talk", "Bermain"],
    comingSoon: true,
  },
  {
    code: "G4",
    aspiration: "Saya nak anak tak kena buli secara senyap",
    badges: ["Komunikasi Asertif", "Expand", "Keyakinan"],
    comingSoon: true,
  },
  {
    code: "G5",
    aspiration: "Saya nak anak boleh minta apa yang dia nak",
    badges: ["Auditory Closure (Tunggu)", "Beri Pilihan"],
    comingSoon: true,
  },
  {
    code: "G6",
    aspiration: "Saya nak anak faham apa yang saya cakap",
    badges: ["Ayat Pendek", "4SR", "Recasting", "Ulangan"],
    comingSoon: true,
  },
  {
    code: "G7",
    aspiration: "Saya nak tahu perkembangan (improvement) anak saya",
    badges: ["Ukuran 2-Jalur", "Jejak Aha Moment"],
    comingSoon: true,
  },
  {
    code: "G8",
    aspiration: "Saya penat. Saya tak tahu apa yang salah",
    badges: ["Mindset Reset", "TPD", "Parallel Talk Dahulu"],
    comingSoon: true,
  },
  {
    code: "G9",
    aspiration: "Saya nak anak cerita apa berlaku di sekolah",
    badges: ["Naratif", "Expand", "Komen Terbuka"],
    comingSoon: true,
  },
  {
    code: "G10",
    aspiration: "Saya nak terapi berkesan walau tak boleh pergi ke klinik",
    badges: ["Laporan Carryover SLT", "Tambat Rutin"],
    comingSoon: true,
  },
  {
    code: "G11",
    aspiration: "Saya nak anak yakin (confident) untuk bercakap",
    badges: ["Hargai Setiap Usaha", "Recasting", "Raikan"],
    comingSoon: true,
  },
]
