import { useState } from "react"
import {
  Bot,
  Bell,
  User,
  Settings,
  Paperclip,
  Mic,
  ArrowUp,
  Play,
  LayoutGrid,
  BrainCircuit,
  Menu,
  Lock,
  Check,
  Volume2,
  X,
  CalendarCheck,
  Library,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import ActivityLibrary from "@/components/ActivityLibrary"
import ProfileView from "@/components/ProfileView"
import SettingsView from "@/components/SettingsView"
import { GOALS } from "@/lib/goals"

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
  | "notification"
  | "setting"
  | "classic"
  | "profile"

// Page titles shown in the persistent top navigation bar.
const VIEW_TITLES: Record<NavId, string> = {
  ai: "Panduan AI Tutur",
  aktiviti: "Pustaka Aktiviti",
  aac: "Papan AAC",
  classic: "Matlamat Anda",
  notification: "Notifikasi",
  setting: "Tetapan",
  profile: "Profil",
}

const NAV_ITEMS = [
  { id: "ai", label: "Panduan AI", icon: BrainCircuit },
  { id: "aktiviti", label: "Aktiviti", icon: Library },
  { id: "aac", label: "Papan", icon: LayoutGrid },
  { id: "notification", label: "Notifikasi", icon: Bell },
  { id: "setting", label: "Tetapan", icon: Settings },
] as const satisfies ReadonlyArray<{
  id: NavId
  label: string
  icon: typeof Bot
}>

/* -------------------------------------------------------------------------- */
/*  Static placeholder content (pre-backend)                                  */
/* -------------------------------------------------------------------------- */

const VIDEO_LIBRARY = [
  { title: "Meniru Bunyi Haiwan", meta: "3 min • Vokalisasi", tag: "Hari 4" },
  { title: "Permainan Cermin", meta: "4 min • Ekspresi", tag: "Baharu" },
  { title: "Lagu Aksi Tangan", meta: "5 min • Isyarat", tag: "Popular" },
  { title: "Masa Bercerita", meta: "6 min • Bahasa", tag: "Lanjutan" },
] as const

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
  routines = [],
  activities = [],
  onUpdateProfile,
  onUpdateRoutines,
  onSignOut,
}: {
  profile?: Profile
  /** Routine codes (R1–R10) the parent selected during onboarding. */
  routines?: string[]
  /** Activity codes (A1…) the parent curated during onboarding. */
  activities?: string[]
  /** Persists profile edits (from the profile page) and stage overrides. */
  onUpdateProfile?: (profile: Profile) => void
  /** Persists daily-routine changes made from Tetapan. */
  onUpdateRoutines?: (routines: string[]) => void
  /** Clears the session and returns to the start of the flow. */
  onSignOut?: () => void
}) {
  const [activeNav, setActiveNav] = useState<NavId>("ai")
  const [menuOpen, setMenuOpen] = useState(false) // mobile drawer

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
            <ChatInterface guardianName={guardianName} />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aktiviti"}>
            <ActivityLibrary
              childStage={profile?.stage}
              routines={routines}
              activityCodes={activities}
            />
          </ViewLayer>

          <ViewLayer visible={activeNav === "aac"}>
            <AacBoard />
          </ViewLayer>

          <ViewLayer visible={activeNav === "classic"}>
            <ClassicDashboard />
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
        <CalendarCheck
          className="h-5 w-5 shrink-0"
          style={activitiesActive ? { color: `hsl(${CORAL})` } : undefined}
        />
        Matlamat Anda
      </button>

      {/* User profile — opens the editable profile page */}
      <div className="mt-4 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={() => onSelect("profile")}
          aria-current={profileActive ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-all",
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

function ChatInterface({ guardianName }: { guardianName: string }) {
  const chips = [
    "💡 Berikan tips untuk aktiviti ini",
    "🗣️ Bagaimana saya tahu jika anak faham?",
    "⏭️ Saya dah buat aktiviti ini semalam, tunjuk seterusnya",
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Conversational stream */}
      <div className="relative min-h-0 flex-1">
        <div className="mx-auto h-full max-w-2xl space-y-5 overflow-y-auto px-4 pb-36 pt-6 md:px-6">
          {/* Message 1 — proactive greeting */}
          <Bubble delay={0}>
            Selamat pagi, Ibu! ☀️ Bersedia untuk Hari ke-4 bagi matlamat{" "}
            <span className="font-semibold text-foreground">
              'Bina Kosa Kata'
            </span>{" "}
            anak anda? Aktiviti hari ini ialah video ringkas 3 minit berkenaan
            cara meniru bunyi haiwan. Jom kita tonton bersama!
          </Bubble>

          {/* Message 2 — generative UI video progress card */}
          <VideoProgressCard />

          {/* Message 3 — contextual prompt + chips */}
          <Bubble delay={120}>
            Sambil menonton atau selepas selesai nanti, beritahu saya jika anda
            memerlukan tips tambahan untuk menggalakkan anak anda mencuba sebutan
            bunyi tersebut!
          </Bubble>

          <div className="flex flex-wrap gap-2 pl-12">
            {chips.map((chip, i) => (
              <button
                key={chip}
                type="button"
                className="animate-fade-up rounded-full glass px-3.5 py-2 text-left text-xs font-medium text-foreground/85 transition-all hover:bg-white/[0.09] hover:text-foreground active:scale-[0.98]"
                style={{
                  animationDelay: `${200 + i * 70}ms`,
                  animationFillMode: "both",
                  boxShadow: `inset 0 0 22px -16px hsl(${CORAL} / 0.9)`,
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Floating chat input tray */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 md:px-6">
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-2 pl-3 pr-2 shadow-[0_12px_40px_-12px_hsl(240_60%_2%/0.9)] backdrop-blur-2xl">
            <button
              type="button"
              aria-label="Lampirkan fail"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              type="text"
              aria-label={`Tanya Maya, ${guardianName}`}
              placeholder="Tanya tentang aktiviti hari ini, atau taip nota perkembangan anda..."
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            />

            <button
              type="button"
              aria-label="Rakam suara"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Hantar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-background transition-transform active:scale-95"
              style={{
                background: `hsl(${CORAL})`,
                boxShadow: `0 0 18px -2px hsl(${CORAL} / 0.7)`,
              }}
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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

/** Message 2 — premium dark-glass video progress card, native to the feed. */
function VideoProgressCard() {
  return (
    <div
      className="ml-12 max-w-md animate-fade-up overflow-hidden rounded-3xl glass-strong"
      style={{ animationDelay: "60ms", animationFillMode: "both" }}
    >
      {/* Media area */}
      <div className="relative">
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
          {/* Coral play button overlay */}
          <button
            type="button"
            aria-label="Main video"
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

        {/* Teal day badge */}
        <span
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md"
          style={{
            background: `hsl(${TEAL} / 0.18)`,
            color: `hsl(${TEAL})`,
            boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.35)`,
          }}
        >
          Hari 4 daripada 30
        </span>
      </div>

      {/* Meta + progress */}
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight">
            Aktiviti: Meniru Bunyi Haiwan 🐶🐱
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            3 minit • Fokus: Vokalisasi Awal
          </p>
        </div>

        {/* Progress footer */}
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: "0%", background: `hsl(${TEAL})` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
            0% Selesai
          </p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Board — Classic Dashboard (30-day grid · 10 goals · video library)        */
/* -------------------------------------------------------------------------- */

function ClassicDashboard() {
  return (
    <div className="h-full overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <p className="text-sm text-muted-foreground">
          Matlamat perkembangan dan pustaka video anak anda.
        </p>

        {/* 10 parent-aspiration goals (shared with the onboarding picker) */}
        <section>
          <h2 className="mb-3 px-1 text-sm font-semibold tracking-tight">
            10 Matlamat Perkembangan Teras
          </h2>
          <ul className="space-y-2">
            {GOALS.map((goal, i) => {
              // Visual progress state — first few complete, the next in focus.
              const done = i < 3
              const active = i === 3
              return (
                <li
                  key={goal.code}
                  className="flex items-center gap-3 rounded-2xl glass px-4 py-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={
                      done
                        ? { background: `hsl(${TEAL} / 0.18)`, color: `hsl(${TEAL})` }
                        : active
                          ? {
                              background: `hsl(${CORAL} / 0.18)`,
                              color: `hsl(${CORAL})`,
                            }
                          : { background: "hsl(0 0% 100% / 0.05)" }
                    }
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : active ? (
                      i + 1
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm font-medium",
                      done
                        ? "text-foreground/70"
                        : active
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {goal.aspiration}
                  </span>
                  {active && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `hsl(${CORAL} / 0.18)`,
                        color: `hsl(${CORAL})`,
                      }}
                    >
                      Aktif
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {/* Video library card deck */}
        <section>
          <h2 className="mb-3 px-1 text-sm font-semibold tracking-tight">
            Pustaka Video
          </h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {VIDEO_LIBRARY.map((video) => (
              <article
                key={video.title}
                className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl glass-strong"
              >
                <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: `hsl(${CORAL})`,
                      boxShadow: `0 0 20px -4px hsl(${CORAL} / 0.8)`,
                    }}
                  >
                    <Play
                      className="ml-0.5 h-4 w-4 text-background"
                      fill="currentColor"
                    />
                  </span>
                  <span
                    className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md"
                    style={{
                      background: `hsl(${TEAL} / 0.18)`,
                      color: `hsl(${TEAL})`,
                    }}
                  >
                    {video.tag}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-xs font-bold tracking-tight">
                    {video.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {video.meta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
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
