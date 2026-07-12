/* ========================================================================== *
 *  i18n — lightweight bilingual (Bahasa Malaysia / English) layer.
 *
 *  Default language is Bahasa Malaysia ("ms"). The choice is persisted to
 *  localStorage so it survives refreshes and is read before first paint.
 *
 *  Two ways to translate:
 *   1. UI chrome  → `const t = useT()` then `t.nav.wawasan` (central STRINGS).
 *   2. Content    → data files hold `Loc<string>` values ({ ms, en }); resolve
 *                   with `pick(value, lang)` (or the `useLoc()` helper).
 * ========================================================================== */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type Lang = "ms" | "en"

const STORAGE_KEY = "tutur.lang"

function readInitialLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === "ms" || v === "en") return v
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return "ms" // Bahasa Malaysia is the default.
}

interface LanguageCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const LanguageContext = createContext<LanguageCtx>({
  lang: "ms",
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore persistence failures */
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang(): LanguageCtx {
  return useContext(LanguageContext)
}

/* -------------------------------------------------------------------------- */
/*  Localised content values — { ms, en }                                     */
/* -------------------------------------------------------------------------- */

export type Loc<T = string> = Record<Lang, T>

/** Resolve a localised value for a language. Plain strings pass through, so
 *  content can be migrated to bilingual gradually without breaking callers. */
export function pick<T>(v: Loc<T> | T, lang: Lang): T {
  if (v && typeof v === "object" && "ms" in (v as object) && "en" in (v as object)) {
    return (v as Loc<T>)[lang]
  }
  return v as T
}

/** Hook form: `const L = useLoc()` then `L(activity.title)`. */
export function useLoc(): <T>(v: Loc<T> | T) => T {
  const { lang } = useLang()
  return useCallback(<T,>(v: Loc<T> | T) => pick(v, lang), [lang])
}

/* -------------------------------------------------------------------------- */
/*  UI chrome dictionary                                                      */
/* -------------------------------------------------------------------------- */

const ms = {
  common: {
    save: "Simpan",
    cancel: "Batal",
    close: "Tutup",
    back: "Kembali",
    retry: "Cuba lagi",
    loading: "Memuatkan…",
    comingSoon: "Akan datang",
    signIn: "Log Masuk",
  },
  nav: {
    aktiviti: "Aktiviti Harian",
    ai: "Panduan AI",
    aac: "Papan",
    analysis: "Analisis",
    feedback: "Maklum Balas",
    wawasan: "Wawasan",
    users: "Pengguna",
    setting: "Tetapan",
    classic: "Library",
    library: "Library",
    notification: "Notifikasi",
    profile: "Profil",
    comingSoon: "Akan Datang",
  },
  viewTitles: {
    ai: "Panduan AI Tutur",
    aktiviti: "Aktiviti Harian",
    aac: "Papan AAC",
    classic: "Library",
    analysis: "Analisis",
    feedback: "Maklum Balas",
    wawasan: "Wawasan",
    users: "Pengguna",
    notification: "Notifikasi",
    setting: "Tetapan",
    profile: "Profil",
  },
  topbar: {
    ready: "Sedia membantu",
    openAi: "Buka Panduan AI",
    openMenu: "Buka menu navigasi",
  },
  settings: {
    languageTitle: "Bahasa",
    languageDesc: "Pilih bahasa paparan aplikasi.",
    langMs: "Bahasa Melayu",
    langEn: "English",
    themeTitle: "Tema",
    themeDesc: "Pilih rupa terang atau gelap.",
    themeLight: "Terang",
    themeDark: "Gelap",
  },
  intro: {
    lines: [
      "Setiap mak ada saat ini",
      "Anak dah pergi therapy",
      "Tapi balik rumah… langkah yang seterusnya apa",
      "Therapy 1 jam seminggu, yang lain 167 jam — di rumah.",
      "Tutur tunjuk caranya, saat demi saat.",
    ],
    greeting: "Hai, saya Maya AI",
    language: "Bahasa",
    cta: "Mula dengan Tutur",
    freeNote: "Percuma untuk bermula · Tiada kad kredit diperlukan",
    panelTagline: "Hubungan dahulu, komunikasi kemudian.",
    panelSub:
      "Terapi 1 jam seminggu — kami bantu 167 jam yang lain, di rumah.",
  },
  maintenance: {
    title: "Kami sedang menyelenggara 🔧",
    body: "Tutur sedang dinaik taraf. Pendaftaran baharu dijeda buat sementara waktu. Terima kasih atas kesabaran anda!",
    loginCta: "Log Masuk (pengguna sedia ada)",
  },
  deletedAccount: {
    title: "Kami sedih melihat anda pergi 💜",
    body: "Akaun anda telah dipadam. Terima kasih kerana membenarkan Tutur menjadi sebahagian daripada perjalanan keluarga anda. Pintu kami sentiasa terbuka jika anda ingin kembali. Jaga diri, ya.",
  },
  welcome: {
    badge: "Keluarga Pengasas",
    // Page 1 (image has no text — shown as real copy)
    p1Title: "Selamat datang ke keluarga Tutur 💜",
    // Body is split so the closing phrase can carry the violet accent that used
    // to belong to the "— Maya" signature (now removed).
    p1Body: "Anda baru sahaja mengambil satu langkah berani untuk anak anda —",
    p1Accent: "dan itu sudah pun bermakna.",
    signature: "— Maya",
    // Page 2 (vision)
    p2Badge: "Teman AI",
    p2Title: "Setiap anak ada suara",
    p2Body: "Ia cuma perlukan sedikit ruang, sedikit masa,",
    p2Accent: "dan seorang teman di sisi.",
    // Page 3 (founding benefits) — retired from onboarding, kept for the legacy
    // Welcome component which is no longer routed to.
    p3Badge: "Manfaat Pengasas",
    benefitsTitle: "Ini hak istimewa anda sebagai keluarga pengasas:",
    benefits: [
      {
        title: "Status Ahli Pengasas — terkunci selamanya",
        desc: "Kadar RM69/bulan, kekal walaupun harga naik untuk orang lain.",
      },
      {
        title: "Percuma 2 minggu pertama",
        desc: "Cuba setiap aktiviti bersama anak sebelum bil bermula.",
      },
      {
        title: "Sesi langsung bulanan bersama ahli terapi kami",
        desc: "Bawa soalan anda sendiri tentang anak anda.",
      },
      {
        title: "Akses awal ke setiap matlamat baharu",
        desc: "Buka 10 matlamat sebelum ia dibuka untuk umum.",
      },
      {
        title: "Komuniti keluarga pengasas peribadi",
        desc: "Sokongan rakan + suara sebenar dalam apa yang kami bina seterusnya.",
      },
    ],
    // CTAs & question chrome
    next: "Seterusnya",
    start: "Jom mula",
    questionOf: "Soalan",
    agePlaceholder: "Taip umur anak anda…",
    typePlaceholder: "Taip jawapan anda…",
    bridge: "Terima kasih! Jom kita teruskan.",
  },
  join: {
    haveCode: "Ada kod jemputan? Sertai di sini",
    title: "Sertai anak sedia ada",
    subtitle:
      "Masukkan kod jemputan daripada pasangan anda untuk menjaga anak yang sama.",
    placeholder: "Kod jemputan",
    cta: "Sertai",
    joining: "Menyertai…",
    error: "Kod tidak sah atau telah tamat tempoh.",
    back: "Kembali",
  },
  stageIntro: {
    // Intro card (before Tahap 1)
    badgeIntro: "Pengenalan",
    introTitle: "Kenali Tahap Komunikasi Anak Anda",
    introBody:
      "Setiap anak berkembang mengikut tahapnya sendiri. Dengan mengetahui tahap komunikasi anak anda sekarang, kami dapat menyediakan aktiviti yang betul-betul sesuai — tidak terlalu mudah, tidak terlalu sukar. Mari kita kenali 5 tahap ini dahulu, sebelum menentukan tahap anak anda.",
    stageWord: "Tahap",
    next: "Seterusnya",
    back: "Kembali",
    // Fork — choose a stage manually, or take the 15-question assessment
    forkBadge: "Langkah Seterusnya",
    forkTitle: "Bagaimana anda mahu teruskan?",
    forkBody:
      "Pilih tahap anak anda sendiri, atau biar Maya menganalisis dengan lebih tepat melalui 15 soalan ringkas.",
    knowTitle: "Saya sudah tahu tahap anak saya",
    knowDesc:
      "Pilih tahap komunikasi anak anda secara terus dan mula menggunakan Tutur.",
    quizTitle: "Jawab 15 soalan untuk ketepatan",
    quizDesc:
      "Biar Maya menilai jawapan anda dan mencari tahap yang paling tepat.",
    recommended: "Disyorkan",
    choosePrompt: "Pilih tahap anak anda:",
    confirm: "Teruskan ke Papan Pemuka",
  },
  wawasan: {
    title: "Wawasan Tutur",
    subtitle:
      "Ringkasan penggunaan, penglibatan dan maklum balas merentasi semua pengguna. Hanya kelihatan oleh pentadbir.",
    loadError: "Tidak dapat memuatkan data wawasan. Sila cuba lagi.",
    // headline stats
    guardians: "Penjaga berdaftar",
    activeUsers: "Pengguna aktif",
    activitiesDone: "Aktiviti selesai",
    totalMinutes: "Jumlah minit",
    // tabs
    tabAdoption: "Penggunaan",
    tabEngagement: "Penglibatan",
    tabFunnel: "Corong",
    tabFeedback: "Maklum Balas",
    // adoption
    newSignups: "Pendaftaran Baharu",
    newSignupsSub: "Bilangan penjaga baharu setiap hari (14 hari lepas).",
    onboardingDone: "Melengkapkan Onboarding",
    onboardingCaption: "penjaga telah memilih matlamat",
    relationship: "Hubungan dengan Anak",
    // engagement
    activitiesTitle: "Aktiviti Selesai",
    activitiesSub: "Jumlah aktiviti yang disiapkan setiap hari (14 hari lepas).",
    popular: "Aktiviti Paling Popular",
    popularEmpty: "Belum ada aktiviti disiapkan.",
    childStage: "Tahap Komunikasi Anak",
    stage: "Tahap",
    dash: "—",
    daysAgo: "hari lepas",
    now: "Kini",
    // funnel
    funnelTitle: "Perjalanan Pengguna",
    funnelSub: "Daftar → siap onboarding → buat aktiviti → beri maklum balas.",
    funnelRegister: "Daftar",
    funnelOnboard: "Siap onboarding",
    funnelActivity: "Buat aktiviti",
    funnelFeedback: "Beri maklum balas",
    // feedback
    formsSubmitted: "Borang dihantar",
    responseRate: "Kadar maklum balas",
    avgSatisfaction: "Purata kepuasan (Q1)",
    noFeedback: "Belum ada maklum balas dihantar lagi.",
    avgScore: "Purata skor:",
    answers: "jawapan",
    other: "Lain-lain",
    noAnswer: "Tiada jawapan.",
    // guardian explorer
    guardiansTitle: "Penjaga Berdaftar",
    tapHintUsers: "Pilih pengguna untuk lihat butiran",
    searchUsers: "Cari nama, e-mel atau anak…",
    reactivate: "Aktifkan Semula Akaun",
    noResults: "Tiada pengguna ditemui.",
    deletePermanently: "Padam Kekal",
    deleteTitle: "Padam akaun ini secara kekal?",
    deleteBody: (name: string) =>
      `Semua data ${name} akan dipadam selama-lamanya dan tidak boleh dipulihkan.`,
    deleteConfirmBtn: "Ya, Padam Kekal",
    deleteError: "Gagal memadam akaun. Sila cuba lagi.",
    guardianFallback: "Penjaga tanpa nama",
    guardianDefault: "Penjaga",
    child: "anak",
    admin: "Pentadbir",
    deleted: "Dipadam",
    miniActivities: "Aktiviti",
    miniMinutes: "Minit",
    miniFeedback: "Maklum balas",
    email: "E-mel",
    guardianAge: "Umur penjaga",
    registered: "Mendaftar",
    primaryGoal: "Matlamat utama",
    goalNone: "Belum dipilih",
    childSection: "Anak",
    childName: "Nama",
    childAge: "Umur",
    childStageLabel: "Tahap komunikasi",
    childNone: "Tiada maklumat anak lagi.",
  },
}

export type Dict = typeof ms

const en: Dict = {
  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    back: "Back",
    retry: "Try again",
    loading: "Loading…",
    comingSoon: "Coming soon",
    signIn: "Sign In",
  },
  nav: {
    aktiviti: "Daily Activities",
    ai: "AI Guide",
    aac: "Board",
    analysis: "Analysis",
    feedback: "Feedback",
    wawasan: "Insights",
    users: "Users",
    setting: "Settings",
    classic: "Library",
    library: "Library",
    notification: "Notifications",
    profile: "Profile",
    comingSoon: "Coming Soon",
  },
  viewTitles: {
    ai: "Tutur AI Guide",
    aktiviti: "Daily Activities",
    aac: "AAC Board",
    classic: "Library",
    analysis: "Analysis",
    feedback: "Feedback",
    wawasan: "Insights",
    users: "Users",
    notification: "Notifications",
    setting: "Settings",
    profile: "Profile",
  },
  topbar: {
    ready: "Ready to help",
    openAi: "Open AI Guide",
    openMenu: "Open navigation menu",
  },
  settings: {
    languageTitle: "Language",
    languageDesc: "Choose the app's display language.",
    langMs: "Bahasa Melayu",
    langEn: "English",
    themeTitle: "Theme",
    themeDesc: "Choose a light or dark look.",
    themeLight: "Light",
    themeDark: "Dark",
  },
  intro: {
    lines: [
      "Every mother has this moment",
      "Your child has been to therapy",
      "But back home… what's the next step",
      "Therapy is 1 hour a week — the other 167 hours are at home.",
      "Tutur shows you how, moment by moment.",
    ],
    greeting: "Hi, I am AI Maya",
    language: "Language",
    cta: "Start with Tutur",
    freeNote: "Free to start · No credit card required",
    panelTagline: "Connection first, communication follows.",
    panelSub: "Therapy is 1 hour a week — we help with the other 167, at home.",
  },
  maintenance: {
    title: "We're under maintenance 🔧",
    body: "Tutur is getting an upgrade. New sign-ups are paused for now. Thanks for your patience!",
    loginCta: "Log in (existing users)",
  },
  deletedAccount: {
    title: "We're sad to see you go 💜",
    body: "Your account has been deleted. Thank you for letting Tutur be part of your family's journey. Our door is always open if you'd like to come back. Take care of each other.",
  },
  welcome: {
    badge: "Founding Family",
    p1Title: "Welcome to the Tutur family 💜",
    p1Body: "You've just taken a brave step for your child —",
    p1Accent: "and that already matters.",
    signature: "— Maya",
    p2Badge: "AI Companion",
    p2Title: "Every child has a voice",
    p2Body: "It just needs a little space, a little time,",
    p2Accent: "and someone beside them.",
    p3Badge: "Founders Benefits",
    benefitsTitle: "Here's what's yours as a founding family:",
    benefits: [
      {
        title: "Founding Member status — locked for life",
        desc: "RM69/month, kept even when prices rise for everyone else.",
      },
      {
        title: "Free for your first 2 weeks",
        desc: "Try every activity with your child before billing begins.",
      },
      {
        title: "Monthly live sessions with our therapist",
        desc: "Bring your own questions about your child.",
      },
      {
        title: "Early access to every new goal",
        desc: "Unlock all 10 goals before they're released publicly.",
      },
      {
        title: "A private founding-families community",
        desc: "Peer support + a real say in what we build next.",
      },
    ],
    next: "Next",
    start: "Let's begin",
    questionOf: "Question",
    agePlaceholder: "Type your child's age…",
    typePlaceholder: "Type your answer…",
    bridge: "Thank you! Let's continue.",
  },
  join: {
    haveCode: "Have an invite code? Join here",
    title: "Join an existing child",
    subtitle:
      "Enter the invite code from your partner to care for the same child.",
    placeholder: "Invite code",
    cta: "Join",
    joining: "Joining…",
    error: "Invalid or expired code.",
    back: "Back",
  },
  stageIntro: {
    badgeIntro: "Introduction",
    introTitle: "Understanding Your Child's Communication Stage",
    introBody:
      "Every child develops at their own pace. By knowing your child's communication stage right now, we can prepare activities that fit them just right — not too easy, not too hard. Let's get to know the 5 stages first, before we find your child's.",
    stageWord: "Level",
    next: "Next",
    back: "Back",
    forkBadge: "Next Step",
    forkTitle: "How would you like to continue?",
    forkBody:
      "Pick your child's stage yourself, or let Maya find it more precisely through 15 quick questions.",
    knowTitle: "I already know my child's stage",
    knowDesc:
      "Choose your child's communication stage directly and start using Tutur.",
    quizTitle: "Answer 15 questions for accuracy",
    quizDesc:
      "Let Maya assess your answers and find the most accurate stage.",
    recommended: "Recommended",
    choosePrompt: "Choose your child's stage:",
    confirm: "Continue to Dashboard",
  },
  wawasan: {
    title: "Tutur Insights",
    subtitle:
      "A summary of adoption, engagement and feedback across all users. Visible to admins only.",
    loadError: "Couldn't load insights data. Please try again.",
    guardians: "Registered guardians",
    activeUsers: "Active users",
    activitiesDone: "Activities completed",
    totalMinutes: "Total minutes",
    tabAdoption: "Adoption",
    tabEngagement: "Engagement",
    tabFunnel: "Funnel",
    tabFeedback: "Feedback",
    newSignups: "New Sign-ups",
    newSignupsSub: "New guardians per day (last 14 days).",
    onboardingDone: "Onboarding Completion",
    onboardingCaption: "guardians have chosen a goal",
    relationship: "Relationship to Child",
    activitiesTitle: "Activities Completed",
    activitiesSub: "Activities completed per day (last 14 days).",
    popular: "Most Popular Activities",
    popularEmpty: "No activities completed yet.",
    childStage: "Child Communication Stage",
    stage: "Stage",
    dash: "—",
    daysAgo: "days ago",
    now: "Now",
    funnelTitle: "User Journey",
    funnelSub: "Register → finish onboarding → do an activity → give feedback.",
    funnelRegister: "Register",
    funnelOnboard: "Finish onboarding",
    funnelActivity: "Do an activity",
    funnelFeedback: "Give feedback",
    formsSubmitted: "Forms submitted",
    responseRate: "Response rate",
    avgSatisfaction: "Avg satisfaction (Q1)",
    noFeedback: "No feedback submitted yet.",
    avgScore: "Average score:",
    answers: "answers",
    other: "Other",
    noAnswer: "No answers.",
    guardiansTitle: "Registered Guardians",
    tapHintUsers: "Select a user to view details",
    searchUsers: "Search name, email or child…",
    reactivate: "Reactivate Account",
    noResults: "No users found.",
    deletePermanently: "Delete Permanently",
    deleteTitle: "Delete this account permanently?",
    deleteBody: (name: string) =>
      `All of ${name}'s data will be permanently deleted and cannot be recovered.`,
    deleteConfirmBtn: "Yes, Delete Permanently",
    deleteError: "Couldn't delete the account. Please try again.",
    guardianFallback: "Unnamed guardian",
    guardianDefault: "Guardian",
    child: "child",
    admin: "Admin",
    deleted: "Deleted",
    miniActivities: "Activities",
    miniMinutes: "Minutes",
    miniFeedback: "Feedback",
    email: "Email",
    guardianAge: "Guardian age",
    registered: "Registered",
    primaryGoal: "Primary goal",
    goalNone: "Not chosen yet",
    childSection: "Child",
    childName: "Name",
    childAge: "Age",
    childStageLabel: "Communication stage",
    childNone: "No child information yet.",
  },
}

export const STRINGS: Record<Lang, Dict> = { ms, en }

/** UI chrome strings for the current language. */
export function useT(): Dict {
  return STRINGS[useLang().lang]
}
