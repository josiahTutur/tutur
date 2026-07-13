import type { Profile } from "@/lib/types"
import { STAGE_INFO, STAGE_ORDER } from "@/lib/activities"
import { GOALS } from "@/lib/goals"
import { currentStreak, lastNDaysSeconds } from "@/lib/progress"
import { type PreverbProgress } from "@/lib/preverbDb"
import ProgressCalendar from "@/components/ProgressCalendar"
import { useLang, pick } from "@/lib/i18n"
import {
  Flame,
  Clock,
  CheckCircle2,
  MessageCircle,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Localised strings (co-located)                                            */
/* -------------------------------------------------------------------------- */

const STR = {
  ms: {
    headingPrefix: "Analisis Perkembangan",
    headerSubtitle:
      "Pantau dua perkara penting — konsistensi anda dan perkembangan anak.",
    activeGoalLabel: "Matlamat aktif: ",
    statStreakLabel: "Streak harian",
    statMinutesLabel: "Minit minggu ini",
    statActivitiesLabel: "Minit bersama anak (30h)",
    statNewWordsLabel: "Perkataan baharu",
    sectionConsistency: "Konsistensi Anda",
    sectionChildProgress: "Perkembangan Anak",
    weeklyMinutesTitle: "Minit Intervensi Mingguan",
    weeklyMinutesSubtitle: (t: number) =>
      `Sasaran ${t} minit sehari (3 aktiviti × 5 minit).`,
    chartTarget: (t: number) => `Sasaran ${t}m`,
    vocabTitle: "Perkembangan Kosa Kata",
    vocabSubtitle: "Jumlah terkumpul perkataan & 'aha moment' baharu.",
    stageTitle: "Kemajuan Tahap Komunikasi",
    stageSubtitle: "Perjalanan anak merentasi 5 tahap komunikasi.",
    focusTitle: "Fokus Latihan",
    focusSubtitle: "Pecahan masa latihan mengikut strategi minggu ini.",
    weeksAgo: "8 minggu lepas",
    week1: "Minggu 1",
    now: "Kini",
    stageWord: "Tahap",
    dayLabels: ["Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Ahd"],
    skillFocusNames: [
      "Bercakap Banyak",
      "Tunggu & Beri Ruang",
      "Ulang & Kembang",
      "Soalan WH & Naratif",
    ],
    defaultChildName: "anak anda",
  },
  en: {
    headingPrefix: "Progress Analysis",
    headerSubtitle:
      "Keep an eye on two things that matter — your consistency and your child's progress.",
    activeGoalLabel: "Active goal: ",
    statStreakLabel: "Daily streak",
    statMinutesLabel: "Minutes this week",
    statActivitiesLabel: "Minutes with your child (30d)",
    statNewWordsLabel: "New words",
    sectionConsistency: "Your Consistency",
    sectionChildProgress: "Your Child's Progress",
    weeklyMinutesTitle: "Weekly Intervention Minutes",
    weeklyMinutesSubtitle: (t: number) =>
      `Target ${t} minutes a day (3 activities × 5 minutes).`,
    chartTarget: (t: number) => `Target ${t}m`,
    vocabTitle: "Vocabulary Growth",
    vocabSubtitle: "Total new words & 'aha moments' gathered along the way.",
    stageTitle: "Communication Stage Progress",
    stageSubtitle: "Your child's journey across the 5 communication stages.",
    focusTitle: "Practice Focus",
    focusSubtitle: "How this week's practice time was split across strategies.",
    weeksAgo: "past 8 weeks",
    week1: "Week 1",
    now: "Now",
    stageWord: "Stage",
    dayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    skillFocusNames: [
      "Talk a Lot",
      "Wait & Give Space",
      "Repeat & Expand",
      "WH Questions & Storytelling",
    ],
    defaultChildName: "your child",
  },
} as const

/* ========================================================================== *
 *  AnalysisView — parent-facing progress analytics (Analisis Perkembangan).
 *
 *  Organised around the app's "Ukuran 2-Jalur" (2-track measurement) idea:
 *    • Track 1 — Konsistensi: is the PARENT showing up? (streak, dose, calendar)
 *    • Track 2 — Perkembangan: is the CHILD progressing? (new words, stage)
 *
 *  All figures are representative placeholders until a backend records real
 *  session data — consistent with the rest of the pre-backend hub. Swapping in
 *  live data is a matter of replacing the constants below.
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"
const PURPLE = "247 74% 63%"

/* -------------------------------------------------------------------------- */
/*  Representative data (pre-backend)                                          */
/* -------------------------------------------------------------------------- */

const DAILY_TARGET_MIN = 15 // 3 activities × 5 min

// Intervention minutes logged each day this week.
const WEEK_MINUTES = [15, 20, 15, 10, 20, 15, 15]


// Cumulative new words / spontaneous communication wins, by week (8 weeks).
const WORDS_BY_WEEK = [2, 5, 9, 12, 16, 19, 22, 26]

// Where this week's practice time went, by core strategy. Display names live
// in the STR table (skillFocusNames), indexed positionally.
const SKILL_FOCUS = [{ pct: 38 }, { pct: 27 }, { pct: 20 }, { pct: 15 }]

const WITHIN_STAGE_PCT = 60 // progress through the current stage

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AnalysisView({
  profile,
  goal,
  progress,
}: {
  profile?: Profile
  /** Active primary goal code (G1–G10). */
  goal?: string
  /** The family's real Preverb history — shared with Aktiviti Harian. */
  progress: PreverbProgress
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const childName = profile?.childName?.trim() || s.defaultChildName
  const stage = Math.min(Math.max(profile?.stage ?? 1, 1), 5)
  const activeGoal = GOALS.find((g) => g.code === goal)

  // Real, from preverb_activity_run — the two numbers on this screen that are
  // not placeholders. Everything else here (WEEK_MINUTES, WORDS_BY_WEEK,
  // SKILL_FOCUS) is still invented, which is why the whole view sits behind the
  // "coming soon" blur.
  const last30 = lastNDaysSeconds(progress, 30)
  const streak = currentStreak(progress)
  const minutesDone = Math.round(last30.reduce((a, b) => a + b, 0) / 60)

  const weekTotal = WEEK_MINUTES.reduce((a, b) => a + b, 0)
  const newWords = WORDS_BY_WEEK[WORDS_BY_WEEK.length - 1]

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header>
          <h2 className="text-lg font-bold tracking-tight">
            {s.headingPrefix} {childName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.headerSubtitle}
          </p>
        </header>

        {/* Active goal banner */}
        {activeGoal && (
          <div
            className="flex items-start gap-3 rounded-2xl border px-4 py-3"
            style={{
              borderColor: `hsl(${CORAL} / 0.4)`,
              background: `hsl(${CORAL} / 0.08)`,
            }}
          >
            <Target
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: `hsl(${CORAL})` }}
            />
            <p className="text-sm text-foreground/90">
              <span className="text-muted-foreground">{s.activeGoalLabel}</span>
              <span className="font-semibold">“{pick(activeGoal.aspiration, lang)}”</span>
            </p>
          </div>
        )}

        {/* Key stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Flame}
            hue={CORAL}
            value={`${streak} ${lang === "ms" ? "hari" : "days"}`}
            label={s.statStreakLabel}
          />
          <StatCard
            icon={Clock}
            hue={TEAL}
            value={`${weekTotal} min`}
            label={s.statMinutesLabel}
          />
          <StatCard
            icon={CheckCircle2}
            hue={TEAL}
            value={`${minutesDone}`}
            label={s.statActivitiesLabel}
          />
          <StatCard
            icon={MessageCircle}
            hue={PURPLE}
            value={`+${newWords}`}
            label={s.statNewWordsLabel}
          />
        </div>

        {/* ----------------------- Track 1 — Konsistensi ----------------------- */}
        <SectionLabel>{s.sectionConsistency}</SectionLabel>

        {/* The real month, from preverb_activity_run. */}
        <ProgressCalendar progress={progress} />

        {/* Weekly intervention minutes vs target */}
        <Card
          icon={Clock}
          title={s.weeklyMinutesTitle}
          subtitle={s.weeklyMinutesSubtitle(DAILY_TARGET_MIN)}
        >
          <WeeklyMinutesChart />
        </Card>

        {/* ---------------------- Track 2 — Perkembangan ----------------------- */}
        <SectionLabel>{s.sectionChildProgress}</SectionLabel>

        {/* Cumulative new-words growth */}
        <Card
          icon={TrendingUp}
          title={s.vocabTitle}
          subtitle={s.vocabSubtitle}
        >
          <WordsGrowthChart total={newWords} />
        </Card>

        {/* Communication stage progress */}
        <Card
          icon={Sparkles}
          title={s.stageTitle}
          subtitle={s.stageSubtitle}
        >
          <StageProgress stage={stage} />
        </Card>

        {/* Practice focus breakdown */}
        <Card
          icon={Target}
          title={s.focusTitle}
          subtitle={s.focusSubtitle}
        >
          <SkillFocus />
        </Card>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  hue,
  value,
  label,
}: {
  icon: typeof Flame
  hue: string
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl glass-strong p-4">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `hsl(${hue} / 0.16)`, color: `hsl(${hue})` }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section + card wrappers                                                   */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-1 pt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Flame
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-3xl glass-strong p-5">
      <div className="flex items-start gap-2.5">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: `hsl(${CORAL})` }}
        />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  30-day consistency heatmap                                                */
/* -------------------------------------------------------------------------- */
/*  Weekly intervention minutes bar chart                                     */
/* -------------------------------------------------------------------------- */

function WeeklyMinutesChart() {
  const { lang } = useLang()
  const s = STR[lang]
  const chartMax = 30 // headroom above the 15-min target
  const targetPct = (DAILY_TARGET_MIN / chartMax) * 100

  return (
    <div>
      <div className="relative h-36">
        {/* Target line */}
        <div
          className="absolute inset-x-0 border-t border-dashed"
          style={{
            bottom: `${targetPct}%`,
            borderColor: `hsl(${CORAL} / 0.5)`,
          }}
        >
          <span
            className="absolute -top-2 right-0 rounded-full bg-background/80 px-1.5 text-[10px] font-medium"
            style={{ color: `hsl(${CORAL})` }}
          >
            {s.chartTarget(DAILY_TARGET_MIN)}
          </span>
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-2">
          {WEEK_MINUTES.map((min, i) => {
            const hit = min >= DAILY_TARGET_MIN
            const hue = hit ? TEAL : CORAL
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-[10px] font-semibold text-foreground/80">
                  {min}
                </span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max((min / chartMax) * 100, 3)}%`,
                    background: `hsl(${hue} / ${hit ? 0.85 : 0.5})`,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Day labels */}
      <div className="mt-2 flex gap-2">
        {s.dayLabels.map((d) => (
          <span
            key={d}
            className="flex-1 text-center text-[10px] text-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cumulative new-words growth (area + line)                                 */
/* -------------------------------------------------------------------------- */

function WordsGrowthChart({ total }: { total: number }) {
  const { lang } = useLang()
  const s = STR[lang]
  const scaleMax = Math.ceil((total + 2) / 5) * 5
  const n = WORDS_BY_WEEK.length
  const pts = WORDS_BY_WEEK.map((v, i) => {
    const x = (i / (n - 1)) * 100
    const y = 100 - (v / scaleMax) * 100
    return [x, y] as const
  })
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ")
  const area = `${line} L100 100 L0 100 Z`

  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="font-display text-2xl font-bold tracking-tight">{total}</p>
        <p className="text-xs text-muted-foreground">{s.weeksAgo}</p>
      </div>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="mt-2 h-32 w-full"
      >
        <defs>
          <linearGradient id="wordsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${CORAL})`} stopOpacity="0.35" />
            <stop offset="100%" stopColor={`hsl(${CORAL})`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#wordsGrad)" />
        <path
          d={line}
          fill="none"
          stroke={`hsl(${CORAL})`}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{s.week1}</span>
        <span>{s.now}</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Communication stage progress                                             */
/* -------------------------------------------------------------------------- */

function StageProgress({ stage }: { stage: number }) {
  const { lang } = useLang()
  const s = STR[lang]
  const current = STAGE_INFO[STAGE_ORDER[stage - 1]]

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center">
        {STAGE_ORDER.map((code, i) => {
          const num = i + 1
          const done = num < stage
          const active = num === stage
          return (
            <div key={code} className="flex flex-1 items-center last:flex-none">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={
                  done
                    ? { background: `hsl(${TEAL} / 0.2)`, color: `hsl(${TEAL})` }
                    : active
                      ? {
                          background: `hsl(${CORAL} / 0.18)`,
                          color: `hsl(${CORAL})`,
                          boxShadow: `0 0 0 2px hsl(${CORAL} / 0.5)`,
                        }
                      : { background: "hsl(259 80% 55% / 0.08)", color: "hsl(var(--muted-foreground))" }
                }
              >
                {num}
              </span>
              {num < STAGE_ORDER.length && (
                <span
                  className="h-0.5 flex-1"
                  style={{
                    background: done
                      ? `hsl(${TEAL} / 0.4)`
                      : "hsl(var(--foreground) / 0.08)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current stage progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">
            {s.stageWord} {stage} · {pick(current.name, lang)}
          </span>
          <span className="text-xs font-medium" style={{ color: `hsl(${CORAL})` }}>
            {WITHIN_STAGE_PCT}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full"
            style={{
              width: `${WITHIN_STAGE_PCT}%`,
              background: `hsl(${CORAL})`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{pick(current.goal, lang)}</p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Practice focus breakdown                                                  */
/* -------------------------------------------------------------------------- */

function SkillFocus() {
  const { lang } = useLang()
  const s = STR[lang]
  return (
    <div className="space-y-3">
      {SKILL_FOCUS.map((focus, i) => {
        const name = s.skillFocusNames[i]
        return (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/90">
                {name}
              </span>
              <span className="text-xs text-muted-foreground">{focus.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${focus.pct}%`, background: `hsl(${TEAL} / 0.8)` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
