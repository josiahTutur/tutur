import { useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  Bell,
  User,
  Settings,
  ArrowUp,
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import {
  ACTIVITIES,
  ROUTINE_LABELS,
  STAGE_INFO,
  STAGE_ORDER,
  type Activity,
  type StageCode,
} from "@/lib/activities"
import ActivityLibrary from "@/components/ActivityLibrary"
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
const NAV_ITEMS = [
  { id: "ai", label: "Panduan AI", icon: BrainCircuit },
  { id: "aktiviti", label: "Aktiviti Harian", icon: Library },
  { id: "aac", label: "Papan", icon: LayoutGrid },
  { id: "analysis", label: "Analisis", icon: BarChart3 },
  { id: "setting", label: "Tetapan", icon: Settings },
] as const satisfies ReadonlyArray<{
  id: NavId
  label: string
  icon: typeof Bot
}>

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
  const [activeNav, setActiveNav] = useState<NavId>("ai")
  const [menuOpen, setMenuOpen] = useState(false) // mobile drawer
  // Activities completed today — shared so Aktiviti Harian & Analisis calendars
  // show the same "today" state.
  const [todayCompleted, setTodayCompleted] = useState(0)

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
        />

        <div className="relative min-h-0 flex-1">
          <ViewLayer visible={activeNav === "ai"}>
            <ChatInterface
              guardianName={guardianName}
              childName={profile?.childName?.trim() || "anak anda"}
              childStage={profile?.stage}
              activityCodes={activities}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aktiviti"}>
            <ActivityLibrary
              childStage={profile?.stage}
              relationship={profile?.relationship}
              routines={routines}
              activityCodes={activities}
              onTodayCompletedChange={setTodayCompleted}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aac"}>
            <AacBoard />
          </ViewLayer>

          <ViewLayer visible={activeNav === "classic"}>
            <ClassicDashboard />
          </ViewLayer>

          <ViewLayer visible={activeNav === "analysis"}>
            <AnalysisView
              profile={profile}
              goal={goal}
              todayCompleted={todayCompleted}
            />
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
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
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
              {label}
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
}: {
  title: string
  showStatus: boolean
  onOpenMenu: () => void
}) {
  return (
    <header className="z-20 flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3.5 backdrop-blur-xl md:px-5">
      <MenuButton onOpenMenu={onOpenMenu} />

      {/* Desktop-only logo on the left */}
      <MayaAvatar className="hidden h-10 w-10 md:flex" />

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

      {/* Mobile-only logo, moved to the far right */}
      <MayaAvatar className="h-9 w-9 md:hidden" />
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
}: {
  guardianName: string
  childName: string
  childStage?: number
  /** Activity codes the parent curated — scopes today's plan. */
  activityCodes?: string[]
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

  // Local (no-backend) conversation state.
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const msgId = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    const total = activity?.video ? 4 : 3
    const timers = Array.from({ length: total }, (_, i) =>
      window.setTimeout(() => setSelStep(i + 1), (i + 1) * 800)
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [selectedCode, todays])

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, isTyping, selectedCode, revealStep, selStep])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    setMessages((m) => [
      ...m,
      { id: ++msgId.current, role: "user", text: trimmed },
    ])
    setInput("")
    setIsTyping(true)

    // Simulate Maya "thinking", then answer with a context-aware canned reply.
    const reply = generateReply(trimmed, { childName, selected })
    window.setTimeout(
      () => {
        setMessages((m) => [
          ...m,
          { id: ++msgId.current, role: "maya", text: reply },
        ])
        setIsTyping(false)
      },
      700 + Math.random() * 700
    )
  }

  const chips = [
    "💡 Berikan tips untuk aktiviti ini",
    "🗣️ Bagaimana saya tahu jika anak faham?",
    "⏭️ Tunjuk aktiviti seterusnya",
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Conversational stream */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="mx-auto h-full max-w-2xl space-y-5 overflow-y-auto px-4 pb-36 pt-6 md:px-6"
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
                  onSelect={() =>
                    setSelectedCode(selectedCode === a.code ? null : a.code)
                  }
                />
              ))}
            </div>
          )}

          {/* While the intro is still composing, show Maya "typing" */}
          {revealStep < 3 && <TypingBubble />}

          {/* Message 4 — response to the chosen activity, revealed piece by
              piece (reply → video → coaching → chips) like Maya is composing */}
          {selected &&
            (() => {
              const hasVideo = !!selected.video
              const coachStep = hasVideo ? 3 : 2
              const chipsStep = hasVideo ? 4 : 3
              return (
                <>
                  {selStep >= 1 && (
                    <Bubble delay={0}>
                      Pilihan yang bagus! Jom mulakan{" "}
                      <span className="font-semibold text-foreground">
                        '{selected.title}'
                      </span>
                      .{" "}
                      {hasVideo
                        ? "Tonton video panduan ringkas di bawah:"
                        : "Berikut langkah ringkas untuk anda:"}
                    </Bubble>
                  )}

                  {hasVideo && selStep >= 2 && (
                    <ActivityVideoCard activity={selected} />
                  )}

                  {selStep >= coachStep && (
                    <ActivityCoachingCard
                      activity={selected}
                      childStage={childStage}
                    />
                  )}

                  {selStep >= chipsStep && (
                    <div className="flex flex-wrap gap-2 pl-12">
                      {chips.map((chip, i) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => send(chip)}
                          className="animate-fade-up rounded-full glass px-3.5 py-2 text-left text-xs font-medium text-foreground/85 transition-all hover:bg-white/[0.09] hover:text-foreground active:scale-[0.98]"
                          style={{
                            animationDelay: `${120 + i * 70}ms`,
                            animationFillMode: "both",
                            boxShadow: `inset 0 0 22px -16px hsl(${CORAL} / 0.9)`,
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Still composing the rest of the response */}
                  {selStep < chipsStep && <TypingBubble />}
                </>
              )
            })()}

          {/* Free-form conversation */}
          {messages.map((msg) =>
            msg.role === "user" ? (
              <UserBubble key={msg.id}>{msg.text}</UserBubble>
            ) : (
              <Bubble key={msg.id}>{msg.text}</Bubble>
            )
          )}
          {isTyping && <TypingBubble />}
        </div>

        {/* Floating chat input tray — typing only */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 md:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-2 pl-5 pr-2 shadow-[0_12px_40px_-12px_hsl(240_60%_2%/0.9)] backdrop-blur-2xl"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label={`Tanya Maya, ${guardianName}`}
              placeholder="Tanya Maya tentang aktiviti hari ini…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            />

            <button
              type="submit"
              aria-label="Hantar"
              disabled={!input.trim() || isTyping}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-background transition-transform active:scale-95 disabled:opacity-40"
              style={{
                background: `hsl(${CORAL})`,
                boxShadow: `0 0 18px -2px hsl(${CORAL} / 0.7)`,
              }}
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chat message model + canned "AI" responder (no backend)                   */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  id: number
  role: "user" | "maya"
  text: string
}

/** Pick a reply at random for variety, so repeats feel less scripted. */
function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Heuristic, keyword-driven responder that mimics an AI coach. Purely local —
 * swap this for a real model call when a backend exists.
 */
function generateReply(
  text: string,
  ctx: { childName: string; selected: Activity | null }
): string {
  const t = text.toLowerCase()
  const name = ctx.childName
  const act = ctx.selected?.title

  if (/(hai|helo|hello|salam|selamat)/.test(t)) {
    return pick([
      `Hai! Saya Maya, pembantu AI anda. Apa yang boleh saya bantu untuk ${name} hari ini?`,
      `Helo! Gembira dapat membantu. Ada apa-apa tentang ${name} yang anda ingin bincangkan?`,
    ])
  }

  if (/(tips|tip|cara|macam mana|bagaimana|galak)/.test(t)) {
    return pick([
      `${act ? `Untuk '${act}', cuba` : "Cuba"} ikut rentak ${name} — modelkan perkataan mudah dan tunggu 5 saat untuk beri ruang dia mencuba. Pujian kecil setiap percubaan amat membantu!`,
      `Tip ringkas: kurangkan soalan, tambah komen. Contohnya sebut "Wah, kotak besar!" dan biarkan ${name} menyambung. Ulang perkataan yang dia sebut dan panjangkan sedikit.`,
    ])
  }

  if (/(faham|understand|tahu)/.test(t)) {
    return pick([
      `Anda boleh tahu ${name} faham apabila dia bertindak balas — pandang objek, tunjuk, ikut arahan ringkas, atau cuba sebut semula. Tak perlu sempurna; respons kecil pun kiraan.`,
      `Perhatikan isyarat: kontak mata, senyum, menunjuk, atau membuat bunyi. Itu tanda ${name} sedang memproses dan cuba berkomunikasi.`,
    ])
  }

  if (/(tak nak|degil|menangis|marah|tantrum|frust)/.test(t)) {
    return pick([
      `Tak mengapa — itu normal. Berhenti seketika, turunkan tekanan, dan cuba semula bila ${name} lebih tenang. Jadikan ia main, bukan ujian. 💛`,
      `Cuba ikut minat ${name} dahulu. Kalau dia menolak aktiviti, sambung dengan benda yang dia suka, kemudian selitkan perkataan sasaran secara santai.`,
    ])
  }

  if (/(seterus|next|lepas ni|selepas)/.test(t)) {
    return pick([
      `Bagus! Selepas ini, pilih satu lagi aktiviti dari senarai hari ini. 3 aktiviti × 5 minit sudah memadai untuk dos harian 15 minit.`,
      `Langkah seterusnya: ulang aktiviti yang sama esok untuk pengukuhan, atau cuba aktiviti baharu dalam rutin berbeza supaya ${name} belajar merentas situasi.`,
    ])
  }

  if (/(video|tonton)/.test(t)) {
    return act
      ? `Video untuk '${act}' menunjukkan cara melakukannya langkah demi langkah. Tonton dahulu, kemudian cuba bersama ${name}.`
      : `Pilih satu aktiviti di atas — jika ada video panduan, ia akan dipaparkan untuk anda tonton.`
  }

  if (/(terima kasih|tq|thanks|thank)/.test(t)) {
    return pick([
      "Sama-sama! Saya sentiasa di sini bila anda perlukan bantuan. 🌟",
      `Sama-sama! Teruskan usaha — konsistensi anda buat perbezaan besar untuk ${name}.`,
    ])
  }

  // Fallback — acknowledge + nudge forward.
  return pick([
    `Saya faham. Boleh ceritakan sedikit lagi supaya saya boleh cadangkan langkah terbaik untuk ${name}?`,
    `Nota diterima! Untuk hari ini, fokus pada satu aktiviti dan raikan setiap percubaan kecil ${name}.`,
    `Soalan yang baik. Cuba aktiviti hari ini dahulu, dan beritahu saya bagaimana respons ${name} — kita boleh laraskan dari situ.`,
  ])
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
  onSelect,
}: {
  activity: Activity
  index: number
  selected: boolean
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
      {/* Step number */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
        style={{ background: `hsl(${CORAL} / 0.16)`, color: `hsl(${CORAL})` }}
      >
        {index + 1}
      </span>

      {/* Title + meta */}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {activity.title}
          </span>
          {activity.video && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `hsl(${TEAL} / 0.16)`, color: `hsl(${TEAL})` }}
            >
              <Play className="h-2.5 w-2.5" fill="currentColor" />
              Video
            </span>
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
}: {
  activity: Activity
  childStage?: number
}) {
  const stageCode = toStageCode(childStage)
  const content =
    activity.stages.find((s) => s.stage === stageCode) ?? activity.stages[0]

  return (
    <div
      className="ml-12 max-w-md animate-fade-up space-y-3 rounded-3xl glass-strong p-4"
      style={{ animationDelay: "120ms", animationFillMode: "both" }}
    >
      {/* Materials */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bahan diperlukan
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
      </div>

      {/* Stage-specific instructions */}
      {content && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cara buat
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {content.instructions}
          </p>
          {content.dialogue.length > 0 && (
            <p
              className="mt-2 rounded-xl px-3 py-2 text-xs italic"
              style={{
                background: `hsl(${CORAL} / 0.08)`,
                color: "hsl(var(--foreground) / 0.85)",
              }}
            >
              💬 “{content.dialogue[0]}”
            </p>
          )}
        </div>
      )}
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

interface AacTile {
  label: string
  emoji: string
}

const AAC_CATEGORIES: { id: string; label: string; hue: number; tiles: AacTile[] }[] = [
  {
    id: "teras",
    label: "Teras",
    hue: 12, // coral
    tiles: [
      { label: "Saya", emoji: "🙋" },
      { label: "Mahu", emoji: "✋" },
      { label: "Tidak", emoji: "🚫" },
      { label: "Lagi", emoji: "➕" },
      { label: "Habis", emoji: "✅" },
      { label: "Tolong", emoji: "🙏" },
      { label: "Suka", emoji: "❤️" },
      { label: "Pergi", emoji: "🏃" },
    ],
  },
  {
    id: "makanan",
    label: "Makanan",
    hue: 172, // teal
    tiles: [
      { label: "Makan", emoji: "🍽️" },
      { label: "Minum", emoji: "🥤" },
      { label: "Susu", emoji: "🍼" },
      { label: "Air", emoji: "💧" },
      { label: "Biskut", emoji: "🍪" },
      { label: "Nasi", emoji: "🍚" },
      { label: "Buah", emoji: "🍎" },
      { label: "Aiskrim", emoji: "🍦" },
    ],
  },
  {
    id: "perasaan",
    label: "Perasaan",
    hue: 270, // purple
    tiles: [
      { label: "Gembira", emoji: "😄" },
      { label: "Sedih", emoji: "😢" },
      { label: "Marah", emoji: "😠" },
      { label: "Takut", emoji: "😨" },
      { label: "Sakit", emoji: "🤕" },
      { label: "Penat", emoji: "🥱" },
      { label: "Sayang", emoji: "🤗" },
    ],
  },
  {
    id: "aktiviti",
    label: "Aktiviti",
    hue: 210, // blue
    tiles: [
      { label: "Main", emoji: "🧸" },
      { label: "Tidur", emoji: "😴" },
      { label: "Mandi", emoji: "🛁" },
      { label: "Baca", emoji: "📖" },
      { label: "Nyanyi", emoji: "🎵" },
      { label: "Tonton", emoji: "📺" },
      { label: "Jalan", emoji: "🚶" },
    ],
  },
]

function AacBoard() {
  const [category, setCategory] = useState(AAC_CATEGORIES[0].id)
  const [strip, setStrip] = useState<AacTile[]>([])

  const active = AAC_CATEGORIES.find((c) => c.id === category) ?? AAC_CATEGORIES[0]

  return (
    <div className="flex h-full flex-col px-4 pt-5 md:px-8 md:pt-6">
      <p className="shrink-0 text-sm text-muted-foreground">
        Ketik simbol untuk membantu anak anda berkomunikasi.
      </p>

      {/* Sentence strip */}
      <div className="mt-4 flex shrink-0 items-center gap-2 rounded-2xl glass-strong p-2.5">
        <div className="flex min-h-[2.75rem] flex-1 flex-wrap items-center gap-2 overflow-hidden">
          {strip.length === 0 ? (
            <span className="px-2 text-sm text-muted-foreground">
              Ayat anak anda akan terbina di sini…
            </span>
          ) : (
            strip.map((tile, i) => (
              <span
                key={`${tile.label}-${i}`}
                className="flex animate-fade-up items-center gap-1.5 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-sm font-medium"
                style={{ animationFillMode: "both" }}
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
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Category filter */}
      <div className="mt-4 flex shrink-0 flex-wrap gap-2">
        {AAC_CATEGORIES.map((c) => {
          const selected = c.id === category
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                selected ? "text-foreground" : "glass text-foreground/70 hover:text-foreground"
              )}
              style={
                selected
                  ? {
                      background: `hsl(${c.hue} 90% 60% / 0.18)`,
                      boxShadow: `inset 0 0 0 1px hsl(${c.hue} 90% 60% / 0.45)`,
                      color: `hsl(${c.hue} 90% 78%)`,
                    }
                  : undefined
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Symbol grid */}
      <div className="mt-4 flex-1 overflow-y-auto pb-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {active.tiles.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={() => setStrip((s) => [...s, tile])}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl glass-strong transition-all hover:bg-white/[0.09] active:scale-95"
              style={{ boxShadow: `inset 0 0 0 1px hsl(${active.hue} 90% 60% / 0.25)` }}
            >
              <span className="text-3xl sm:text-4xl" aria-hidden>
                {tile.emoji}
              </span>
              <span
                className="text-xs font-semibold sm:text-sm"
                style={{ color: `hsl(${active.hue} 90% 80%)` }}
              >
                {tile.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Notifikasi / Tetapan — lightweight placeholder views                      */
/* -------------------------------------------------------------------------- */

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
