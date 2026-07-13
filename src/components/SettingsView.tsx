import { useEffect, useState } from "react"
import { GOAL_BASE_ENABLED } from "@/lib/config"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import {
  createChildInvite,
  acceptChildInvite,
  loadActiveInvite,
  loadCoGuardians,
  loadMaintenance,
  resetTesterData,
  setMaintenance,
  type CoGuardian,
} from "@/lib/db"
import { useLang, useT, pick } from "@/lib/i18n"
import {
  ROUTINE_LABELS,
  STAGE_INFO,
  STAGE_ORDER,
  isRoutineComingSoon,
} from "@/lib/activities"
import { GOALS } from "@/lib/goals"
import {
  AAC_VOICE_OPTIONS,
  getAacVoice,
  setAacVoice,
  type AacVoice,
} from "@/lib/voice"
import {
  Bell,
  Check,
  Clock,
  Copy,
  AlertTriangle,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  Lock,
  Share2,
  Sparkles,
  Target,
  Users,
  Volume2,
  Wrench,
  X,
} from "lucide-react"

/** Ordered routine list (R1–R10) shared with the onboarding routine picker. */
const ROUTINE_ENTRIES = Object.entries(ROUTINE_LABELS)

/** Order-independent equality for two routine-code selections. */
function sameRoutines(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((code) => set.has(code))
}

/** Malay month names — for the "profiled on" date label. */
const MS_MONTHS = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
]

/** English month names — for the "profiled on" date label. */
const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function formatProfiledDate(iso: string | undefined, lang: "ms" | "en"): string {
  const s = STR[lang]
  if (!iso) return s.dateUnknown
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return s.dateUnknown
  const months = lang === "en" ? EN_MONTHS : MS_MONTHS
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/* ========================================================================== *
 *  SettingsView — app preferences (Tetapan).
 *
 *  • Tahap Komunikasi — manual stage override (drives recommended activities).
 *  • Pemberitahuan     — daily reminder toggle + time, weekly summary toggle.
 *  • Bahasa            — display-language preference.
 *
 *  Profile editing lives on its own ProfileView; this page is preferences only.
 *  Notification & language prefs are UI-only until a backend persists them.
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"
const PURPLE = "259 80% 55%"
const PURPLE_TEXT = "258 55% 42%"

/** Co-located UI strings for the Settings screen (chrome not covered by i18n). */
const STR = {
  ms: {
    // Communication stage section
    stageTitle: "Tahap Komunikasi",
    stageDesc:
      "Tahap ini menentukan aktiviti yang disyorkan untuk anak anda. Maya menetapkannya secara automatik berdasarkan profil semasa pendaftaran.",
    profiledOn: "Diprofil pada",
    dateUnknown: "Tidak diketahui",
    stageLabel: "Tahap",
    change: "Tukar",
    // Developmental goals section
    goalsTitle: "Matlamat Perkembangan",
    goalsDesc:
      "Matlamat aktif menjadi tumpuan Maya. Matlamat lain akan dibuka tidak lama lagi.",
    active: "Aktif",
    comingSoon: "Akan datang",
    // Daily routines section
    routinesTitle: "Rutin Harian",
    routinesDesc:
      "Rutin harian tempat Maya menyuntik aktiviti intervensi. Anda boleh ubah pilihan ini pada bila-bila masa.",
    routinesSelected: "rutin dipilih",
    noRoutinesSelected: "Tiada rutin dipilih",
    // Notifications section
    notificationsTitle: "Pemberitahuan",
    dailyReminderLabel: "Peringatan aktiviti harian",
    dailyReminderDesc: "Ingatkan saya untuk lengkapkan aktiviti hari ini.",
    reminderTimeLabel: "Masa peringatan",
    weeklySummaryLabel: "Ringkasan kemajuan mingguan",
    weeklySummaryDesc: "Hantar rumusan perkembangan anak setiap minggu.",
    // AI voice section
    voiceTitle: "Suara AI",
    voiceDesc:
      "Pilih suara yang membaca perkataan di Papan AAC aktiviti harian. Ketik untuk dengar contoh.",
    // Password section
    passwordTitle: "Kata Laluan",
    passwordDesc:
      "Tetapkan kata laluan untuk log masuk dengan lebih cepat, tanpa perlu menunggu pautan e-mel.",
    passwordPlaceholder: "Kata laluan baharu",
    passwordSaving: "Menyimpan…",
    passwordSet: "Tetapkan Kata Laluan",
    pwFailed: "Gagal menetapkan kata laluan. Sila cuba lagi.",
    pwSuccess: "Kata laluan berjaya ditetapkan! 🎉",
    pwTooWeak: "Kata laluan belum memenuhi semua syarat di bawah.",
    pwRuleLen: "Sekurang-kurangnya 8 aksara",
    pwRuleUpper: "Satu huruf besar (A–Z)",
    pwRuleLower: "Satu huruf kecil (a–z)",
    pwRuleNumber: "Satu nombor (0–9)",
    pwRuleSpecial: "Satu simbol (cth. ! @ # $)",
    pwShow: "Tunjuk kata laluan",
    pwHide: "Sembunyikan kata laluan",
    confirmPlaceholder: "Sahkan kata laluan",
    pwMismatch: "Kata laluan tidak sepadan.",
    // Maintenance (admin only)
    maintenanceTitle: "Mod Penyelenggaraan",
    maintenanceDesc:
      "Apabila dihidupkan, pendaftaran baharu dijeda dan pelawat baharu melihat poster penyelenggaraan. Pengguna sedia ada masih boleh log masuk.",
    maintenanceLabel: "Jeda pendaftaran baharu",
    maintenanceHint: "Perubahan berkuat kuasa untuk pelawat baharu.",
    // Share with partner (co-parent)
    shareTitle: "Kongsi dengan Pasangan",
    shareDesc:
      "Jemput pasangan anda untuk menjaga anak yang sama. Kemajuan dikongsi bersama — sesiapa sahaja boleh melakukan aktiviti.",
    sharedWith: "Dikongsi dengan",
    testerTitle: "Mod Penguji",
    testerDesc:
      "Anda adalah penguji pilot. Butang ini memadam SEMUA data anda — anak, jawapan onboarding, dan semua kemajuan 14 hari — supaya anda boleh mula semula dari awal. Log masuk anda kekal.",
    testerBtn: "Padam data saya & mula semula",
    testerDialogTitle: "Padam semua data anda?",
    testerDialogDesc: "Tindakan ini tidak boleh dibatalkan.",
    testerDialogLose: "Yang akan hilang:",
    testerDialogItems: [
      "Profil anak dan semua jawapan onboarding",
      "Semua kemajuan 14 hari — aktiviti, tracker, refleksi",
      "Semua masa yang direkodkan",
    ],
    testerDialogKeep: "Log masuk dan kata laluan anda kekal. Anda akan bermula semula dari skrin pertama onboarding.",
    testerCancel: "Batal",
    testerConfirmBtn: "Ya, padam semua",
    testerDone: "Memadam…",
    testerFail: "Gagal memadam. Cuba lagi.",
    roleOwner: "Pemilik",
    roleParent: "Pasangan",
    generateCode: "Jana Kod Jemputan",
    generating: "Menjana…",
    codeHint: "Kongsikan kod ini dengan pasangan anda. Sah selama 14 hari.",
    copy: "Salin",
    copied: "Disalin!",
    shareLink: "Kongsi Pautan",
    linkCopied: "Pautan disalin!",
    shareText: "Sertai saya di Tutur untuk membantu komunikasi anak kita.",
    joinTitle: "Ada kod jemputan?",
    joinPlaceholder: "Masukkan kod jemputan",
    joinBtn: "Sertai",
    joining: "Menyertai…",
    joinSuccess: "Berjaya! Memuatkan semula…",
    joinError: "Kod tidak sah atau telah tamat tempoh.",
    // Shared dialog chrome
    close: "Tutup",
    current: "Semasa",
    no: "Tidak",
    // Stage-change dialog
    stageDialogAria: "Tukar tahap komunikasi",
    stageDialogTitle: "Tukar Tahap Komunikasi",
    stageDialogDesc: "Pilih tahap baharu untuk anak anda, kemudian sahkan.",
    stageConfirmPrefix: "Tukar tahap anak anda ke",
    stageConfirmEmpty: "Pilih tahap yang berbeza untuk menukar.",
    confirmChange: "Ya, Tukar",
    // Goal-change dialog
    goalDialogAria: "Tukar matlamat utama",
    goalDialogTitle: "Tukar Matlamat Utama",
    goalDialogDesc: "Pilih matlamat baharu untuk anak anda, kemudian sahkan.",
    goalConfirmPrefix: "Tukar matlamat utama anak anda ke",
    goalConfirmEmpty: "Pilih matlamat yang berbeza untuk menukar.",
    // Routine-change dialog
    routineDialogAria: "Tukar rutin harian",
    routineDialogTitle: "Tukar Rutin Harian",
    routineDialogDesc: "Pilih rutin harian anda, kemudian sahkan.",
    routineConfirmEmpty: "Pilih sekurang-kurangnya 1 rutin.",
    routineNoChange: "Tiada perubahan dibuat.",
    routineConfirmPrefix: "Simpan",
    routineConfirmSuffix: "rutin harian anda?",
    confirmSave: "Ya, Simpan",
  },
  en: {
    // Communication stage section
    stageTitle: "Communication Stage",
    stageDesc:
      "This stage decides which activities are recommended for your child. Maya sets it automatically based on the profile from sign-up.",
    profiledOn: "Profiled on",
    dateUnknown: "Unknown",
    stageLabel: "Stage",
    change: "Change",
    // Developmental goals section
    goalsTitle: "Developmental Goals",
    goalsDesc:
      "The active goal is where Maya focuses. The other goals will open up soon.",
    active: "Active",
    comingSoon: "Coming soon",
    // Daily routines section
    routinesTitle: "Daily Routines",
    routinesDesc:
      "The daily routines where Maya weaves in intervention activities. You can change these anytime.",
    routinesSelected: "routines selected",
    noRoutinesSelected: "No routines selected",
    // Notifications section
    notificationsTitle: "Notifications",
    dailyReminderLabel: "Daily activity reminder",
    dailyReminderDesc: "Remind me to finish today's activities.",
    reminderTimeLabel: "Reminder time",
    weeklySummaryLabel: "Weekly progress summary",
    weeklySummaryDesc: "Send a summary of your child's progress every week.",
    // AI voice section
    voiceTitle: "AI Voice",
    voiceDesc:
      "Choose the voice that reads the words on the daily-activity AAC Board. Tap to hear a sample.",
    // Password section
    passwordTitle: "Password",
    passwordDesc:
      "Set a password to log in faster, without waiting for an email link.",
    passwordPlaceholder: "New password",
    passwordSaving: "Saving…",
    passwordSet: "Set Password",
    pwFailed: "Couldn't set the password. Please try again.",
    pwSuccess: "Password set successfully! 🎉",
    pwTooWeak: "Password doesn't meet all the requirements below yet.",
    pwRuleLen: "At least 8 characters",
    pwRuleUpper: "One uppercase letter (A–Z)",
    pwRuleLower: "One lowercase letter (a–z)",
    pwRuleNumber: "One number (0–9)",
    pwRuleSpecial: "One special character (e.g. ! @ # $)",
    pwShow: "Show password",
    pwHide: "Hide password",
    confirmPlaceholder: "Confirm password",
    pwMismatch: "Passwords don't match.",
    // Maintenance (admin only)
    maintenanceTitle: "Maintenance Mode",
    maintenanceDesc:
      "When on, new sign-ups are paused and new visitors see the maintenance poster. Existing users can still log in.",
    maintenanceLabel: "Pause new sign-ups",
    maintenanceHint: "Takes effect for new visitors.",
    // Share with partner (co-parent)
    shareTitle: "Share with Partner",
    shareDesc:
      "Invite your partner to care for the same child. Progress is shared — either of you can do the activities.",
    sharedWith: "Shared with",
    testerTitle: "Tester mode",
    testerDesc:
      "You are a pilot tester. This deletes ALL your data — your child, your onboarding answers, and every day of 14-day progress — so you can start over from scratch. Your login stays.",
    testerBtn: "Delete my data & start over",
    testerDialogTitle: "Delete all your data?",
    testerDialogDesc: "This cannot be undone.",
    testerDialogLose: "What you'll lose:",
    testerDialogItems: [
      "Your child's profile and every onboarding answer",
      "All 14-day progress — activities, tracker, reflections",
      "Every minute recorded",
    ],
    testerDialogKeep: "Your login and password stay. You'll start again from the first onboarding screen.",
    testerCancel: "Cancel",
    testerConfirmBtn: "Yes, delete everything",
    testerDone: "Deleting…",
    testerFail: "Delete failed. Try again.",
    roleOwner: "Owner",
    roleParent: "Partner",
    generateCode: "Generate Invite Code",
    generating: "Generating…",
    codeHint: "Share this code with your partner. Valid for 14 days.",
    copy: "Copy",
    copied: "Copied!",
    shareLink: "Share Link",
    linkCopied: "Link copied!",
    shareText: "Join me on Tutur to support our child's communication.",
    joinTitle: "Have an invite code?",
    joinPlaceholder: "Enter invite code",
    joinBtn: "Join",
    joining: "Joining…",
    joinSuccess: "Success! Reloading…",
    joinError: "Invalid or expired code.",
    // Shared dialog chrome
    close: "Close",
    current: "Current",
    no: "No",
    // Stage-change dialog
    stageDialogAria: "Change communication stage",
    stageDialogTitle: "Change Communication Stage",
    stageDialogDesc: "Pick a new stage for your child, then confirm.",
    stageConfirmPrefix: "Change your child's stage to",
    stageConfirmEmpty: "Pick a different stage to make a change.",
    confirmChange: "Yes, Change",
    // Goal-change dialog
    goalDialogAria: "Change primary goal",
    goalDialogTitle: "Change Primary Goal",
    goalDialogDesc: "Pick a new goal for your child, then confirm.",
    goalConfirmPrefix: "Change your child's primary goal to",
    goalConfirmEmpty: "Pick a different goal to make a change.",
    // Routine-change dialog
    routineDialogAria: "Change daily routines",
    routineDialogTitle: "Change Daily Routines",
    routineDialogDesc: "Pick your daily routines, then confirm.",
    routineConfirmEmpty: "Pick at least 1 routine.",
    routineNoChange: "No changes made.",
    routineConfirmPrefix: "Save",
    routineConfirmSuffix: "of your daily routines?",
    confirmSave: "Yes, Save",
  },
} as const

/** Password policy: 8+ chars, an uppercase letter, a number, a special char. */
function passwordChecks(p: string) {
  return {
    len: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  }
}
function passwordValid(p: string): boolean {
  return Object.values(passwordChecks(p)).every(Boolean)
}

export default function SettingsView({
  isAdmin = false,
  isTester = false,
  stage = 1,
  profiledAt,
  onStageChange,
  goal,
  onGoalChange,
  routines = [],
  onRoutinesChange,
}: {
  /** Admins get a trimmed Settings (language / theme / password only). */
  isAdmin?: boolean
  /** Pilot testers get a self-service data wipe so they can re-run onboarding. */
  isTester?: boolean
  /** Child's current communication stage (1–5). */
  stage?: number
  /** ISO date the child was profiled at sign-up. */
  profiledAt?: string
  /** Persists a manual stage override. */
  onStageChange: (stage: number) => void
  /** Currently selected primary goal (G1–G10). */
  goal?: string
  /** Persists a primary-goal change. */
  onGoalChange: (goal: string) => void
  /** Currently selected daily routines (R1–R10). */
  routines?: string[]
  /** Persists a daily-routine change. */
  onRoutinesChange: (routines: string[]) => void
}) {
  // Notification preferences — local until wired to a backend.
  const [dailyReminder, setDailyReminder] = useState(true)
  const [reminderTime, setReminderTime] = useState("18:00")
  const [weeklySummary, setWeeklySummary] = useState(true)
  // Language is a global, persisted preference.
  const { lang: language, setLang: setLanguage } = useLang()
  const t = useT()
  const s = STR[language]

  // Set / change account password (so magic-link accounts can use a password).
  const [newPassword, setNewPassword] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  async function handleSetPassword() {
    if (!passwordValid(newPassword)) {
      setPwMsg({ ok: false, text: s.pwTooWeak })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: s.pwMismatch })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) {
      setPwMsg({ ok: false, text: s.pwFailed })
      return
    }
    setNewPassword("")
    setConfirmPassword("")
    setPwMsg({ ok: true, text: s.pwSuccess })
  }
  const pwChecks = passwordChecks(newPassword)
  const pwMatch = confirmPassword.length > 0 && newPassword === confirmPassword

  // Share with partner — invite code + co-guardian list.
  const [coGuardians, setCoGuardians] = useState<CoGuardian[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [joinInput, setJoinInput] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  )

  const inviteLink = inviteCode
    ? `${window.location.origin}/?code=${inviteCode}`
    : null

  useEffect(() => {
    loadCoGuardians().then(setCoGuardians)
    // Re-show an existing valid code instead of forcing a new one each visit.
    loadActiveInvite().then((code) => {
      if (code) setInviteCode(code)
    })
  }, [])

  // Maintenance mode (admin only) — toggled optimistically, reverts on failure.
  const [maintenanceOn, setMaintenanceOn] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetError, setResetError] = useState(false)
  useEffect(() => {
    if (isAdmin) loadMaintenance().then(setMaintenanceOn)
  }, [isAdmin])
  async function toggleMaintenance(on: boolean) {
    setMaintenanceOn(on)
    const ok = await setMaintenance(on)
    if (!ok) setMaintenanceOn(!on)
  }

  async function handleGenerateInvite() {
    setGenLoading(true)
    setCopied(false)
    const code = await createChildInvite()
    setGenLoading(false)
    if (code) setInviteCode(code)
  }
  function handleCopyInvite() {
    if (!inviteCode) return
    navigator.clipboard
      ?.writeText(inviteCode)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }
  // Share the full join link — native share sheet on mobile, copy elsewhere.
  async function handleShareInvite() {
    if (!inviteLink) return
    const shareFn = (
      navigator as Navigator & {
        share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>
      }
    ).share
    if (shareFn) {
      try {
        await shareFn.call(navigator, {
          title: "Tutur",
          text: s.shareText,
          url: inviteLink,
        })
      } catch {
        /* user cancelled — ignore */
      }
      return
    }
    try {
      await navigator.clipboard?.writeText(inviteLink)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  async function handleJoin() {
    const code = joinInput.trim()
    if (!code || joinLoading) return
    setJoinLoading(true)
    setJoinMsg(null)
    const res = await acceptChildInvite(code)
    if (res.ok) {
      setJoinMsg({ ok: true, text: s.joinSuccess })
      window.setTimeout(() => window.location.reload(), 900)
    } else {
      setJoinLoading(false)
      setJoinMsg({ ok: false, text: s.joinError })
    }
  }

  // AAC voice (persisted) — pick female/male and hear a sample on select.
  const [aacVoice, setVoiceState] = useState<AacVoice>(getAacVoice())
  function pickVoice(v: AacVoice) {
    setVoiceState(v)
    setAacVoice(v)
    try {
      void new Audio(`/audio/activities/aac/${v}/main.mp3`).play().catch(() => {})
    } catch {
      /* ignore */
    }
  }

  // Stage change is gated behind a confirmation popup so it never changes by a
  // single tap. `pendingStage` holds the target chosen inside the dialog.
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [pendingStage, setPendingStage] = useState(stage)

  const currentInfo = STAGE_INFO[STAGE_ORDER[stage - 1]]

  function openStageDialog() {
    setPendingStage(stage) // start from the current stage each time
    setStageDialogOpen(true)
  }

  function confirmStageChange() {
    onStageChange(pendingStage)
    setStageDialogOpen(false)
  }

  // Goal change is likewise gated behind a confirmation popup. Single-select,
  // so `pendingGoal` holds the in-dialog choice until confirmed.
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [pendingGoal, setPendingGoal] = useState<string | undefined>(goal)

  function openGoalDialog() {
    setPendingGoal(goal) // start from the current goal each time
    setGoalDialogOpen(true)
  }

  function confirmGoalChange() {
    if (pendingGoal) onGoalChange(pendingGoal)
    setGoalDialogOpen(false)
  }

  // Routine change is likewise gated behind a confirmation popup. Multi-select,
  // so `pendingRoutines` holds the in-dialog selection until confirmed.
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false)
  const [pendingRoutines, setPendingRoutines] = useState<string[]>(routines)

  function openRoutineDialog() {
    setPendingRoutines(routines) // start from the current selection each time
    setRoutineDialogOpen(true)
  }

  function togglePendingRoutine(code: string) {
    setPendingRoutines((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  function confirmRoutineChange() {
    onRoutinesChange(pendingRoutines)
    setRoutineDialogOpen(false)
  }

  async function runReset() {
    setResetError(false)
    setResetting(true)
    const res = await resetTesterData()
    if (!res.ok) {
      setResetting(false)
      setResetOpen(false)
      setResetError(true)
      return
    }
    // Hard reload: the whole app is holding the old family in state, and
    // reconstructing that by hand is how you end up "reset" with a stale childId
    // still in memory.
    window.location.reload()
  }

  return (
    <>
    {resetOpen && (
      <ResetTesterDialog
        busy={resetting}
        onConfirm={runReset}
        onCancel={() => setResetOpen(false)}
      />
    )}
    <div className="h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* TESTER — a self-service wipe so a pilot tester can re-run the whole
            journey without an admin deleting their auth user each time.

            The button is gated on the role, but so is the RPC behind it: the
            database refuses `reset_my_test_data()` for anyone who is not a
            tester. Hiding a button only hides a button. */}
        {isTester && (
          <Section icon={FlaskConical} title={s.testerTitle}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {s.testerDesc}
            </p>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="w-full rounded-2xl border-[1.5px] border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              {s.testerBtn}
            </button>
            {resetError && (
              <p className="mt-2 text-xs font-medium text-destructive">{s.testerFail}</p>
            )}
          </Section>
        )}

        {/* Maintenance mode — admin only */}
        {isAdmin && (
          <Section icon={Wrench} title={s.maintenanceTitle}>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {s.maintenanceDesc}
            </p>
            <ToggleRow
              label={s.maintenanceLabel}
              description={s.maintenanceHint}
              checked={maintenanceOn}
              onChange={toggleMaintenance}
            />
          </Section>
        )}

        {/* Parent-only settings — hidden for admins, who run the system */}
        {!isAdmin && (
          <>
        {/* Communication stage — read-only summary, changed via a confirmed dialog */}
        {GOAL_BASE_ENABLED && (
        <Section icon={Sparkles} title={s.stageTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.stageDesc}
          </p>

          {/* Profiled-on date */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-3">
            <span className="text-sm text-muted-foreground">{s.profiledOn}</span>
            <span className="text-sm font-semibold text-foreground">
              {formatProfiledDate(profiledAt, language)}
            </span>
          </div>

          {/* Current stage + change trigger */}
          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3"
            style={{
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
              background: "hsl(259 80% 55% / 0.10)",
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
              style={{ background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }}
            >
              {stage}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {s.stageLabel} {stage} · {pick(currentInfo.name, language)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {pick(currentInfo.goal, language)}
              </span>
            </span>
            <button
              type="button"
              onClick={openStageDialog}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
              style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
            >
              {s.change}
            </button>
          </div>
        </Section>
        )}

        {/* Developmental goals — shared with the onboarding picker */}
        {GOAL_BASE_ENABLED && (
        <Section icon={Target} title={s.goalsTitle}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {s.goalsDesc}
            </p>
            <button
              type="button"
              onClick={openGoalDialog}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
              style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
            >
              {s.change}
            </button>
          </div>

          <ul className="space-y-2">
            {GOALS.map((g, i) => {
              const active = g.code === goal
              const soon = !!g.comingSoon
              return (
                <li
                  key={g.code}
                  className="flex items-center gap-3 rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={
                      active
                        ? {
                            background: `hsl(${CORAL} / 0.18)`,
                            color: `hsl(${CORAL})`,
                          }
                        : { background: "hsl(259 80% 55% / 0.08)" }
                    }
                  >
                    {active ? (
                      i + 1
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm font-medium",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {pick(g.aspiration, language)}
                  </span>
                  {active ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `hsl(${CORAL} / 0.18)`,
                        color: `hsl(${CORAL})`,
                      }}
                    >
                      {s.active}
                    </span>
                  ) : soon ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `hsl(${PURPLE} / 0.16)`,
                        color: `hsl(${PURPLE_TEXT})`,
                      }}
                    >
                      {s.comingSoon}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Section>
        )}

        {/* Daily routines — summary, changed via a confirmed dialog */}
        {GOAL_BASE_ENABLED && (
        <Section icon={Clock} title={s.routinesTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.routinesDesc}
          </p>

          <div
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
              background: "hsl(259 80% 55% / 0.10)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">
                {routines.length} {s.routinesSelected}
              </span>
              <button
                type="button"
                onClick={openRoutineDialog}
                className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
                style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
              >
                {s.change}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {routines.length > 0 ? (
                routines.map((code) => (
                  <span
                    key={code}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
                  >
                    {ROUTINE_LABELS[code] ? pick(ROUTINE_LABELS[code], language) : code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {s.noRoutinesSelected}
                </span>
              )}
            </div>
          </div>
        </Section>
        )}

        {/* Notifications */}
        <Section icon={Bell} title={s.notificationsTitle}>
          <ToggleRow
            label={s.dailyReminderLabel}
            description={s.dailyReminderDesc}
            checked={dailyReminder}
            onChange={setDailyReminder}
          />
          {dailyReminder && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-3">
              <label
                htmlFor="reminder-time"
                className="text-sm font-medium text-foreground"
              >
                {s.reminderTimeLabel}
              </label>
              <input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-xl bg-transparent px-3 py-1.5 text-sm font-medium text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring"
                style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.4)` }}
              />
            </div>
          )}
          <ToggleRow
            label={s.weeklySummaryLabel}
            description={s.weeklySummaryDesc}
            checked={weeklySummary}
            onChange={setWeeklySummary}
          />
        </Section>
          </>
        )}

        {/* Language */}
        <Section icon={Globe} title={t.settings.languageTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.settings.languageDesc}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "ms" as const, label: t.settings.langMs },
              { id: "en" as const, label: t.settings.langEn },
            ].map((opt) => {
              const active = language === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLanguage(opt.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    active
                      ? "bg-[hsl(259_80%_55%/0.10)] text-foreground"
                      : "border-foreground/10 text-foreground/70 hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
                  )}
                  style={
                    active
                      ? {
                          borderColor: `hsl(${CORAL} / 0.7)`,
                          boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
                          color: `hsl(${CORAL})`,
                        }
                      : undefined
                  }
                >
                  {opt.label}
                  {active && <SelectedTick />}
                </button>
              )
            })}
          </div>
        </Section>

        {/* AI voice for the daily-activity Papan AAC (parents only) */}
        {!isAdmin && (
        <Section icon={Volume2} title={s.voiceTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.voiceDesc}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {AAC_VOICE_OPTIONS.map((opt) => {
              const active = aacVoice === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => pickVoice(opt.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all",
                    active
                      ? "bg-[hsl(259_80%_55%/0.10)]"
                      : "border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5"
                  )}
                  style={
                    active
                      ? {
                          borderColor: `hsl(${CORAL} / 0.7)`,
                          boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold"
                    style={active ? { color: `hsl(${CORAL})` } : undefined}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                  {active && <SelectedTick className="right-3 top-3" />}
                </button>
              )
            })}
          </div>
        </Section>
        )}

        {/* Account password — set one to log in without an email link */}
        <Section icon={Lock} title={s.passwordTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.passwordDesc}
          </p>
          {/* Password input with show/hide */}
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setPwMsg(null)
              }}
              placeholder={s.passwordPlaceholder}
              className="w-full rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
              style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.3)` }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? s.pwHide : s.pwShow}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Live requirements checklist */}
          <ul className="space-y-1.5">
            {[
              { ok: pwChecks.len, label: s.pwRuleLen },
              { ok: pwChecks.upper, label: s.pwRuleUpper },
              { ok: pwChecks.lower, label: s.pwRuleLower },
              { ok: pwChecks.number, label: s.pwRuleNumber },
              { ok: pwChecks.special, label: s.pwRuleSpecial },
            ].map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-xs">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: r.ok
                      ? `hsl(${TEAL} / 0.18)`
                      : "hsl(var(--foreground) / 0.08)",
                  }}
                >
                  {r.ok && (
                    <Check
                      className="h-2.5 w-2.5"
                      strokeWidth={3}
                      style={{ color: `hsl(${TEAL})` }}
                    />
                  )}
                </span>
                <span
                  style={{
                    color: r.ok
                      ? `hsl(${TEAL})`
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {r.label}
                </span>
              </li>
            ))}
          </ul>

          {/* Confirm password */}
          <input
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setPwMsg(null)
            }}
            placeholder={s.confirmPlaceholder}
            className="w-full rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
            style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.3)` }}
          />
          {confirmPassword.length > 0 && !pwMatch && (
            <p className="text-xs font-medium text-destructive">
              {s.pwMismatch}
            </p>
          )}

          {pwMsg && (
            <p
              className="text-xs font-medium"
              style={{
                color: pwMsg.ok ? `hsl(${TEAL})` : "hsl(var(--destructive))",
              }}
            >
              {pwMsg.text}
            </p>
          )}
          <button
            type="button"
            onClick={handleSetPassword}
            disabled={pwLoading || !passwordValid(newPassword) || !pwMatch}
            className="w-full rounded-2xl py-3 text-sm font-bold text-background transition-all active:scale-[0.99] disabled:opacity-40"
            style={{ background: `hsl(${CORAL})` }}
          >
            {pwLoading ? s.passwordSaving : s.passwordSet}
          </button>
        </Section>

        {/* Share with partner — co-parent invite + shared-with list (parents only) */}
        {!isAdmin && (
        <Section icon={Users} title={s.shareTitle}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {s.shareDesc}
          </p>

          {coGuardians.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.sharedWith}
              </p>
              {coGuardians.map((g) => (
                <div
                  key={g.guardianId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {g.name || s.roleParent}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: `hsl(${CORAL} / 0.16)`,
                      color: `hsl(${CORAL})`,
                    }}
                  >
                    {g.role === "owner" ? s.roleOwner : s.roleParent}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Generate / show the invite code */}
          {inviteCode ? (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 rounded-2xl border px-4 py-3"
                style={{ borderColor: `hsl(${CORAL} / 0.4)` }}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-lg font-bold tracking-[0.2em] text-foreground">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-background transition-all active:scale-[0.97]"
                  style={{ background: `hsl(${CORAL})` }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? s.copied : s.copy}
                </button>
              </div>
              <button
                type="button"
                onClick={handleShareInvite}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-background transition-all active:scale-[0.99]"
                style={{ background: `hsl(${CORAL})` }}
              >
                <Share2 className="h-4 w-4" />
                {linkCopied ? s.linkCopied : s.shareLink}
              </button>
              <p className="text-xs text-muted-foreground">{s.codeHint}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateInvite}
              disabled={genLoading}
              className="w-full rounded-2xl py-3 text-sm font-bold text-background transition-all active:scale-[0.99] disabled:opacity-40"
              style={{ background: `hsl(${CORAL})` }}
            >
              {genLoading ? s.generating : s.generateCode}
            </button>
          )}

          {/* Join an existing child with a code */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            <p className="text-sm font-semibold text-foreground">
              {s.joinTitle}
            </p>
            <div className="flex items-center gap-2">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder={s.joinPlaceholder}
                autoCapitalize="characters"
                className="h-11 min-w-0 flex-1 rounded-2xl bg-[hsl(259_80%_55%/0.10)] px-4 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.3)` }}
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinLoading || !joinInput.trim()}
                className="h-11 shrink-0 rounded-2xl px-5 text-sm font-bold text-background transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: `hsl(${CORAL})` }}
              >
                {joinLoading ? s.joining : s.joinBtn}
              </button>
            </div>
            {joinMsg && (
              <p
                className="text-xs font-medium"
                style={{
                  color: joinMsg.ok
                    ? `hsl(${TEAL})`
                    : "hsl(var(--destructive))",
                }}
              >
                {joinMsg.text}
              </p>
            )}
          </div>
        </Section>
        )}
      </div>
    </div>

      {/* Stage-change confirmation popup */}
      {stageDialogOpen && (
        <StageChangeDialog
          currentStage={stage}
          pendingStage={pendingStage}
          onPick={setPendingStage}
          onConfirm={confirmStageChange}
          onCancel={() => setStageDialogOpen(false)}
        />
      )}

      {/* Goal-change confirmation popup */}
      {goalDialogOpen && (
        <GoalChangeDialog
          currentGoal={goal}
          pendingGoal={pendingGoal}
          onPick={setPendingGoal}
          onConfirm={confirmGoalChange}
          onCancel={() => setGoalDialogOpen(false)}
        />
      )}

      {/* Routine-change confirmation popup */}
      {routineDialogOpen && (
        <RoutineChangeDialog
          currentRoutines={routines}
          pendingRoutines={pendingRoutines}
          onToggle={togglePendingRoutine}
          onConfirm={confirmRoutineChange}
          onCancel={() => setRoutineDialogOpen(false)}
        />
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stage-change confirmation dialog                                          */
/*                                                                            */
/*  Pick the target stage, then double-confirm with Ya / Tidak. "Ya" is only  */
/*  enabled once a stage different from the current one is selected.          */
/* -------------------------------------------------------------------------- */

function StageChangeDialog({
  currentStage,
  pendingStage,
  onPick,
  onConfirm,
  onCancel,
}: {
  currentStage: number
  pendingStage: number
  onPick: (stage: number) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const changed = pendingStage !== currentStage
  const target = STAGE_INFO[STAGE_ORDER[pendingStage - 1]]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.stageDialogAria}
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              {s.stageDialogTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.stageDialogDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={s.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stage options */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {STAGE_ORDER.map((code, i) => {
            const num = i + 1
            const selected = num === pendingStage
            const isCurrent = num === currentStage
            const info = STAGE_INFO[code]
            return (
              <button
                key={code}
                type="button"
                onClick={() => onPick(num)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "bg-[hsl(259_80%_55%/0.10)]"
                    : "border-foreground/10 hover:border-foreground/10 hover:bg-foreground/5"
                )}
                style={
                  selected
                    ? {
                        borderColor: `hsl(${CORAL} / 0.85)`,
                        boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={
                    selected
                      ? { background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }
                      : { background: "hsl(259 80% 55% / 0.08)" }
                  }
                >
                  {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {s.stageLabel} {num} · {pick(info.name, lang)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {pick(info.goal, lang)}
                  </span>
                </span>
                {isCurrent && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    {s.current}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Confirmation footer */}
        <div className="shrink-0 space-y-3 border-t border-border/60 px-5 py-4">
          <p className="text-center text-sm text-foreground/90">
            {changed ? (
              <>
                {s.stageConfirmPrefix}{" "}
                <span className="font-bold" style={{ color: `hsl(${CORAL})` }}>
                  {s.stageLabel} {pendingStage} · {pick(target.name, lang)}
                </span>
                ?
              </>
            ) : (
              s.stageConfirmEmpty
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-foreground/5"
            >
              {s.no}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!changed}
              className="rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
              style={{
                background: `hsl(${CORAL})`,
                boxShadow: changed ? `0 0 24px -6px hsl(${CORAL} / 0.7)` : "none",
              }}
            >
              {s.confirmChange}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Goal-change confirmation dialog                                           */
/*                                                                            */
/*  Single-select the primary goal, then double-confirm with Ya / Tidak.      */
/*  "Ya" is only enabled once a goal different from the current one is picked. */
/* -------------------------------------------------------------------------- */

function GoalChangeDialog({
  currentGoal,
  pendingGoal,
  onPick,
  onConfirm,
  onCancel,
}: {
  currentGoal?: string
  pendingGoal?: string
  onPick: (goal: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const changed = !!pendingGoal && pendingGoal !== currentGoal
  const target = GOALS.find((g) => g.code === pendingGoal)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.goalDialogAria}
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              {s.goalDialogTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.goalDialogDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={s.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Goal options */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {GOALS.map((g) => {
            const selected = g.code === pendingGoal
            const isCurrent = g.code === currentGoal
            const soon = !!g.comingSoon
            return (
              <button
                key={g.code}
                type="button"
                disabled={soon}
                onClick={() => !soon && onPick(g.code)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                  soon
                    ? "cursor-not-allowed border-foreground/10 opacity-55"
                    : selected
                      ? "bg-[hsl(259_80%_55%/0.10)]"
                      : "border-foreground/10 hover:border-foreground/10 hover:bg-foreground/5"
                )}
                style={
                  selected && !soon
                    ? {
                        borderColor: `hsl(${CORAL} / 0.85)`,
                        boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                  style={
                    selected && !soon
                      ? { background: `hsl(${CORAL} / 0.18)`, color: `hsl(${CORAL})` }
                      : { background: "hsl(259 80% 55% / 0.08)" }
                  }
                >
                  {selected && !soon ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {pick(g.aspiration, lang)}
                </span>
                {soon ? (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: `hsl(${PURPLE} / 0.16)`,
                      color: `hsl(${PURPLE_TEXT})`,
                    }}
                  >
                    <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {s.comingSoon}
                  </span>
                ) : isCurrent ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    {s.current}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Confirmation footer */}
        <div className="shrink-0 space-y-3 border-t border-border/60 px-5 py-4">
          <p className="text-center text-sm text-foreground/90">
            {changed ? (
              <>
                {s.goalConfirmPrefix}{" "}
                <span className="font-bold" style={{ color: `hsl(${CORAL})` }}>
                  “{target ? pick(target.aspiration, lang) : ""}”
                </span>
                ?
              </>
            ) : (
              s.goalConfirmEmpty
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-foreground/5"
            >
              {s.no}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!changed}
              className="rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
              style={{
                background: `hsl(${CORAL})`,
                boxShadow: changed ? `0 0 24px -6px hsl(${CORAL} / 0.7)` : "none",
              }}
            >
              {s.confirmChange}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Routine-change confirmation dialog                                        */
/*                                                                            */
/*  Multi-select the daily routines, then double-confirm with Ya / Tidak.     */
/*  "Ya" is enabled once the selection is non-empty and differs from current. */
/* -------------------------------------------------------------------------- */

function RoutineChangeDialog({
  currentRoutines,
  pendingRoutines,
  onToggle,
  onConfirm,
  onCancel,
}: {
  currentRoutines: string[]
  pendingRoutines: string[]
  onToggle: (code: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const empty = pendingRoutines.length === 0
  const changed = !sameRoutines(currentRoutines, pendingRoutines)
  const canConfirm = !empty && changed

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.routineDialogAria}
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              {s.routineDialogTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.routineDialogDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={s.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Routine options — multi-select */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {ROUTINE_ENTRIES.map(([code, name]) => {
            const selected = pendingRoutines.includes(code)
            const isCurrent = currentRoutines.includes(code)
            const soon = isRoutineComingSoon(code)
            return (
              <button
                key={code}
                type="button"
                disabled={soon}
                onClick={() => !soon && onToggle(code)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                  soon
                    ? "cursor-not-allowed border-foreground/10 opacity-55"
                    : selected
                      ? "bg-[hsl(259_80%_55%/0.10)]"
                      : "border-foreground/10 hover:border-foreground/10 hover:bg-foreground/5"
                )}
                style={
                  selected && !soon
                    ? {
                        borderColor: `hsl(${CORAL} / 0.85)`,
                        boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
                      }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all",
                    selected && !soon ? "border-transparent" : "border-foreground/10"
                  )}
                  style={selected && !soon ? { background: `hsl(${CORAL})` } : undefined}
                  aria-hidden
                >
                  {selected && !soon && (
                    <Check className="h-4 w-4 text-background" strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {pick(name, lang)}
                </span>
                {soon ? (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: `hsl(${PURPLE} / 0.16)`,
                      color: `hsl(${PURPLE_TEXT})`,
                    }}
                  >
                    <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {s.comingSoon}
                  </span>
                ) : isCurrent ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    {s.current}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Confirmation footer */}
        <div className="shrink-0 space-y-3 border-t border-border/60 px-5 py-4">
          <p className="text-center text-sm text-foreground/90">
            {empty
              ? s.routineConfirmEmpty
              : !changed
                ? s.routineNoChange
                : `${s.routineConfirmPrefix} ${pendingRoutines.length} ${s.routineConfirmSuffix}`}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-foreground/5"
            >
              {s.no}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
              style={{
                background: `hsl(${CORAL})`,
                boxShadow: canConfirm ? `0 0 24px -6px hsl(${CORAL} / 0.7)` : "none",
              }}
            >
              {s.confirmSave}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/** The violet "selected" tick badge — shared by every chosen option button so
 *  selection reads the same across Bahasa, Tema, and Suara AI. */
function SelectedTick({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute flex h-5 w-5 items-center justify-center rounded-full",
        className ?? "right-2.5 top-1/2 -translate-y-1/2"
      )}
      style={{ background: `hsl(${CORAL})` }}
    >
      <Check className="h-3 w-3 text-background" strokeWidth={3} />
    </span>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Bell
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-3xl glass-strong p-5">
      <h3 className="font-display flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Icon className="h-4 w-4" style={{ color: `hsl(${CORAL})` }} />
        {title}
      </h3>
      {children}
    </section>
  )
}

/** A labelled row with a sliding on/off switch. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors"
        style={{
          background: checked ? `hsl(${CORAL})` : "hsl(var(--foreground) / 0.08)",
        }}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 *  ResetTesterDialog — the wipe, confirmed properly.
 *
 *  This replaces `window.confirm()`. Not only because the browser dialog is ugly:
 *  it is also unstyleable, unreadable on a phone, and — worst of all — it renders
 *  a permanent deletion in exactly the same chrome as "allow notifications?", so
 *  it gets dismissed on autopilot. A destructive action deserves a screen that
 *  says what is about to be destroyed.
 *
 *  Hence the list. "Delete all your data?" is abstract; "your child's profile,
 *  every onboarding answer, all 14 days" is a thing a person can actually weigh.
 * -------------------------------------------------------------------------- */
function ResetTesterDialog({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  // Resolved here, like the other dialogs in this file — `Copy` is taken by the
  // lucide icon, so the copy table cannot be passed in as a typed prop.
  const { lang } = useLang()
  const s = STR[lang]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.testerDialogTitle}
        className="relative flex w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-foreground/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border/60 px-5 py-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "hsl(var(--destructive) / 0.12)" }}
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">{s.testerDialogTitle}</h2>
            <p className="mt-0.5 text-xs font-medium text-destructive">
              {s.testerDialogDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={s.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {s.testerDialogLose}
          </p>
          <ul className="space-y-2">
            {s.testerDialogItems.map((item: string) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-2xl bg-foreground/[0.05] p-3 text-xs leading-relaxed text-muted-foreground">
            {s.testerDialogKeep}
          </p>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border/60 px-5 py-4">
          {/* Cancel is the WIDER, calmer button. The destructive one should never
              be the easiest thing to hit by accident. */}
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl border-[1.5px] border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
          >
            {s.testerCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? s.testerDone : s.testerConfirmBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
