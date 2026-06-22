import { useState } from "react"
import {
  Menu,
  Flame,
  Bell,
  Home,
  Target,
  LayoutGrid,
  Users,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Bottom navigation config                                                  */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { id: "home", label: "Papan Pemuka", icon: Home },
  { id: "goals", label: "Matlamat", icon: Target },
  { id: "board", label: "Papan", icon: LayoutGrid },
  { id: "notifications", label: "Notifikasi", icon: Bell },
  { id: "communities", label: "Komuniti", icon: Users },
] as const

type NavId = (typeof NAV_ITEMS)[number]["id"]

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState<NavId>("home")

  return (
    <div className="flex h-screen flex-col">
      {/* ------------------------------- Header ------------------------------ */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-border/60 bg-background/70 px-5 py-4 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-white/5 hover:text-primary active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base font-semibold tracking-tight">Papan Pemuka</h1>

        {/* Circular profile placeholder with soft neon ring */}
        <button
          type="button"
          aria-label="Profil"
          className="relative h-10 w-10 rounded-full p-[2px] shadow-glow-cyan transition-transform active:scale-95"
          style={{
            background:
              "linear-gradient(135deg, hsl(187 100% 50%), hsl(270 95% 65%))",
          }}
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-bold text-gradient">
            IA
          </span>
        </button>
      </header>

      {/* ----------------------------- Scroll area --------------------------- */}
      <main className="flex-1 space-y-6 overflow-y-auto px-5 pb-28 pt-6">
        {/* Welcome greeting */}
        <section
          className="animate-fade-up"
          style={{ animationFillMode: "both" }}
        >
          <p className="text-sm text-muted-foreground">Selamat petang,</p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-gradient">
            Ibu &amp; Ayah
          </h2>
        </section>

        {/* KPI cards */}
        <section className="space-y-4">
          {/* 1 — Strike days */}
          <KpiCard delay={60}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Hari Berturut-turut
                </p>
                <p className="mt-2 text-3xl font-bold">
                  5 <span className="text-lg font-semibold">Hari</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Teruskan momentum hebat anda! 🔥
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass shadow-glow-cyan">
                <Flame className="h-7 w-7 text-primary" />
              </div>
            </div>
          </KpiCard>

          {/* 2 — Quality time with radial chart */}
          <KpiCard delay={140}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Jam Intervensi Bulan Ini
                </p>
                <p className="mt-2 text-3xl font-bold">
                  12 <span className="text-lg font-semibold">jam</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Matlamat: 20 jam sebulan
                </p>
              </div>
              <RadialProgress value={12} max={20} />
            </div>
          </KpiCard>

          {/* 3 — Notifications */}
          <KpiCard delay={220}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notifikasi
                </p>
                <p className="mt-2 text-3xl font-bold">
                  3{" "}
                  <span className="text-lg font-semibold">Mesej Baharu</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tip baharu &amp; peringatan menanti anda
                </p>
              </div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl glass shadow-glow-purple">
                <Bell className="h-7 w-7 text-secondary" />
                {/* Pulse notification badge */}
                <span className="absolute -right-1 -top-1 flex h-5 w-5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
                  <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                    3
                  </span>
                </span>
              </div>
            </div>
          </KpiCard>
        </section>
      </main>

      {/* --------------------------- Bottom nav bar -------------------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border/60 bg-background/80 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-2xl">
        <ul className="flex items-stretch justify-between">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeNav === id
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setActiveNav(id)}
                  className="group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors"
                >
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                      active
                        ? "glass text-primary shadow-glow-cyan"
                        : "text-muted-foreground group-hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={[
                      "text-[10px] font-medium tracking-tight transition-colors",
                      active ? "text-primary" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Reusable bits                                                              */
/* -------------------------------------------------------------------------- */

function KpiCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <div
      className="animate-fade-up rounded-3xl glass-strong p-5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  )
}

/** Pure-SVG radial progress ring with a neon gradient stroke. */
function RadialProgress({ value, max }: { value: number; max: number }) {
  const size = 72
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const dash = circumference * pct

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="radial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(187 100% 50%)" />
            <stop offset="100%" stopColor="hsl(270 95% 65%)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(240 14% 16%)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#radial-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{
            filter: "drop-shadow(0 0 4px hsl(187 100% 50% / 0.6))",
            transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold leading-none">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  )
}
