import { useEffect, useMemo, useState } from "react"
import {
  Users,
  Activity as ActivityIcon,
  Clock,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Star,
  Loader2,
  ShieldAlert,
  User,
  ChevronRight,
  Mail,
  CalendarDays,
  Target,
  Baby,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useT, useLang, pick, type Lang } from "@/lib/i18n"
import { ACTIVITIES, STAGE_INFO, STAGE_ORDER } from "@/lib/activities"
import { GOALS } from "@/lib/goals"
import { SECTIONS, type Question } from "@/lib/survey"
import {
  loadAdminData,
  type AdminData,
  type AdminProfileRow,
  type AdminChildRow,
} from "@/lib/db"

/* ========================================================================== *
 *  WawasanView — admin-only analytics dashboard.
 *
 *  Aggregates every guardian's adoption, engagement, and feedback across the
 *  whole app. Only rendered for role='admin' (gated in DashboardHub); the RLS
 *  admin SELECT policies (migrations 0003/0004) make the cross-user reads work.
 *
 *  All figures are computed live in-memory from the raw rows, so they are real
 *  — no placeholders. Charts reuse the app's glass + HSL styling (no chart lib).
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"
const PURPLE = "247 74% 63%"

/* -------------------------------------------------------------------------- */
/*  Small date helpers (local time)                                           */
/* -------------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Count rows per day for the last `n` days, oldest → newest. */
function bucketByDay(dates: string[], n: number): number[] {
  const today = startOfToday()
  const counts = new Array(n).fill(0)
  for (const iso of dates) {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) continue
    const dayIndex = Math.floor((today - t) / DAY) // 0 = today
    const slot = n - 1 - dayIndex
    if (slot >= 0 && slot < n) counts[slot] += 1
  }
  return counts
}

/** Short "d/m" labels for the last `n` days, oldest → newest. */
function dayLabels(n: number): string[] {
  const today = startOfToday()
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today - i * DAY)
    out.push(`${d.getDate()}/${d.getMonth() + 1}`)
  }
  return out
}

function activityTitle(code: string, lang: Lang): string {
  const title = ACTIVITIES.find((a) => a.code === code)?.title
  return title ? pick(title, lang) : code
}

/* -------------------------------------------------------------------------- */
/*  Section tabs                                                              */
/* -------------------------------------------------------------------------- */

type TabId = "adoption" | "engagement" | "funnel" | "feedback"

/** Sticky, horizontally-scrollable tab bar (never overflows the viewport). */
function TabBar({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  const w = useT().wawasan
  const TABS: { id: TabId; label: string }[] = [
    { id: "adoption", label: w.tabAdoption },
    { id: "engagement", label: w.tabEngagement },
    { id: "funnel", label: w.tabFunnel },
    { id: "feedback", label: w.tabFeedback },
  ]
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-border/50 bg-background/85 px-4 py-2 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              )}
              style={
                active
                  ? {
                      background: `hsl(${CORAL} / 0.16)`,
                      boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.45)`,
                    }
                  : undefined
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function WawasanView() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAdminData()
      .then((d) => {
        if (cancelled) return
        if (!d) setError(true)
        else setData(d)
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return <WawasanError />
  }

  return <WawasanDashboard data={data} />
}

function WawasanError() {
  const t = useT()
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-sm rounded-3xl glass-strong p-8 text-center">
        <ShieldAlert
          className="mx-auto h-8 w-8"
          style={{ color: `hsl(${CORAL})` }}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          {t.wawasan.loadError}
        </p>
      </div>
    </div>
  )
}

function WawasanDashboard({ data }: { data: AdminData }) {
  const t = useT()
  const { lang } = useLang()
  const w = t.wawasan
  const { profiles, children, completions, feedback } = data

  // Section tabs so each area is one tap away instead of a long scroll.
  const [tab, setTab] = useState<TabId>("adoption")

  const metrics = useMemo(() => {
    const totalGuardians = profiles.length
    const activeUsers = new Set(completions.map((c) => c.guardian_id)).size
    const totalActivities = completions.length
    const totalMinutes = Math.round(
      completions.reduce((s, c) => s + (c.seconds ?? 0), 0) / 60
    )
    const feedbackCount = feedback.length
    const onboarded = profiles.filter((p) => !!p.primary_goal).length

    // Funnel: signed up → onboarded → did an activity → gave feedback.
    const feedbackGuardians = new Set(
      feedback.map((f) => f.guardian_id).filter(Boolean)
    ).size

    return {
      totalGuardians,
      activeUsers,
      totalActivities,
      totalMinutes,
      feedbackCount,
      onboarded,
      feedbackGuardians,
      signupsByDay: bucketByDay(
        profiles.map((p) => p.created_at),
        14
      ),
      completionsByDay: bucketByDay(
        completions.map((c) => c.completed_at),
        14
      ),
      dayAxis: dayLabels(14),
      byRelationship: countBy(profiles.map((p) => p.relationship)),
      byStage: [1, 2, 3, 4, 5].map((st) => ({
        stage: st,
        count: children.filter((c) => c.stage === st).length,
      })),
      popularActivities: topBy(
        completions.map((c) => c.activity_code),
        6
      ),
    }
  }, [profiles, children, completions, feedback])

  const responseRate = metrics.totalGuardians
    ? Math.round((metrics.feedbackGuardians / metrics.totalGuardians) * 100)
    : 0

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header>
          <h2 className="text-lg font-bold tracking-tight">{w.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{w.subtitle}</p>
        </header>

        {/* Headline stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Users}
            hue={CORAL}
            value={`${metrics.totalGuardians}`}
            label={w.guardians}
          />
          <StatCard
            icon={CheckCircle2}
            hue={TEAL}
            value={`${metrics.activeUsers}`}
            label={w.activeUsers}
          />
          <StatCard
            icon={ActivityIcon}
            hue={TEAL}
            value={`${metrics.totalActivities}`}
            label={w.activitiesDone}
          />
          <StatCard
            icon={Clock}
            hue={PURPLE}
            value={`${metrics.totalMinutes}`}
            label={w.totalMinutes}
          />
        </div>

        {/* Section tabs — sticky so they stay reachable while scrolling */}
        <TabBar tab={tab} onTab={setTab} />

        {/* ============================ Adoption ============================ */}
        {tab === "adoption" && (
          <div className="space-y-4">
            <Card
              icon={TrendingUp}
              title={w.newSignups}
              subtitle={w.newSignupsSub}
            >
              <VerticalBars
                values={metrics.signupsByDay}
                labels={metrics.dayAxis}
                hue={CORAL}
              />
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card icon={CheckCircle2} title={w.onboardingDone}>
                <ProgressStat
                  value={metrics.onboarded}
                  total={metrics.totalGuardians}
                  caption={w.onboardingCaption}
                  hue={TEAL}
                />
              </Card>
              <Card icon={Users} title={w.relationship}>
                <BarList
                  items={metrics.byRelationship}
                  hue={CORAL}
                  emptyLabel={w.dash}
                />
              </Card>
            </div>
          </div>
        )}

        {/* =========================== Engagement =========================== */}
        {tab === "engagement" && (
          <div className="space-y-4">
            <Card
              icon={ActivityIcon}
              title={w.activitiesTitle}
              subtitle={w.activitiesSub}
            >
              <VerticalBars
                values={metrics.completionsByDay}
                labels={metrics.dayAxis}
                hue={TEAL}
              />
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Card icon={Star} title={w.popular}>
                <BarList
                  items={metrics.popularActivities.map((x) => ({
                    label: activityTitle(x.key, lang),
                    count: x.count,
                  }))}
                  hue={PURPLE}
                  emptyLabel={w.popularEmpty}
                />
              </Card>
              <Card icon={TrendingUp} title={w.childStage}>
                <BarList
                  items={metrics.byStage.map((s) => ({
                    label: `${w.stage} ${s.stage}`,
                    count: s.count,
                  }))}
                  hue={TEAL}
                  emptyLabel={w.dash}
                />
              </Card>
            </div>
          </div>
        )}

        {/* ============================= Funnel ============================= */}
        {tab === "funnel" && (
          <Card
            icon={TrendingUp}
            title={w.funnelTitle}
            subtitle={w.funnelSub}
          >
            <Funnel
              steps={[
                { label: w.funnelRegister, value: metrics.totalGuardians },
                { label: w.funnelOnboard, value: metrics.onboarded },
                { label: w.funnelActivity, value: metrics.activeUsers },
                { label: w.funnelFeedback, value: metrics.feedbackGuardians },
              ]}
            />
          </Card>
        )}

        {/* ============================ Feedback ============================ */}
        {tab === "feedback" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard
                icon={MessageSquare}
                hue={CORAL}
                value={`${metrics.feedbackCount}`}
                label={w.formsSubmitted}
              />
              <StatCard
                icon={Users}
                hue={TEAL}
                value={`${responseRate}%`}
                label={w.responseRate}
              />
              <StatCard
                icon={Star}
                hue={PURPLE}
                value={avgSatisfaction(feedback)}
                label={w.avgSatisfaction}
              />
            </div>

            {metrics.feedbackCount === 0 ? (
              <div className="rounded-3xl glass-strong p-6 text-center text-sm text-muted-foreground">
                {w.noFeedback}
              </div>
            ) : (
              SECTIONS.map((section) => (
                <div key={section.key} className="space-y-3">
                  <h3
                    className="rounded-2xl px-4 py-2.5 text-sm font-bold"
                    style={{
                      background: `hsl(${CORAL} / 0.12)`,
                      color: `hsl(${CORAL})`,
                    }}
                  >
                    {pick(section.title, lang)}
                  </h3>
                  {section.questions.map((q) => (
                    <QuestionAnalysis key={q.id} q={q} feedback={feedback} />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Guardian explorer — list of all registered guardians + a profile card    */
/* -------------------------------------------------------------------------- */

export interface GuardianEntry {
  profile: AdminProfileRow
  child?: AdminChildRow
  activityCount: number
  minutes: number
  feedbackCount: number
}

export function guardianName(p: AdminProfileRow, fallback: string): string {
  return p.guardian_name?.trim() || p.email?.trim() || fallback
}

/** A gradient monogram avatar (initial of the name). */
export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  return (
    <div
      className={
        large
          ? "relative h-16 w-16 shrink-0 rounded-full p-[2px]"
          : "relative h-10 w-10 shrink-0 rounded-full p-[2px]"
      }
      style={{
        background: `linear-gradient(135deg, hsl(${CORAL}), hsl(${PURPLE}))`,
        boxShadow: `0 0 16px -2px hsl(${CORAL} / 0.6)`,
      }}
    >
      <span
        className={`flex h-full w-full items-center justify-center rounded-full bg-background font-bold text-foreground/90 ${
          large ? "text-2xl" : "text-sm"
        }`}
      >
        {initial}
      </span>
    </div>
  )
}

/** A small "Deleted" status pill for soft-deleted accounts. */
export function DeletedBadge({ label }: { label: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: "hsl(var(--destructive) / 0.15)",
        color: "hsl(var(--destructive))",
      }}
    >
      {label}
    </span>
  )
}

/** Beautiful profile card for one guardian. */
export function GuardianDetail({ entry }: { entry: GuardianEntry }) {
  const t = useT()
  const { lang } = useLang()
  const w = t.wawasan
  const { profile: p, child, activityCount, minutes, feedbackCount } = entry
  const name = guardianName(p, w.guardianFallback)
  const goal = GOALS.find((g) => g.code === p.primary_goal)
  const stage = child?.stage
    ? Math.min(Math.max(child.stage, 1), 5)
    : undefined
  const stageInfo = stage ? STAGE_INFO[STAGE_ORDER[stage - 1]] : undefined

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <Avatar name={name} large />
        <h4 className="mt-3 text-lg font-bold tracking-tight">{name}</h4>
        <p className="text-sm text-muted-foreground">
          {p.relationship?.trim() || w.guardianDefault}
        </p>
        {(p.role === "admin" || p.deleted_at) && (
          <div className="mt-2 flex items-center gap-1.5">
            {p.role === "admin" && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: `hsl(${PURPLE} / 0.18)`,
                  color: `hsl(${PURPLE})`,
                }}
              >
                {w.admin}
              </span>
            )}
            {p.deleted_at && <DeletedBadge label={w.deleted} />}
          </div>
        )}
      </div>

      {/* Engagement mini-stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat value={`${activityCount}`} label={w.miniActivities} hue={TEAL} />
        <MiniStat value={`${minutes}`} label={w.miniMinutes} hue={PURPLE} />
        <MiniStat value={`${feedbackCount}`} label={w.miniFeedback} hue={CORAL} />
      </div>

      {/* Guardian details */}
      <div className="space-y-1">
        <DetailRow icon={Mail} label={w.email} value={p.email?.trim() || w.dash} />
        <DetailRow
          icon={User}
          label={w.guardianAge}
          value={p.guardian_age?.trim() || w.dash}
        />
        <DetailRow
          icon={CalendarDays}
          label={w.registered}
          value={formatDate(p.created_at)}
        />
        <DetailRow
          icon={Target}
          label={w.primaryGoal}
          value={goal ? `“${pick(goal.aspiration, lang)}”` : w.goalNone}
        />
      </div>

      {/* Child card */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Baby className="h-3.5 w-3.5" /> {w.childSection}
        </p>
        {child ? (
          <div className="space-y-1 rounded-2xl border border-foreground/10 p-3.5">
            <DetailRow
              icon={Baby}
              label={w.childName}
              value={child.name?.trim() || w.dash}
            />
            <DetailRow
              icon={User}
              label={w.childAge}
              value={child.age?.trim() || w.dash}
            />
            {stageInfo && (
              <DetailRow
                icon={Sparkles}
                label={w.childStageLabel}
                value={`${w.stage} ${stage} · ${pick(stageInfo.name, lang)}`}
              />
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-foreground/10 p-3.5 text-xs text-muted-foreground">
            {w.childNone}
          </p>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  value,
  label,
  hue,
}: {
  value: string
  label: string
  hue: string
}) {
  return (
    <div className="rounded-2xl bg-[hsl(259_80%_55%/0.08)] p-3 text-center">
      <p className="text-lg font-bold tracking-tight" style={{ color: `hsl(${hue})` }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="break-words text-sm text-foreground/90">{value}</p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Per-question feedback analysis                                            */
/* -------------------------------------------------------------------------- */

function QuestionAnalysis({
  q,
  feedback,
}: {
  q: Question
  feedback: AdminData["feedback"]
}) {
  const w = useT().wawasan
  const { lang } = useLang()
  const responses = feedback.map((f) => f.responses ?? {})

  // Free-text follow-up (`${id}_text`) and "Lain-lain" (`${id}_other`) values.
  const followUps = responses
    .map((r) => r[`${q.id}_text`])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  const others = responses
    .map((r) => r[`${q.id}_other`])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)

  let body: React.ReactNode = null

  // Options: match against the canonical Bahasa Malaysia value (what's stored),
  // but display the label in the current language.
  const optsLoc = q.scale ?? q.options
  const display = optsLoc ? pick(optsLoc, lang) : []
  const canonical = optsLoc ? optsLoc.ms : []

  if (q.type === "scale" || q.type === "single") {
    const counts = canonical.map(
      (opt) => responses.filter((r) => r[q.id] === opt).length
    )
    const total = counts.reduce((a, b) => a + b, 0)
    body = (
      <>
        {q.type === "scale" && total > 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            {w.avgScore}{" "}
            <span className="font-semibold" style={{ color: `hsl(${CORAL})` }}>
              {scaleAverage(counts).toFixed(2)}
            </span>{" "}
            / {display.length} · {total} {w.answers}
          </p>
        )}
        <DistributionBars
          rows={display.map((label, i) => ({ label, count: counts[i] }))}
          total={total}
        />
      </>
    )
  } else if (q.type === "multi") {
    const counts = canonical.map(
      (opt) =>
        responses.filter((r) => {
          const v = r[q.id]
          return Array.isArray(v) && v.includes(opt)
        }).length
    )
    const total = feedback.length
    body = (
      <DistributionBars
        rows={display.map((label, i) => ({ label, count: counts[i] }))}
        total={total}
      />
    )
  } else {
    // Open-text — list the answers themselves.
    const answers = responses
      .map((r) => r[q.id])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    body = <TextList answers={answers} />
  }

  return (
    <div className="rounded-3xl glass-strong p-5">
      <p className="text-sm font-semibold leading-relaxed font-display">
        <span style={{ color: `hsl(${CORAL})` }}>{q.no}.</span>{" "}
        {pick(q.text, lang)}
      </p>
      <div className="mt-3.5">{body}</div>

      {/* "Lain-lain" free-text entries for choice questions */}
      {others.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {w.other} ({others.length})
          </p>
          <TextList answers={others} />
        </div>
      )}

      {/* Open-text follow-up comments */}
      {q.followUp && followUps.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            {pick(q.followUp, lang)} ({followUps.length})
          </p>
          <TextList answers={followUps} />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Presentational primitives                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  hue,
  value,
  label,
  onClick,
}: {
  icon: typeof Users
  hue: string
  value: string
  label: string
  /** When set, the card becomes an interactive button (e.g. to drill in). */
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `hsl(${hue} / 0.16)`, color: `hsl(${hue})` }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {onClick && <ChevronRight className="h-3 w-3" />}
      </p>
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl glass-strong p-4 text-left transition-all hover:bg-foreground/5 active:scale-[0.99]"
        style={{ boxShadow: `inset 0 0 0 1px hsl(${hue} / 0.25)` }}
      >
        {inner}
      </button>
    )
  }
  return <div className="rounded-2xl glass-strong p-4">{inner}</div>
}

function Card({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Users
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

/** Vertical bar chart over a daily time series, with a labelled axis and
 *  faint gridlines so it reads as a chart even when data is concentrated. */
function VerticalBars({
  values,
  labels,
  hue,
}: {
  values: number[]
  labels: string[]
  hue: string
}) {
  const max = Math.max(1, ...values)
  return (
    <div>
      <div className="relative h-36">
        {/* Horizontal gridlines + y-axis ticks (max and half) */}
        {[1, 0.5].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-black/[0.06]"
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-1.5 left-0 -translate-y-full bg-transparent text-[9px] text-muted-foreground/60">
              {Math.round(max * f)}
            </span>
          </div>
        ))}

        {/* Bars sitting on a baseline axis */}
        <div className="absolute inset-0 flex items-end gap-1 border-b border-foreground/10">
          {values.map((v, i) => (
            <div
              key={i}
              className="group flex flex-1 flex-col items-center justify-end gap-1"
            >
              {v > 0 && (
                <span className="text-[9px] font-semibold text-foreground/80">
                  {v}
                </span>
              )}
              <div
                className="w-full rounded-t-[3px] transition-all"
                style={{
                  height: `${(v / max) * 100}%`,
                  minHeight: v > 0 ? 4 : 0,
                  background: v > 0 ? `hsl(${hue} / 0.85)` : "transparent",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* X-axis date labels — one per bar */}
      <div className="mt-1.5 flex gap-1">
        {labels.map((l, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[8px] leading-tight text-muted-foreground/70"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Horizontal ranked bars (label + count). */
function BarList({
  items,
  hue,
  emptyLabel,
}: {
  items: { label: string; count: number }[]
  hue: string
  emptyLabel: string
}) {
  const shown = items.filter((i) => i.count > 0)
  if (shown.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }
  const max = Math.max(1, ...shown.map((i) => i.count))
  return (
    <div className="space-y-2.5">
      {shown.map((i) => (
        <div key={i.label}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs font-medium text-foreground/90">
              {i.label}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {i.count}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(i.count / max) * 100}%`,
                background: `hsl(${hue} / 0.8)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Distribution bars with percentage-of-total (for feedback options). */
function DistributionBars({
  rows,
  total,
}: {
  rows: { label: string; count: number }[]
  total: number
}) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="min-w-0 break-words text-xs font-medium text-foreground/90">
                {r.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.count} · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `hsl(${TEAL} / 0.8)` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TextList({ answers }: { answers: string[] }) {
  const w = useT().wawasan
  if (answers.length === 0) {
    return <p className="text-xs text-muted-foreground">{w.noAnswer}</p>
  }
  return (
    <div className="space-y-1.5">
      {answers.map((a, i) => (
        <p
          key={i}
          className="break-words rounded-xl px-3 py-2 text-xs leading-relaxed text-foreground/85"
          style={{ background: `hsl(${CORAL} / 0.07)` }}
        >
          “{a}”
        </p>
      ))}
    </div>
  )
}

function ProgressStat({
  value,
  total,
  caption,
  hue,
}: {
  value: number
  total: number
  caption: string
  hue: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold tracking-tight">{pct}%</p>
        <p className="text-xs text-muted-foreground">
          {value}/{total}
        </p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `hsl(${hue})` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}

/** Simple funnel — each step as a shrinking bar with its retention %. */
function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1)
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const pctOfTop = Math.round((s.value / top) * 100)
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground/90">
                {i + 1}. {s.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {s.value} · {pctOfTop}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(pctOfTop, 2)}%`,
                  background: `hsl(${CORAL} / ${0.85 - i * 0.15})`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Aggregation helpers                                                       */
/* -------------------------------------------------------------------------- */

const MONTHS_MS = [
  "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
  "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis",
]

/** Format an ISO date as "3 Jul 2026" (Malay month abbreviations). */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${d.getDate()} ${MONTHS_MS[d.getMonth()]} ${d.getFullYear()}`
}

/** Join profiles with their child + engagement totals, newest guardian first. */
export function buildGuardianIndex(data: AdminData): GuardianEntry[] {
  const childByGuardian = new Map<string, AdminChildRow>()
  for (const c of data.children) {
    if (!childByGuardian.has(c.guardian_id)) childByGuardian.set(c.guardian_id, c)
  }

  const actByGuardian = new Map<string, { count: number; seconds: number }>()
  for (const c of data.completions) {
    const cur = actByGuardian.get(c.guardian_id) ?? { count: 0, seconds: 0 }
    cur.count += 1
    cur.seconds += c.seconds ?? 0
    actByGuardian.set(c.guardian_id, cur)
  }

  const fbByGuardian = new Map<string, number>()
  for (const f of data.feedback) {
    if (!f.guardian_id) continue
    fbByGuardian.set(f.guardian_id, (fbByGuardian.get(f.guardian_id) ?? 0) + 1)
  }

  return data.profiles
    .map((profile) => {
      const act = actByGuardian.get(profile.id)
      return {
        profile,
        child: childByGuardian.get(profile.id),
        activityCount: act?.count ?? 0,
        minutes: Math.round((act?.seconds ?? 0) / 60),
        feedbackCount: fbByGuardian.get(profile.id) ?? 0,
      }
    })
    .sort((a, b) => b.profile.created_at.localeCompare(a.profile.created_at))
}

/** Count non-empty string values, returned as label/count pairs. */
function countBy(values: (string | null)[]): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const v of values) {
    const key = (v ?? "").trim()
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/** Top-N keys by frequency, returned as key/count pairs. */
function topBy(values: string[], n: number): { key: string; count: number }[] {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

/** Weighted average of a 5-point scale from its per-option counts (1..N). */
function scaleAverage(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0)
  if (!total) return 0
  const weighted = counts.reduce((s, c, i) => s + c * (i + 1), 0)
  return weighted / total
}

/** Average of the Q1 satisfaction scale across submitted feedback.
 *  Matches on the canonical Bahasa Malaysia option values (what's stored). */
function avgSatisfaction(feedback: AdminData["feedback"]): string {
  const scale = SECTIONS[0].questions.find((q) => q.id === "q1")?.scale
  const options = scale ? scale.ms : []
  if (!options.length) return "—"
  const counts = options.map(
    (opt) => feedback.filter((f) => f.responses?.["q1"] === opt).length
  )
  const avg = scaleAverage(counts)
  return avg ? avg.toFixed(1) : "—"
}
