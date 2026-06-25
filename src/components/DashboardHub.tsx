import { useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  Bell,
  Check,
  User,
  Settings,
  ArrowUp,
  Lock,
  Play,
  LayoutGrid,
  BrainCircuit,
  Menu,
  Volume2,
  X,
  Film,
  Library,
  BarChart3,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import {
  ACTIVITIES,
  AAC_STAGES,
  ROUTINE_LABELS,
  STAGE_INFO,
  STAGE_ORDER,
  type Activity,
  type AacWord,
  type StageCode,
} from "@/lib/activities"
import ActivityLibrary, {
  ActivityBoardModal,
  type ActivityRecord,
} from "@/components/ActivityLibrary"
import {
  loadTodayCompletions,
  insertCompletion,
  updateCompletion,
} from "@/lib/db"
import AnalysisView from "@/components/AnalysisView"
import ProfileView from "@/components/ProfileView"
import SettingsView from "@/components/SettingsView"

/* ========================================================================== *
 *  DashboardHub — Part 4: Generative Chat Hub & Classic Dashboard Toggle
 *
 *  The primary post-profiling surface for Tutur. Lands here straight after the
 *  child-communication analysis (ProfilingResults), replacing the legacy
 *  Dashboard as the home base.
 *
 *  Theme: the established high-tech Dark Mode baseline, warmed with approachable
 *  neon accents — Warm Coral for primary triggers, Calming Teal for health
 *  metrics. (The app's cyan is kept only for Maya's AI halo.)
 *
 *  Navigation:
 *    • md+   : a fixed 260px left nav rail (AI · Papan · Notifikasi · Tetapan)
 *              with the classic toggle + profile pinned to the bottom.
 *    • sm    : the rail collapses into a slide-in drawer opened by the top-left
 *              3-dot button; the Maya AI logo sits at the far right of the bar.
 *
 *  The four views cross-fade via opacity/transform so switching never reflows
 *  the page or flashes a component.
 * ========================================================================== */

/* Warm accent palette (HSL channels, used inline like the rest of the app). */
const CORAL = "12 100% 64%" // primary triggers / active nav
const TEAL = "172 66% 50%" // health / progress metrics
const CYAN = "187 100% 50%" // Maya's AI identity halo
const PURPLE = "270 95% 65%" // Papan AAC accent
const PURPLE_TEXT = "270 95% 84%"

/* -------------------------------------------------------------------------- */
/*  Navigation model                                                          */
/* -------------------------------------------------------------------------- */

// "classic" (Papan Pemuka Klasik) has no nav entry — it's reached via the
// "Your Activities" button. "aac" is the AAC Board nav destination.
type NavId =
  | "ai"
  | "aktiviti"
  | "aac"
  | "analysis"
  | "notification"
  | "setting"
  | "classic"
  | "profile"

// Page titles shown in the persistent top navigation bar.
const VIEW_TITLES: Record<NavId, string> = {
  ai: "Panduan AI Tutur",
  aktiviti: "Aktiviti Harian",
  aac: "Papan AAC",
  classic: "Library",
  analysis: "Analisis",
  notification: "Notifikasi",
  setting: "Tetapan",
  profile: "Profil",
}

// "notification" has no nav entry — it's reached via the bell beside the
// profile at the bottom of the rail.
const NAV_ITEMS: ReadonlyArray<{
  id: NavId
  label: string
  icon: typeof Bot
  /** Marks a not-yet-ready destination — shows an "Akan Datang" chip + a
   *  blurred teaser view instead of the real page. */
  comingSoon?: boolean
}> = [
  { id: "aktiviti", label: "Aktiviti Harian", icon: Library },
  { id: "ai", label: "Panduan AI", icon: BrainCircuit },
  { id: "aac", label: "Papan", icon: LayoutGrid },
  { id: "analysis", label: "Analisis", icon: BarChart3, comingSoon: true },
  { id: "setting", label: "Tetapan", icon: Settings },
]

/* -------------------------------------------------------------------------- */
/*  Static placeholder content (pre-backend)                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- *
 *  Video library — categorized parent-coaching videos.
 *
 *  Four lenses on the same coaching catalogue, so a parent can enter by
 *  whichever frame fits them right now:
 *    • Demo Aktiviti   — one walkthrough per activity (derived from ACTIVITIES,
 *                        so the deck grows automatically as A4… are added).
 *    • Teknik Terapi   — the validated strategies (S1–S5) behind the activities.
 *    • Panduan Tahap   — a stage orientation per communication stage (T1–T5).
 *    • Asas Papan AAC  — using the AAC board & modelling core words.
 * -------------------------------------------------------------------------- */

interface VideoItem {
  title: string
  meta: string
  tag: string
}

interface VideoCategory {
  id: string
  label: string
  description: string
  hue: number // tag-badge accent (matches the AAC board palette)
  videos: VideoItem[]
}

// One demo per activity — kept in sync with the activity catalogue.
const ACTIVITY_VIDEOS: VideoItem[] = ACTIVITIES.map((a) => ({
  title: a.title,
  meta: `${a.coreSkill} • ${ROUTINE_LABELS[a.routine] ?? a.routine}`,
  tag: a.code,
}))

// One orientation per communication stage — kept in sync with STAGE_INFO.
const STAGE_VIDEOS: VideoItem[] = STAGE_ORDER.map((code, i) => ({
  title: `Tahap ${i + 1}: ${STAGE_INFO[code].name}`,
  meta: STAGE_INFO[code].goal,
  tag: code,
}))

const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    id: "aktiviti",
    label: "Demo Aktiviti",
    description:
      "Tonton cara melakukan setiap aktiviti harian, langkah demi langkah.",
    hue: 12, // coral
    videos: ACTIVITY_VIDEOS,
  },
  {
    id: "teknik",
    label: "Teknik Terapi",
    description:
      "Kuasai strategi pertuturan yang menjadi asas setiap aktiviti.",
    hue: 172, // teal
    videos: [
      {
        title: "Bercakap Banyak (Parallel Talk)",
        meta: "Modelkan bahasa sepanjang rutin",
        tag: "S1",
      },
      {
        title: "Tunggu & Beri Ruang",
        meta: "Beri masa anak memulakan komunikasi",
        tag: "S2",
      },
      {
        title: "Ulang, Panjang & Kembang",
        meta: "Kembangkan perkataan kepada frasa",
        tag: "S3",
      },
      {
        title: "Beri Pilihan & Ambil Giliran",
        meta: "Bina interaksi dua hala",
        tag: "S4",
      },
      {
        title: "Soalan WH & Naratif",
        meta: "Bina ayat dan kemahiran bercerita",
        tag: "S5",
      },
    ],
  },
  {
    id: "tahap",
    label: "Panduan Tahap",
    description:
      "Fahami matlamat dan fokus bagi tahap komunikasi anak anda.",
    hue: 270, // purple
    videos: STAGE_VIDEOS,
  },
  {
    id: "aac",
    label: "Asas Papan AAC",
    description:
      "Belajar menggunakan papan AAC untuk menyokong komunikasi anak.",
    hue: 210, // blue
    videos: [
      {
        title: "Mengenali Papan AAC",
        meta: "Pengenalan komunikasi bantuan",
        tag: "Asas",
      },
      {
        title: "Model Perkataan Teras",
        meta: "NAK · LAGI · HABIS · TOLONG",
        tag: "Teras",
      },
      {
        title: "Aided Language Input",
        meta: "Sentuh simbol sambil bercakap",
        tag: "Teknik",
      },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

/** Fallback used when the parent reaches the hub without onboarding data. */
const FALLBACK_PROFILE: Profile = {
  childName: "",
  childAge: "",
  guardianName: "",
  relationship: "",
  guardianAge: "",
  stage: 1,
  email: "",
  profiledAt: "",
}

export default function DashboardHub({
  profile,
  goal,
  routines = [],
  activities = [],
  onUpdateProfile,
  onUpdateGoal,
  onUpdateRoutines,
  onSignOut,
}: {
  profile?: Profile
  /** Primary goal code (G1–G10) the parent picked after profiling. */
  goal?: string
  /** Routine codes (R1–R10) the parent selected during onboarding. */
  routines?: string[]
  /** Activity codes (A1…) the parent curated during onboarding. */
  activities?: string[]
  /** Persists profile edits (from the profile page) and stage overrides. */
  onUpdateProfile?: (profile: Profile) => void
  /** Persists a primary-goal change made from Tetapan. */
  onUpdateGoal?: (goal: string) => void
  /** Persists daily-routine changes made from Tetapan. */
  onUpdateRoutines?: (routines: string[]) => void
  /** Clears the session and returns to the start of the flow. */
  onSignOut?: () => void
}) {
  const [activeNav, setActiveNav] = useState<NavId>("aktiviti")
  const [menuOpen, setMenuOpen] = useState(false) // mobile drawer

  // Completed activities → reflection + time, the single source of truth shared
  // by the Panduan AI chat, Aktiviti Harian, and Analisis. Completing from any
  // surface updates them all. Key = activity code.
  const [records, setRecords] = useState<Record<string, ActivityRecord>>({})

  // Pull today's saved completions on mount so the calendar + summary reflect
  // what was already done today (e.g. after a refresh). No-op in the demo (no
  // signed-in user).
  useEffect(() => {
    loadTodayCompletions().then((map) => {
      if (Object.keys(map).length) setRecords(map)
    })
  }, [])

  function saveRecord(code: string, note: string, seconds?: number) {
    const existing = records[code]
    const secs = seconds ?? existing?.seconds ?? 0
    // Optimistic local update first…
    setRecords((prev) => ({
      ...prev,
      [code]: { note, seconds: secs, id: existing?.id },
    }))
    // …then persist: insert on first completion, update on an edit/redo.
    void (async () => {
      if (existing?.id) {
        await updateCompletion(existing.id, note, secs)
      } else {
        const newId = await insertCompletion(code, note, secs, profile?.stage)
        if (newId) {
          setRecords((prev) =>
            prev[code] ? { ...prev, [code]: { ...prev[code], id: newId } } : prev
          )
        }
      }
    })()
  }
  const todayCompleted = Object.keys(records).length
  const todaySeconds = Object.values(records).reduce((s, r) => s + r.seconds, 0)

  const guardianName = profile?.guardianName ?? "[Nama Penjaga]"
  const relationship = profile?.relationship ?? "Penjaga"

  function select(id: NavId) {
    setActiveNav(id)
    setMenuOpen(false)
  }

  // Merge a partial change into the profile, seeding from a blank one if the
  // parent arrived without onboarding data.
  function updateProfile(next: Profile) {
    onUpdateProfile?.(next)
  }

  function updateStage(stage: number) {
    onUpdateProfile?.({ ...(profile ?? FALLBACK_PROFILE), stage })
  }

  const nav = (
    <NavRail
      activeNav={activeNav}
      onSelect={select}
      guardianName={guardianName}
      relationship={relationship}
    />
  )

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ===================== Desktop / tablet nav rail =================== */}
      <aside className="hidden w-[260px] shrink-0 border-r border-border/60 bg-background/60 backdrop-blur-xl md:block">
        {nav}
      </aside>

      {/* ========================= Mobile drawer ========================== */}
      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden
      />
      {/* Sliding panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[82%] border-r border-border/60 bg-background/95 backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
      >
        {nav}
      </div>

      {/* ============================ Main canvas ========================= */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Persistent top navigation bar — fixed across every view */}
        <TopBar
          title={VIEW_TITLES[activeNav]}
          showStatus={activeNav === "ai"}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenAi={() => setActiveNav("ai")}
        />

        <div className="relative min-h-0 flex-1">
          <ViewLayer visible={activeNav === "ai"}>
            <ChatInterface
              guardianName={guardianName}
              childName={profile?.childName?.trim() || "anak anda"}
              childStage={profile?.stage}
              activityCodes={activities}
              records={records}
              onSaveRecord={saveRecord}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aktiviti"}>
            <ActivityLibrary
              childStage={profile?.stage}
              relationship={profile?.relationship}
              routines={routines}
              activityCodes={activities}
              records={records}
              onSaveRecord={saveRecord}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aac"}>
            {/* Desktop: board sits inline in the canvas */}
            <div className="aac-inline h-full">
              <AacBoard />
            </div>
          </ViewLayer>

          <ViewLayer visible={activeNav === "classic"}>
            <ClassicDashboard />
          </ViewLayer>

          <ViewLayer visible={activeNav === "analysis"}>
            {/* Coming soon — a blurred teaser of the analytics behind an overlay */}
            <div className="relative h-full overflow-hidden">
              <div
                className="pointer-events-none h-full select-none blur-md"
                aria-hidden
              >
                <AnalysisView
                  profile={profile}
                  goal={goal}
                  todayCompleted={todayCompleted}
                  todaySeconds={todaySeconds}
                />
              </div>
              <ComingSoonOverlay />
            </div>
          </ViewLayer>

          <ViewLayer visible={activeNav === "notification"}>
            <PlaceholderView
              icon={Bell}
              message="Tiada notifikasi baharu buat masa ini. Tip harian dan peringatan aktiviti anda akan muncul di sini."
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "setting"}>
            <SettingsView
              stage={profile?.stage}
              profiledAt={profile?.profiledAt}
              onStageChange={updateStage}
              goal={goal}
              onGoalChange={(g) => onUpdateGoal?.(g)}
              routines={routines}
              onRoutinesChange={(r) => onUpdateRoutines?.(r)}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "profile"}>
            <ProfileView
              profile={profile}
              onSave={updateProfile}
              onSignOut={() => onSignOut?.()}
            />
          </ViewLayer>
        </div>
      </main>

      {/* Papan AAC — fullscreen landscape overlay on mobile/tablet (touch).
          Hidden on desktop (CSS), where the inline board is used instead. */}
      {activeNav === "aac" && (
        <div className="aac-fullscreen fixed inset-0 z-[70] overflow-hidden bg-background">
          <div className="force-landscape">
            <AacBoard onExit={() => select("ai")} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Absolute, cross-fading layer for one of the main views. */
function ViewLayer({
  visible,
  children,
}: {
  visible: boolean
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-1 opacity-0"
      )}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Navigation rail — shared by the desktop sidebar and the mobile drawer     */
/* -------------------------------------------------------------------------- */

function NavRail({
  activeNav,
  onSelect,
  guardianName,
  relationship,
}: {
  activeNav: NavId
  onSelect: (id: NavId) => void
  guardianName: string
  relationship: string
}) {
  const activitiesActive = activeNav === "classic"
  const profileActive = activeNav === "profile"
  const notificationActive = activeNav === "notification"
  return (
    <div className="flex h-full flex-col px-4 py-5">
      {/* Logo */}
      <div className="px-2">
        <span className="text-xl font-extrabold tracking-tight text-gradient">
          Tutur
        </span>
      </div>

      {/* Primary navigation */}
      <nav className="mt-8 flex-1 space-y-1.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon, comingSoon }) => {
          const active = activeNav === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all",
                active
                  ? "text-foreground"
                  : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
              )}
              style={
                active
                  ? {
                      background: `hsl(${CORAL} / 0.14)`,
                      boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
                    }
                  : undefined
              }
            >
              <Icon
                className="h-5 w-5 shrink-0"
                style={active ? { color: `hsl(${CORAL})` } : undefined}
              />
              <span className="flex-1 text-left">{label}</span>
              {comingSoon && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    background: `hsl(${PURPLE} / 0.18)`,
                    color: `hsl(${PURPLE_TEXT})`,
                  }}
                >
                  Akan Datang
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Your Activities — opens the Papan Pemuka Klasik dashboard */}
      <button
        type="button"
        onClick={() => onSelect("classic")}
        aria-current={activitiesActive ? "page" : undefined}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all",
          activitiesActive
            ? "text-foreground"
            : "glass text-foreground/90 hover:bg-white/[0.08]"
        )}
        style={
          activitiesActive
            ? {
                background: `hsl(${CORAL} / 0.14)`,
                boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
              }
            : { boxShadow: `inset 0 0 24px -16px hsl(${CORAL} / 0.8)` }
        }
      >
        <Film
          className="h-5 w-5 shrink-0"
          style={activitiesActive ? { color: `hsl(${CORAL})` } : undefined}
        />
        Library
      </button>

      {/* User profile — opens the editable profile page, with a notification
          bell pinned to the right of the same row. */}
      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={() => onSelect("profile")}
          aria-current={profileActive ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 text-left transition-all",
            profileActive ? "bg-white/[0.06]" : "hover:bg-white/5"
          )}
          style={
            profileActive
              ? { boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)` }
              : undefined
          }
        >
          <div
            className="relative h-10 w-10 shrink-0 rounded-full p-[2px]"
            style={{
              background: `linear-gradient(135deg, hsl(${CORAL}), hsl(25 95% 58%))`,
              boxShadow: `0 0 16px -2px hsl(${CORAL} / 0.65)`,
            }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-bold text-foreground/90">
              <User className="h-4 w-4" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{guardianName}</p>
            <p className="truncate text-xs text-muted-foreground">{relationship}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("notification")}
          aria-current={notificationActive ? "page" : undefined}
          aria-label="Notifikasi"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all",
            notificationActive
              ? "text-foreground"
              : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
          )}
          style={
            notificationActive
              ? {
                  background: `hsl(${CORAL} / 0.14)`,
                  boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
                }
              : undefined
          }
        >
          <Bell
            className="h-5 w-5"
            style={notificationActive ? { color: `hsl(${CORAL})` } : undefined}
          />
        </button>
      </div>
    </div>
  )
}

/** The top-left 3-line trigger that opens the mobile navigation drawer. */
function MenuButton({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenMenu}
      aria-label="Buka menu navigasi"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground md:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  Persistent top navigation bar (shared by every view)                      */
/*                                                                            */
/*  Mobile : [3-line menu] · page title · [Maya AI logo, far right]           */
/*  Desktop: [Maya AI logo] · page title  (the nav rail handles navigation)   */
/* -------------------------------------------------------------------------- */

function TopBar({
  title,
  showStatus,
  onOpenMenu,
  onOpenAi,
}: {
  title: string
  showStatus: boolean
  onOpenMenu: () => void
  /** Tapping the Maya logo opens the Panduan AI chat. */
  onOpenAi: () => void
}) {
  return (
    <header className="z-20 flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3.5 backdrop-blur-xl md:px-5">
      <MenuButton onOpenMenu={onOpenMenu} />

      {/* Desktop-only logo on the left → opens Panduan AI */}
      <button
        type="button"
        onClick={onOpenAi}
        aria-label="Buka Panduan AI"
        className="hidden shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95 md:block"
      >
        <MayaAvatar className="h-10 w-10" />
      </button>

      <div className="min-w-0 flex-1 text-center md:text-left">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {title}
        </h1>
        {showStatus && (
          <div className="mt-0.5 flex items-center justify-center gap-1.5 md:justify-start">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            <span className="text-xs text-muted-foreground">Sedia membantu</span>
          </div>
        )}
      </div>

      {/* Mobile-only logo, far right → opens Panduan AI */}
      <button
        type="button"
        onClick={onOpenAi}
        aria-label="Buka Panduan AI"
        className="shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95 md:hidden"
      >
        <MayaAvatar className="h-9 w-9" />
      </button>
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/*  Maya avatar (AI identity, subtle cyan halo)                               */
/* -------------------------------------------------------------------------- */

function MayaAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass",
        className
      )}
      style={{ boxShadow: `0 0 18px -2px hsl(${CYAN} / 0.55)` }}
    >
      <Bot className="h-5 w-5" style={{ color: `hsl(${CYAN})` }} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  AI — Generative Chat Interface                                            */
/* -------------------------------------------------------------------------- */

/** Warm, understanding nudges shown when a parent quits an activity early.
 *  One is picked at random so it never feels like a canned repeat. */
const QUIT_NUDGES = [
  "Tak apa, ambil masa anda. 💛 Bila dah bersedia, tekan 'Mula aktiviti' untuk sambung semula.",
  "Kadang-kadang anak belum bersedia — itu sangat normal. Cuba lagi bila suasana lebih tenang, ya. 🌱",
  "Hari yang sibuk? Saya faham. Aktiviti ini akan tunggu anda di sini. ☕",
  "Tak perlu sempurna — yang penting anda cuba. Sambung bila-bila masa. 🌟",
  "Mungkin sekarang bukan masa terbaik, dan itu okay. Kita boleh cuba lagi nanti. 💛",
  "Berehat seketika tak salah. Anak anda bertuah ada anda yang ambil berat. 🤗",
  "Langkah demi langkah. Bila anda dah sedia, saya ada di sini untuk bantu. 👣",
  "Anak rewel atau penat? Kita boleh tangguh dulu — tiada paksaan. 🌸",
  "Anda dah ambil langkah pertama, dan itu pun dah bermakna. Jumpa lagi bila bersedia! ✨",
  "Setiap usaha kecil tetap dikira. Jom sambung bila anda dan anak dah bersedia. 💪",
]

/** Shown when a parent reopens an already-completed activity — praising their
 *  drive to practise more with their child. One picked at random. */
const REPRACTICE_INTROS = [
  "Hebat! Anda dah selesai aktiviti ini, dan nak berlatih lagi — itu semangat terbaik untuk anak! 🌟",
  "Bagus sungguh! Ulangan adalah kunci — setiap kali anda berlatih, anak semakin faham. Jom buat sekali lagi! 💪",
  "Saya suka semangat ini! Lebih banyak latihan bersama anak, lebih kukuh kemahiran mereka. 💛",
  "Anak belajar melalui pengulangan. Dengan kembali ke sini, anda beri mereka peluang terbaik. 🌱",
  "Wah, datang lagi! Konsistensi seperti inilah yang membantu anak berkembang. Teruskan usaha murni ini. ✨",
  "Setiap kali anda ulang, anak semakin yakin. Jom praktis sekali lagi bersama-sama! 🤗",
  "Latihan tambahan? Itu hadiah terbaik untuk anak anda. Saya bangga dengan komitmen anda. 🎯",
  "Tiada had untuk berlatih — lebih kerap, lebih baik. Jom ulang aktiviti ini bersama anak. 🔁",
  "Anda memang penjaga yang komited. Mari kukuhkan lagi kemahiran anak dengan ulangan ini. 💫",
  "Sekali lagi? Sempurna! Otak anak menyerap paling banyak melalui ulangan yang menyeronokkan. 🧠",
]

/** Time-of-day Malay greeting + a matching emoji. */
function timeGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: "Selamat pagi", emoji: "☀️" }
  if (h < 15) return { text: "Selamat tengah hari", emoji: "🌤️" }
  if (h < 19) return { text: "Selamat petang", emoji: "🌇" }
  return { text: "Selamat malam", emoji: "🌙" }
}

function ChatInterface({
  guardianName,
  childName,
  childStage,
  activityCodes = [],
  records,
  onSaveRecord,
}: {
  guardianName: string
  childName: string
  childStage?: number
  /** Activity codes the parent curated — scopes today's plan. */
  activityCodes?: string[]
  /** Shared completion records (so chat completions sync everywhere). */
  records: Record<string, ActivityRecord>
  /** Save/update a completion record (note + optional seconds). */
  onSaveRecord: (code: string, note: string, seconds?: number) => void
}) {
  const greeting = timeGreeting()

  // Today's plan — up to 3 from the parent's curated set (fallback: catalogue).
  const todays = useMemo(() => {
    const pool = activityCodes.length
      ? ACTIVITIES.filter((a) => activityCodes.includes(a.code))
      : ACTIVITIES
    return pool.slice(0, 3)
  }, [activityCodes])

  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const selected = todays.find((a) => a.code === selectedCode) ?? null

  // The activity whose Papan AAC board is open over the chat (null = none).
  const [boardCode, setBoardCode] = useState<string | null>(null)
  const boardActivity = todays.find((a) => a.code === boardCode) ?? null
  // After completing, the guide block animates away before it's unmounted.
  const [collapsing, setCollapsing] = useState(false)
  // Intro line for an already-completed activity (praises practising more).
  const [repracticeIntro, setRepracticeIntro] = useState<string | null>(null)
  // Tells a board close apart: completion (handled) vs quitting (needs a nudge).
  const completedRef = useRef(false)
  // Id of the latest "didn't finish" nudge, so it can be cleared once the parent
  // moves on (picks another activity / reopens the board).
  const quitNudgeRef = useRef<number | null>(null)

  // Maya's follow-up messages (completion praise, gentle quit nudges).
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const msgId = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Scroll-to-top button — appears once the parent has scrolled down a little.
  const [showScrollTop, setShowScrollTop] = useState(false)
  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Reveal the scripted intro one message at a time (~1s apart) so it lands like
  // a real conversation instead of all at once: greeting → plan → activities.
  const [revealStep, setRevealStep] = useState(0)
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setRevealStep(1), 500),
      window.setTimeout(() => setRevealStep(2), 1500),
      window.setTimeout(() => setRevealStep(3), 2500),
    ]
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  // After an activity is picked, reveal its reply → video → coaching → chips one
  // piece at a time (~0.8s apart), with a typing indicator between, so Maya
  // looks like she's composing the response.
  const [selStep, setSelStep] = useState(0)
  useEffect(() => {
    setSelStep(0)
    if (!selectedCode) return
    const activity = todays.find((a) => a.code === selectedCode)
    const total = activity?.video ? 3 : 2
    const timers = Array.from({ length: total }, (_, i) =>
      window.setTimeout(() => setSelStep(i + 1), (i + 1) * 800)
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [selectedCode, todays])

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, selectedCode, revealStep, selStep])

  // Completing the activity from its in-chat board: record it (syncs to Aktiviti
  // Harian & Analisis), animate the guide away, then have Maya invite the next.
  function completeFromBoard(note: string, seconds: number) {
    if (!boardCode) return
    completedRef.current = true // mark this close as a completion, not a quit
    onSaveRecord(boardCode, note, seconds)
    setCollapsing(true) // play the tuck-away animation on the guide block
    window.setTimeout(() => {
      setSelectedCode(null) // unmount the guide → back to the activity list
      setCollapsing(false)
      setMessages((m) => [
        ...m,
        {
          id: ++msgId.current,
          role: "maya",
          text: "Bagus! Selepas ini pilih satu lagi aktiviti dari senarai hari ini di atas. 💛",
        },
      ])
    }, 360)
  }

  // Closing the board. If they completed, completeFromBoard already handled it;
  // otherwise they quit early — leave the guide up and add a warm nudge to
  // continue when ready.
  function closeBoard() {
    setBoardCode(null)
    if (completedRef.current) {
      completedRef.current = false
      return
    }
    const id = ++msgId.current
    quitNudgeRef.current = id
    const text = QUIT_NUDGES[Math.floor(Math.random() * QUIT_NUDGES.length)]
    setMessages((m) => [...m, { id, role: "maya", text }])
  }

  // Drop a stale "didn't finish" nudge once the parent moves on.
  function clearQuitNudge() {
    const id = quitNudgeRef.current
    if (id == null) return
    quitNudgeRef.current = null
    setMessages((m) => m.filter((msg) => msg.id !== id))
  }

  // Pick an activity. Tapping the one already open is a no-op — nothing
  // re-reveals and no message disappears.
  function selectActivity(code: string) {
    if (selectedCode === code) return
    clearQuitNudge()
    setSelectedCode(code)
    // Reopening a completed one opens with a "practise more" encouragement.
    setRepracticeIntro(
      records[code]
        ? REPRACTICE_INTROS[Math.floor(Math.random() * REPRACTICE_INTROS.length)]
        : null
    )
  }


  return (
    <div className="flex h-full flex-col">
      {/* Conversational stream */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 240)}
          className="mx-auto h-full max-w-2xl space-y-5 overflow-y-auto px-4 pb-24 pt-6 md:px-6"
        >
          {/* Message 1 — time-based greeting addressing the parent */}
          {revealStep >= 1 && (
            <Bubble delay={0}>
              {greeting.text},{" "}
              <span className="font-semibold text-foreground">{guardianName}</span>
              ! {greeting.emoji}
            </Bubble>
          )}

          {/* Message 2 — today's plan + prompt to choose */}
          {revealStep >= 2 && (
            <Bubble delay={0}>
              Hari ini saya dah sediakan{" "}
              <span className="font-semibold text-foreground">
                {todays.length} aktiviti
              </span>{" "}
              untuk {childName}. Yang mana satu anda ingin mulakan dahulu?
            </Bubble>
          )}

          {/* Message 3 — the 3 clickable activities */}
          {revealStep >= 3 && (
            <div className="space-y-2.5 pl-12">
              {todays.map((a, i) => (
                <ActivityChoiceCard
                  key={a.code}
                  activity={a}
                  index={i}
                  selected={a.code === selectedCode}
                  completed={!!records[a.code]}
                  onSelect={() => selectActivity(a.code)}
                />
              ))}
            </div>
          )}

          {/* While the intro is still composing, show Maya "typing" */}
          {revealStep < 3 && <TypingBubble />}

          {/* Message 4 — the chosen activity's guide, revealed piece by piece
              (reply → video → coaching). Tucks away once the activity is done. */}
          {selected &&
            (() => {
              const hasVideo = !!selected.video
              const coachStep = hasVideo ? 3 : 2
              return (
                <div
                  className={cn(
                    "space-y-5 transition-all duration-300 ease-out",
                    collapsing &&
                      "pointer-events-none -translate-y-3 scale-[0.97] opacity-0 blur-[2px]"
                  )}
                >
                  {selStep >= 1 && (
                    <Bubble delay={0}>
                      {repracticeIntro ? (
                        repracticeIntro
                      ) : (
                        <>
                          Pilihan yang bagus! Jom mulakan{" "}
                          <span className="font-semibold text-foreground">
                            '{selected.title}'
                          </span>
                          .{" "}
                          {hasVideo
                            ? "Tonton video panduan ringkas, kemudian ikut panduan di bawah:"
                            : "Berikut panduan penuh untuk anda:"}
                        </>
                      )}
                    </Bubble>
                  )}

                  {hasVideo && selStep >= 2 && (
                    <ActivityVideoCard activity={selected} />
                  )}

                  {selStep >= coachStep && (
                    <ActivityCoachingCard
                      activity={selected}
                      childStage={childStage}
                      completed={!!records[selected.code]}
                      onStart={() => {
                        clearQuitNudge() // reopening clears the stale nudge
                        setBoardCode(selected.code)
                      }}
                    />
                  )}

                  {/* Still composing the guide */}
                  {selStep < coachStep && <TypingBubble />}
                </div>
              )
            })()}

          {/* Maya's follow-up messages (completion praise, gentle nudges) */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <UserBubble key={msg.id}>{msg.text}</UserBubble>
            ) : (
              <Bubble key={msg.id}>{msg.text}</Bubble>
            )
          )}
        </div>

        {/* Scroll-to-top — chat only, hidden while the board modal is open so it
            never sits over a popup. Fades in once scrolled down. */}
        <button
          type="button"
          aria-label="Skrol ke atas"
          onClick={scrollToTop}
          className={cn(
            "absolute bottom-5 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full glass-strong text-foreground/80 shadow-lg transition-all hover:text-foreground active:scale-95 md:right-6",
            showScrollTop && !boardCode
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          )}
          style={{ boxShadow: `0 8px 24px -8px hsl(${CORAL} / 0.5)` }}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Papan AAC board — opened from a guide's "Mula aktiviti" button so the
          parent can complete the activity without leaving the conversation. */}
      {boardActivity && boardCode && (
        <ActivityBoardModal
          activity={boardActivity}
          completed={!!records[boardCode]}
          initialNote={records[boardCode]?.note ?? ""}
          onSaveRecord={completeFromBoard}
          onClose={closeBoard}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chat message model                                                        */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: number
  role: "user" | "maya"
  text: string
}

/** A left-aligned Maya message bubble with avatar. */
function Bubble({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <div
      className="flex animate-fade-up items-start gap-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <MayaAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm glass-strong px-4 py-3 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </div>
  )
}

/** A right-aligned parent message bubble. */
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-fade-up justify-end">
      <div
        className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-background"
        style={{ background: `hsl(${CORAL})` }}
      >
        {children}
      </div>
    </div>
  )
}

/** Maya "typing…" indicator with three animated dots. */
function TypingBubble() {
  return (
    <div className="flex animate-fade-up items-start gap-3">
      <MayaAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm glass-strong px-4 py-4">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

/** Map a numeric stage (1–5) to a StageCode, clamped & safe. */
function toStageCode(stage?: number): StageCode {
  const n = Math.min(5, Math.max(1, stage ?? 1))
  return `T${n}` as StageCode
}

/** One clickable activity in the chat's "today's plan" list. */
function ActivityChoiceCard({
  activity,
  index,
  selected,
  completed,
  onSelect,
}: {
  activity: Activity
  index: number
  selected: boolean
  /** Already completed today — shows a teal done state. */
  completed: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full animate-fade-up items-center gap-3 rounded-2xl glass-strong p-3.5 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99]",
        selected && "bg-white/[0.06]"
      )}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
        ...(selected
          ? {
              boxShadow: `0 0 0 1px hsl(${CORAL} / 0.6), 0 0 28px -8px hsl(${CORAL} / 0.5)`,
            }
          : {}),
      }}
    >
      {/* Step number — turns into a teal check once completed */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={
          completed
            ? { background: `hsl(${TEAL} / 0.18)`, color: `hsl(${TEAL})` }
            : { background: `hsl(${CORAL} / 0.16)`, color: `hsl(${CORAL})` }
        }
      >
        {completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
      </span>

      {/* Title + meta */}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {activity.title}
          </span>
          {completed ? (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
            >
              Selesai
            </span>
          ) : (
            activity.video && (
              <span
                className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
              >
                <Play className="h-2.5 w-2.5" fill="currentColor" />
                Video
              </span>
            )
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {ROUTINE_LABELS[activity.routine] ?? activity.routine} ·{" "}
          {activity.strategyName}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

/** Premium dark-glass video card for a selected activity's demo video. */
function ActivityVideoCard({ activity }: { activity: Activity }) {
  const video = activity.video
  if (!video) return null
  return (
    <div
      className="ml-12 max-w-md animate-fade-up overflow-hidden rounded-3xl glass-strong"
      style={{ animationDelay: "60ms", animationFillMode: "both" }}
    >
      {/* Media area */}
      <div className="relative">
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
          <button
            type="button"
            aria-label={`Main video: ${video.title}`}
            className="group flex h-16 w-16 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              background: `hsl(${CORAL})`,
              boxShadow: `0 0 32px -4px hsl(${CORAL} / 0.8)`,
            }}
          >
            <Play
              className="ml-0.5 h-7 w-7 text-background transition-transform group-hover:scale-110"
              fill="currentColor"
            />
          </button>
        </div>

        {/* Duration badge */}
        <span
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md"
          style={{
            background: `hsl(${TEAL} / 0.18)`,
            color: `hsl(${TEAL})`,
            boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.35)`,
          }}
        >
          {video.duration}
        </span>
      </div>

      {/* Meta */}
      <div className="p-4">
        <h3 className="text-sm font-bold tracking-tight">{video.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {video.duration} • Fokus: {video.focus}
        </p>
      </div>
    </div>
  )
}

/** Compact coaching card — materials + the script for the child's stage. */
function ActivityCoachingCard({
  activity,
  childStage,
  completed,
  onStart,
}: {
  activity: Activity
  childStage?: number
  /** Already completed today — relabels the start button. */
  completed: boolean
  /** Open the Papan AAC board to do the activity. */
  onStart: () => void
}) {
  const stageCode = toStageCode(childStage)
  const content =
    activity.stages.find((s) => s.stage === stageCode) ?? activity.stages[0]
  // AAC is modeled (Aided Language Input) at the earlier stages.
  const isAac = AAC_STAGES.includes(stageCode)

  return (
    <div
      className="ml-12 max-w-md animate-fade-up space-y-3.5 rounded-3xl glass-strong p-4"
      style={{ animationDelay: "120ms", animationFillMode: "both" }}
    >
      {/* Situasi (set-up) */}
      {activity.setup && (
        <GuideField label="Situasi">
          <p className="text-sm leading-relaxed text-foreground/90">
            {activity.setup}
          </p>
        </GuideField>
      )}

      {/* Materials */}
      <GuideField label="Bahan diperlukan">
        <div className="flex flex-wrap gap-1.5">
          {activity.materials.map((m) => (
            <span
              key={m}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: `hsl(${TEAL} / 0.14)`, color: `hsl(${TEAL})` }}
            >
              {m}
            </span>
          ))}
        </div>
      </GuideField>

      {/* Model AAC — Aided Language Input (the words the parent demonstrates) */}
      {isAac && activity.aacWords.length > 0 && (
        <GuideField label="Model AAC (Aided Language Input)">
          <div className="flex flex-wrap gap-1.5">
            {activity.aacWords.map((w) => (
              <span
                key={w.label}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: `hsl(${PURPLE} / 0.16)`,
                  color: `hsl(${PURPLE_TEXT})`,
                }}
              >
                <span aria-hidden>{w.emoji}</span>
                {w.label}
              </span>
            ))}
          </div>
        </GuideField>
      )}

      {content && (
        <>
          {/* Arahan (instructions) */}
          <GuideField label="Arahan">
            <p className="text-sm leading-relaxed text-foreground/90">
              {content.instructions}
            </p>
          </GuideField>

          {/* Skrip dialog — all lines */}
          {content.dialogue.length > 0 && (
            <GuideField label="Skrip dialog">
              <div className="space-y-1.5">
                {content.dialogue.map((line, i) => (
                  <p
                    key={i}
                    className="rounded-xl px-3 py-2 text-xs italic"
                    style={{
                      background: `hsl(${CORAL} / 0.08)`,
                      color: "hsl(var(--foreground) / 0.85)",
                    }}
                  >
                    💬 “{line}”
                  </p>
                ))}
              </div>
            </GuideField>
          )}

          {/* Isyarat anak yang dicari (target signal) */}
          {content.targetSignal && (
            <GuideField label="Isyarat anak yang dicari">
              <p className="text-sm leading-relaxed text-foreground/90">
                🎯 {content.targetSignal}
              </p>
            </GuideField>
          )}
        </>
      )}

      {/* Do it now — opens the Papan AAC board without leaving the chat */}
      <button
        type="button"
        onClick={onStart}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-background transition-transform active:scale-[0.99]"
        style={{
          background: `hsl(${PURPLE})`,
          boxShadow: `0 0 24px -6px hsl(${PURPLE} / 0.7)`,
        }}
      >
        <LayoutGrid className="h-4 w-4" />
        {completed ? "Buka semula Papan AAC" : "Mula aktiviti"}
      </button>
    </div>
  )
}

/** A labelled field block in the chat coaching guide. */
function GuideField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Library — categorized parent-coaching video library                       */
/* -------------------------------------------------------------------------- */

function ClassicDashboard() {
  return (
    <div className="h-full overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-muted-foreground">
          Pustaka video panduan untuk membantu anak anda berkomunikasi.
        </p>

        {VIDEO_CATEGORIES.map((cat) => (
          <section key={cat.id}>
            <h2 className="px-1 text-sm font-semibold tracking-tight">
              {cat.label}
            </h2>
            <p className="mb-3 mt-0.5 px-1 text-xs text-muted-foreground">
              {cat.description}
            </p>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              {cat.videos.map((video) => (
                <VideoCard
                  key={`${cat.id}-${video.tag}-${video.title}`}
                  video={video}
                  hue={cat.hue}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** A single video card in the library deck, accented by its category hue. */
function VideoCard({ video, hue }: { video: VideoItem; hue: number }) {
  return (
    <article className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl glass-strong">
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: `hsl(${CORAL})`,
            boxShadow: `0 0 20px -4px hsl(${CORAL} / 0.8)`,
          }}
        >
          <Play className="ml-0.5 h-4 w-4 text-background" fill="currentColor" />
        </span>
        <span
          className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md"
          style={{
            background: `hsl(${hue} 90% 60% / 0.18)`,
            color: `hsl(${hue} 90% 78%)`,
          }}
        >
          {video.tag}
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate text-xs font-bold tracking-tight">
          {video.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
          {video.meta}
        </p>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*  Papan — AAC communication board                                           */
/*                                                                            */
/*  Augmentative & Alternative Communication: a grid of symbol tiles the      */
/*  child taps to build a phrase in the sentence strip. Distinct from the     */
/*  Papan Pemuka Klasik dashboard (which lives behind the classic toggle).    */
/* -------------------------------------------------------------------------- */

// Core communication board — 48 words laid out as 4 rows × 12 columns.
const AAC_WORDS: AacWord[] = [
  // Row 1
  { label: "Saya", emoji: "🙋" },
  { label: "Awak", emoji: "🫵" },
  { label: "Nak", emoji: "✋" },
  { label: "Bagi", emoji: "🤲" },
  { label: "Buka", emoji: "📂" },
  { label: "Tutup", emoji: "📕" },
  { label: "Gembira", emoji: "😄" },
  { label: "Suka", emoji: "❤️" },
  { label: "Nasi", emoji: "🍚" },
  { label: "Susu", emoji: "🍼" },
  { label: "Ya", emoji: "✅" },
  { label: "Tidak", emoji: "❌" },
  // Row 2
  { label: "Ibu", emoji: "👩" },
  { label: "Ayah", emoji: "👨" },
  { label: "Makan", emoji: "🍽️" },
  { label: "Minum", emoji: "🥤" },
  { label: "Cukup", emoji: "👌" },
  { label: "Habis", emoji: "🏁" },
  { label: "Sedih", emoji: "😢" },
  { label: "Seronok", emoji: "🤩" },
  { label: "Air", emoji: "💧" },
  { label: "Roti", emoji: "🍞" },
  { label: "Jom", emoji: "🙌" },
  { label: "Bye", emoji: "👋" },
  // Row 3
  { label: "Abang", emoji: "👦" },
  { label: "Adik", emoji: "🧒" },
  { label: "Main", emoji: "🧸" },
  { label: "Mandi", emoji: "🛁" },
  { label: "Tandas", emoji: "🚽" },
  { label: "Tidur", emoji: "😴" },
  { label: "Sakit", emoji: "🤕" },
  { label: "Penat", emoji: "🥱" },
  { label: "Biskut", emoji: "🍪" },
  { label: "Pisang", emoji: "🍌" },
  { label: "Apa", emoji: "❓" },
  { label: "Jangan", emoji: "🚫" },
  // Row 4
  { label: "Punya", emoji: "🫳" },
  { label: "Cikgu", emoji: "👩‍🏫" },
  { label: "Tengok", emoji: "👀" },
  { label: "Pergi", emoji: "🚶" },
  { label: "Boleh", emoji: "👍" },
  { label: "Berhenti", emoji: "🛑" },
  { label: "Marah", emoji: "😠" },
  { label: "Takut", emoji: "😨" },
  { label: "Epal", emoji: "🍎" },
  { label: "Sayur", emoji: "🥦" },
  { label: "Ini", emoji: "👇" },
  { label: "Itu", emoji: "👉" },
]

const AAC_VIOLET = "265 90% 62%"
const AAC_VIOLET_TEXT = "265 90% 84%"

/* -------------------------------------------------------------------------- */
/*  AAC audio — one clip per word in public/audio/aac/<file>.mp4              */
/* -------------------------------------------------------------------------- */

const AAC_AUDIO_BASE = "/audio/aac/"
// Skip the silent lead-in at the start of each clip (seconds).
const AAC_AUDIO_OFFSET = 0.8
// Per-word overrides where the lead-in differs from the default.
const AAC_AUDIO_OFFSETS: Record<string, number> = {
  Saya: 1.5,
  Nak: 0.5,
  Bye: 1.0,
  Makan: 1.5,
  Ibu: 0.5,
  Abang: 0.5,
  Main: 1.0,
  Penat: 1.3,
  Biskut: 1.3,
  Takut: 1.0,
  Pergi: 1.2,
  Cikgu: 0.2,
  Punya: 0.2,
  Buka: 1.5,
  Tutup: 1.2,
}
// Words whose audio filename differs from the lowercased label.
const AAC_AUDIO_OVERRIDES: Record<string, string> = {
  Seronok: "senorok", // file is named senorok.mp4
}

function aacAudioSrc(label: string): string {
  const name = AAC_AUDIO_OVERRIDES[label] ?? label.toLowerCase()
  return `${AAC_AUDIO_BASE}${name}.mp4`
}

/** Speak a word via the browser's Malay TTS — used when a clip is missing. */
function speakFallback(label: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(label)
  utter.lang = "ms-MY"
  window.speechSynthesis.speak(utter)
}

/** Play a word's audio clip; resolves when it finishes (or falls back to TTS). */
function playWord(label: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    const fail = () => {
      if (!settled) {
        speakFallback(label)
        finish()
      }
    }
    const offset = AAC_AUDIO_OFFSETS[label] ?? AAC_AUDIO_OFFSET
    const audio = new Audio(aacAudioSrc(label))
    audio.preload = "auto"
    const seek = () => {
      if (audio.currentTime < offset && audio.duration > offset) {
        try {
          audio.currentTime = offset
        } catch {
          /* not seekable yet — ignore */
        }
      }
    }
    audio.addEventListener("loadedmetadata", seek, { once: true })
    audio.onended = finish
    audio.onerror = fail
    audio.play().then(seek).catch(fail)
  })
}

function AacBoard({ onExit }: { onExit?: () => void }) {
  const [strip, setStrip] = useState<AacWord[]>([])
  const playing = useRef(false)

  // Add a word to the strip and play its clip immediately.
  function addWord(tile: AacWord) {
    setStrip((s) => [...s, tile])
    playWord(tile.label)
  }

  // Play the whole sentence, one clip after another.
  async function speak() {
    if (playing.current || strip.length === 0) return
    playing.current = true
    for (const tile of strip) {
      await playWord(tile.label)
    }
    playing.current = false
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      {/* Top bar: exit (fullscreen only) · sentence strip · speak · clear */}
      <div className="flex shrink-0 items-center gap-2">
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Keluar papan AAC"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div className="flex min-h-[2.5rem] flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap rounded-2xl glass-strong px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {strip.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Ketik simbol untuk membina ayat…
            </span>
          ) : (
            strip.map((tile, i) => (
              <span
                key={`${tile.label}-${i}`}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 text-sm font-medium"
              >
                <span aria-hidden>{tile.emoji}</span>
                {tile.label}
              </span>
            ))
          )}
        </div>
        <button
          type="button"
          aria-label="Sebut ayat"
          onClick={speak}
          disabled={strip.length === 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-background transition-transform active:scale-95 disabled:opacity-40"
          style={{
            background: `hsl(${CORAL})`,
            boxShadow: `0 0 18px -4px hsl(${CORAL} / 0.7)`,
          }}
        >
          <Volume2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Padam ayat"
          onClick={() => setStrip([])}
          disabled={strip.length === 0}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-40"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* 4 × 12 core-word grid */}
      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-4 gap-1.5">
        {AAC_WORDS.map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => addWord(tile)}
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl glass-strong p-1 transition-all hover:bg-white/[0.09] active:scale-95"
            style={{ boxShadow: `inset 0 0 0 1px hsl(${AAC_VIOLET} / 0.22)` }}
          >
            <span className="text-xl leading-none sm:text-2xl" aria-hidden>
              {tile.emoji}
            </span>
            <span
              className="max-w-full truncate text-[9px] font-semibold leading-tight sm:text-[11px]"
              style={{ color: `hsl(${AAC_VIOLET_TEXT})` }}
            >
              {tile.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Notifikasi / Tetapan — lightweight placeholder views                      */
/* -------------------------------------------------------------------------- */

/** Centered "Akan Datang" card shown over a blurred teaser of a locked page. */
function ComingSoonOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div
        className="max-w-xs rounded-3xl glass-strong p-7 text-center"
        style={{ boxShadow: `0 24px 60px -20px hsl(240 60% 2% / 0.9)` }}
      >
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: `hsl(${PURPLE} / 0.18)`,
            boxShadow: `0 0 32px -6px hsl(${PURPLE} / 0.6)`,
          }}
        >
          <Lock className="h-6 w-6" style={{ color: `hsl(${PURPLE_TEXT})` }} />
        </span>
        <span
          className="mt-4 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: `hsl(${PURPLE} / 0.18)`,
            color: `hsl(${PURPLE_TEXT})`,
          }}
        >
          Akan Datang
        </span>
        <h2 className="mt-3 text-lg font-bold tracking-tight">
          Analisis Perkembangan
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Laporan kemajuan terperinci sedang dalam pembangunan. Buat masa ini,
          teruskan aktiviti harian bersama anak anda. 💛
        </p>
      </div>
    </div>
  )
}

function PlaceholderView({
  icon: Icon,
  message,
}: {
  icon: typeof Bell
  message: string
}) {
  return (
    <div className="flex h-full flex-col px-4 py-5 md:px-8 md:py-6">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl glass"
          style={{ boxShadow: `0 0 28px -8px hsl(${CORAL} / 0.5)` }}
        >
          <Icon className="h-7 w-7" style={{ color: `hsl(${CORAL})` }} />
        </div>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}
