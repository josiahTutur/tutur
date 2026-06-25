import { useState } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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
  Globe,
  Lock,
  Sparkles,
  Target,
  Volume2,
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

function formatMalayDate(iso?: string): string {
  if (!iso) return "Tidak diketahui"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "Tidak diketahui"
  return `${d.getDate()} ${MS_MONTHS[d.getMonth()]} ${d.getFullYear()}`
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

const CORAL = "12 100% 64%"
const TEAL = "172 66% 50%"
const PURPLE = "270 95% 65%"
const PURPLE_TEXT = "270 95% 84%"

export default function SettingsView({
  stage = 1,
  profiledAt,
  onStageChange,
  goal,
  onGoalChange,
  routines = [],
  onRoutinesChange,
}: {
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
  // Notification & language preferences — local until wired to a backend.
  const [dailyReminder, setDailyReminder] = useState(true)
  const [reminderTime, setReminderTime] = useState("18:00")
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [language, setLanguage] = useState<"ms" | "en">("ms")

  // Set / change account password (so magic-link accounts can use a password).
  const [newPassword, setNewPassword] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  async function handleSetPassword() {
    if (newPassword.length < 6) {
      setPwMsg({ ok: false, text: "Kata laluan mesti sekurang-kurangnya 6 aksara." })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) {
      setPwMsg({ ok: false, text: "Gagal menetapkan kata laluan. Sila cuba lagi." })
      return
    }
    setNewPassword("")
    setPwMsg({ ok: true, text: "Kata laluan berjaya ditetapkan! 🎉" })
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

  return (
    <>
    <div className="h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Communication stage — read-only summary, changed via a confirmed dialog */}
        <Section icon={Sparkles} title="Tahap Komunikasi">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tahap ini menentukan aktiviti yang disyorkan untuk anak anda. Maya
            menetapkannya secara automatik berdasarkan profil semasa pendaftaran.
          </p>

          {/* Profiled-on date */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
            <span className="text-sm text-muted-foreground">Diprofil pada</span>
            <span className="text-sm font-semibold text-foreground">
              {formatMalayDate(profiledAt)}
            </span>
          </div>

          {/* Current stage + change trigger */}
          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3"
            style={{
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
              background: "hsl(0 0% 100% / 0.06)",
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
                Tahap {stage} · {currentInfo.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {currentInfo.goal}
              </span>
            </span>
            <button
              type="button"
              onClick={openStageDialog}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
              style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
            >
              Tukar
            </button>
          </div>
        </Section>

        {/* Developmental goals — shared with the onboarding picker */}
        <Section icon={Target} title="Matlamat Perkembangan">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Matlamat aktif menjadi tumpuan Maya. Matlamat lain akan dibuka
              tidak lama lagi.
            </p>
            <button
              type="button"
              onClick={openGoalDialog}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
              style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
            >
              Tukar
            </button>
          </div>

          <ul className="space-y-2">
            {GOALS.map((g, i) => {
              const active = g.code === goal
              const soon = !!g.comingSoon
              return (
                <li
                  key={g.code}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={
                      active
                        ? {
                            background: `hsl(${CORAL} / 0.18)`,
                            color: `hsl(${CORAL})`,
                          }
                        : { background: "hsl(0 0% 100% / 0.05)" }
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
                    {g.aspiration}
                  </span>
                  {active ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `hsl(${CORAL} / 0.18)`,
                        color: `hsl(${CORAL})`,
                      }}
                    >
                      Aktif
                    </span>
                  ) : soon ? (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `hsl(${PURPLE} / 0.16)`,
                        color: `hsl(${PURPLE_TEXT})`,
                      }}
                    >
                      Akan datang
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Section>

        {/* Daily routines — summary, changed via a confirmed dialog */}
        <Section icon={Clock} title="Rutin Harian">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Rutin harian tempat Maya menyuntik aktiviti intervensi. Anda boleh ubah
            pilihan ini pada bila-bila masa.
          </p>

          <div
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: `hsl(${CORAL} / 0.85)`,
              boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6)`,
              background: "hsl(0 0% 100% / 0.06)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">
                {routines.length} rutin dipilih
              </span>
              <button
                type="button"
                onClick={openRoutineDialog}
                className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-background transition-all active:scale-[0.97]"
                style={{ background: `hsl(${CORAL})`, boxShadow: `0 4px 16px -4px hsl(${CORAL} / 0.7)` }}
              >
                Tukar
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
                    {ROUTINE_LABELS[code] ?? code}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  Tiada rutin dipilih
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Pemberitahuan">
          <ToggleRow
            label="Peringatan aktiviti harian"
            description="Ingatkan saya untuk lengkapkan aktiviti hari ini."
            checked={dailyReminder}
            onChange={setDailyReminder}
          />
          {dailyReminder && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
              <label
                htmlFor="reminder-time"
                className="text-sm font-medium text-foreground"
              >
                Masa peringatan
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
            label="Ringkasan kemajuan mingguan"
            description="Hantar rumusan perkembangan anak setiap minggu."
            checked={weeklySummary}
            onChange={setWeeklySummary}
          />
        </Section>

        {/* Language */}
        <Section icon={Globe} title="Bahasa">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pilih bahasa paparan aplikasi.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "ms" as const, label: "Bahasa Melayu", soon: false },
              { id: "en" as const, label: "English", soon: true },
            ].map((opt) => {
              const active = !opt.soon && language === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !opt.soon && setLanguage(opt.id)}
                  disabled={opt.soon}
                  aria-pressed={active}
                  className={cn(
                    "relative flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    opt.soon
                      ? "cursor-not-allowed border-white/10 text-foreground/40"
                      : active
                        ? "bg-white/[0.06] text-foreground"
                        : "border-white/10 text-foreground/70 hover:border-white/20 hover:text-foreground"
                  )}
                  style={
                    active
                      ? {
                          borderColor: `hsl(${TEAL} / 0.7)`,
                          boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.4)`,
                          color: `hsl(${TEAL})`,
                        }
                      : undefined
                  }
                >
                  {opt.label}
                  {opt.soon && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: `hsl(${CORAL} / 0.18)`,
                        color: `hsl(${CORAL})`,
                      }}
                    >
                      Akan datang
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* AI voice for the daily-activity Papan AAC */}
        <Section icon={Volume2} title="Suara AI">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pilih suara yang membaca perkataan di Papan AAC aktiviti harian.
            Ketik untuk dengar contoh.
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
                      ? "bg-white/[0.06]"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                  )}
                  style={
                    active
                      ? {
                          borderColor: `hsl(${TEAL} / 0.7)`,
                          boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.4)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold"
                    style={active ? { color: `hsl(${TEAL})` } : undefined}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                  {active && (
                    <span
                      className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: `hsl(${TEAL})` }}
                    >
                      <Check className="h-3 w-3 text-background" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Account password — set one to log in without an email link */}
        <Section icon={Lock} title="Kata Laluan">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tetapkan kata laluan untuk log masuk dengan lebih cepat, tanpa perlu
            menunggu pautan e-mel.
          </p>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Kata laluan baharu (sekurang-kurangnya 6 aksara)"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
            style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.3)` }}
          />
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
            disabled={pwLoading || newPassword.length < 6}
            className="w-full rounded-2xl py-3 text-sm font-bold text-background transition-all active:scale-[0.99] disabled:opacity-40"
            style={{ background: `hsl(${CORAL})` }}
          >
            {pwLoading ? "Menyimpan…" : "Tetapkan Kata Laluan"}
          </button>
        </Section>
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
        aria-label="Tukar tahap komunikasi"
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              Tukar Tahap Komunikasi
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pilih tahap baharu untuk anak anda, kemudian sahkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
                    ? "bg-white/[0.06]"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
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
                      : { background: "hsl(0 0% 100% / 0.05)" }
                  }
                >
                  {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Tahap {num} · {info.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {info.goal}
                  </span>
                </span>
                {isCurrent && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    Semasa
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
                Tukar tahap anak anda ke{" "}
                <span className="font-bold" style={{ color: `hsl(${CORAL})` }}>
                  Tahap {pendingStage} · {target.name}
                </span>
                ?
              </>
            ) : (
              "Pilih tahap yang berbeza untuk menukar."
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-white/[0.08]"
            >
              Tidak
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
              Ya, Tukar
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
        aria-label="Tukar matlamat utama"
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              Tukar Matlamat Utama
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pilih matlamat baharu untuk anak anda, kemudian sahkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
                    ? "cursor-not-allowed border-white/10 opacity-55"
                    : selected
                      ? "bg-white/[0.06]"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
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
                      : { background: "hsl(0 0% 100% / 0.05)" }
                  }
                >
                  {selected && !soon ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {g.aspiration}
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
                    Akan datang
                  </span>
                ) : isCurrent ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    Semasa
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
                Tukar matlamat utama anak anda ke{" "}
                <span className="font-bold" style={{ color: `hsl(${CORAL})` }}>
                  “{target?.aspiration}”
                </span>
                ?
              </>
            ) : (
              "Pilih matlamat yang berbeza untuk menukar."
            )}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-white/[0.08]"
            >
              Tidak
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
              Ya, Tukar
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
        aria-label="Tukar rutin harian"
        className="relative flex max-h-[88vh] w-full max-w-md animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-background/95 backdrop-blur-2xl sm:rounded-3xl"
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              Tukar Rutin Harian
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pilih rutin harian anda, kemudian sahkan.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
                    ? "cursor-not-allowed border-white/10 opacity-55"
                    : selected
                      ? "bg-white/[0.06]"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
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
                    selected && !soon ? "border-transparent" : "border-white/25"
                  )}
                  style={selected && !soon ? { background: `hsl(${CORAL})` } : undefined}
                  aria-hidden
                >
                  {selected && !soon && (
                    <Check className="h-4 w-4 text-background" strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {name}
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
                    Akan datang
                  </span>
                ) : isCurrent ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
                  >
                    Semasa
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
              ? "Pilih sekurang-kurangnya 1 rutin."
              : !changed
                ? "Tiada perubahan dibuat."
                : `Simpan ${pendingRoutines.length} rutin harian anda?`}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-white/[0.08]"
            >
              Tidak
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
              Ya, Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

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
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
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
          background: checked ? `hsl(${CORAL})` : "hsl(0 0% 100% / 0.12)",
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
