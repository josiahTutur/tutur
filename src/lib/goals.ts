/* ========================================================================== *
 *  Goal catalogue — the 10 parent aspirations.
 *
 *  Single source of truth shared by GoalSelection (onboarding picker) and the
 *  DashboardHub "Matlamat Anda" view, so the two can never drift apart.
 * ========================================================================== */

export interface Goal {
  code: string // G1–G10
  aspiration: string
  /** Focus-strategy badges shown on the goal card. */
  badges: string[]
}

export const GOALS: Goal[] = [
  {
    code: "G1",
    aspiration: "Saya nak anak saya cakap dengan saya",
    badges: ["TPD", "Modelling", "Parallel Talk", "Auditory Closure"],
  },
  {
    code: "G2",
    aspiration: "Saya nak anak cakap dengan kawan di sekolah",
    badges: ["Ambil Giliran", "Parallel Talk", "Bermain"],
  },
  {
    code: "G3",
    aspiration: "Saya nak anak tak kena buli secara senyap",
    badges: ["Komunikasi Asertif", "Expand", "Keyakinan"],
  },
  {
    code: "G4",
    aspiration: "Saya nak anak boleh minta apa yang dia nak",
    badges: ["Auditory Closure (Tunggu)", "Beri Pilihan"],
  },
  {
    code: "G5",
    aspiration: "Saya nak anak faham apa yang saya cakap",
    badges: ["Ayat Pendek", "4SR", "Recasting", "Ulangan"],
  },
  {
    code: "G6",
    aspiration: "Saya nak tahu perkembangan (improvement) anak saya",
    badges: ["Ukuran 2-Jalur", "Jejak Aha Moment"],
  },
  {
    code: "G7",
    aspiration: "Saya penat. Saya tak tahu apa yang salah",
    badges: ["Mindset Reset", "TPD", "Parallel Talk Dahulu"],
  },
  {
    code: "G8",
    aspiration: "Saya nak anak cerita apa berlaku di sekolah",
    badges: ["Naratif", "Expand", "Komen Terbuka"],
  },
  {
    code: "G9",
    aspiration: "Saya nak terapi berkesan walau tak boleh pergi ke klinik",
    badges: ["Laporan Carryover SLT", "Tambat Rutin"],
  },
  {
    code: "G10",
    aspiration: "Saya nak anak yakin (confident) untuk bercakap",
    badges: ["Hargai Setiap Usaha", "Recasting", "Raikan"],
  },
]
