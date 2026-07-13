/* ========================================================================== *
 *  PREVERB · day-session + activity-run persistence.
 *
 *  Records what the family actually did, each day of the 14-day programme.
 *
 *  This is the data the pilot's primary question depends on (spec §1.1 — "do
 *  parents complete the daily loop consistently over 14 days?"). Before this,
 *  a parent could finish Day 1 and leave no trace at all.
 *
 *  ── TWO TABLES, TWO QUESTIONS ─────────────────────────────────────────────
 *    preverb_day_session  — one row per CONTENT day (1–14). "Did they reach
 *                           Day 7? Did they finish it?" Content is snapshotted
 *                           into the row.
 *    preverb_activity_run — one row per PLAY. "How long were they with their
 *                           child on 13 July?" A day may be replayed, and may
 *                           be replayed on a later date; each play is a row.
 *
 *  Everything the progress calendar shows comes from RUNS, because the calendar
 *  is a calendar — it is indexed by date, and only runs carry a date.
 *
 *  NOT Goal Base. Goal Base writes `activity_completions` (a row per activity
 *  picked from the catalogue). Different question, different table — a query
 *  against the wrong one silently answers the wrong thing.
 *
 *  See supabase/migrations/0015_preverb_day_session.sql and 0016_*.sql.
 * ========================================================================== */

import { supabase } from "@/lib/supabase"
import { dayConfig } from "@/content/preverb"
import { type Feeling } from "@/content/preverb/reflection"
import {
  type BmkRating,
  type CcsLevel,
  type DayConfig,
  type JaLevel,
  type ObservationQuestion,
  type RutinRating,
} from "@/lib/preverbConfig"

/** A row of preverb_activity_run, as the UI needs it. */
export interface PreverbRun {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string
  dayNumber: number
  seconds: number
  completed: boolean
}

/** Handles for the play currently in progress. */
export interface PreverbRunHandle {
  sessionId: string
  runId: string
}

/** Local `YYYY-MM-DD`. NOT `toISOString()` — that is UTC, and would file a
 *  9pm Malaysian session under the following day. */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/* -------------------------------------------------------------------------- */
/*  Writing — the lifecycle of one play                                       */
/* -------------------------------------------------------------------------- */

/**
 * The parent tapped "Mula aktiviti". Opens the day's session and starts a run.
 *
 * The session's content is SNAPSHOTTED into the row rather than referenced by
 * day_number. Day content is versioned and will change between cohorts — if we
 * stored only the number, every historical row would silently re-interpret
 * itself the next time content shipped.
 *
 *   Hari 1 · "Masa Bermain Bebas : Kenal Pasti Minat"
 *     routine_label = "Masa Bermain Bebas"   ← the setting
 *     activity      = "Kenal Pasti Minat"    ← what you do
 *
 * The run is opened NOW, at zero seconds, rather than written at the end. A
 * parent who closes the tab mid-activity has still spent that time with their
 * child; a write-at-the-end design would record nothing at all for them.
 */
export async function startPreverbRun(
  childId: string,
  day: DayConfig
): Promise<PreverbRunHandle | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null

  const { data: session, error: sessionErr } = await supabase
    .from("preverb_day_session")
    .upsert(
      {
        child_id: childId,
        guardian_id: uid,
        day_number: day.day_number,
        goal_tag: day.goal_tag,
        routine: day.routine,
        routine_label: day.title,
        activity: day.subtitle,
        focus_skill: day.focus_skill,
      },
      // Re-opening Day 1 updates the existing row — it must NOT create a second
      // Day 1. `completed_at` is deliberately absent from the payload, so a
      // parent revisiting a finished day does not un-complete it.
      { onConflict: "child_id,day_number", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  if (sessionErr || !session) return null

  const { data: run, error: runErr } = await supabase
    .from("preverb_activity_run")
    .insert({
      session_id: session.id,
      child_id: childId,
      guardian_id: uid,
      day_number: day.day_number,
      calendar_date: isoDate(new Date()),
    })
    .select("id")
    .single()

  if (runErr || !run) return null
  return { sessionId: session.id as string, runId: run.id as string }
}

/**
 * Heartbeat. Pushes the clock up while the player is open.
 *
 * Called every few seconds rather than once at the end, because "the end" is
 * not a reliable event — parents close tabs, phones sleep, browsers get killed.
 * The cost of a heartbeat is one small UPDATE; the cost of not having one is
 * losing the entire session's time.
 */
export async function tickPreverbRun(runId: string, seconds: number): Promise<void> {
  await supabase
    .from("preverb_activity_run")
    .update({ duration_seconds: Math.max(0, Math.round(seconds)) })
    .eq("id", runId)
}

/**
 * They reached the end of the script. Written the MOMENT it happens, not on
 * exit — a parent who finishes and then closes the tab has still finished.
 *
 * "Completed" means "got to the end", not "spent a long time". A 20-minute run
 * abandoned at step 2 is a long run and an unfinished day, and the pilot has to
 * be able to tell those apart.
 */
export async function markPreverbRunCompleted(handle: PreverbRunHandle): Promise<void> {
  await supabase
    .from("preverb_activity_run")
    .update({ completed: true })
    .eq("id", handle.runId)

  await supabase
    .from("preverb_day_session")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", handle.sessionId)
    // Keep the FIRST completion. Replaying a finished day must not restamp it —
    // the date they first got through Day 7 is the interesting one.
    .is("completed_at", null)
}

/** The player closed. Seals the clock. */
export async function endPreverbRun(runId: string, seconds: number): Promise<void> {
  await supabase
    .from("preverb_activity_run")
    .update({
      duration_seconds: Math.max(0, Math.round(seconds)),
      ended_at: new Date().toISOString(),
    })
    .eq("id", runId)
}

/**
 * Day 1's answer: which toy the child reached for.
 *
 * Stored on the CHILD, not the session — Days 2, 13 and 14 all read it ("GUNA
 * MAINAN SAMA seperti Hari 1"), so it is a standing fact, not an event.
 */
export async function savePreverbInterest(
  childId: string,
  interest: string
): Promise<void> {
  await supabase
    .from("children")
    .update({ preverb_interest: interest })
    .eq("id", childId)
}

/** The toy from Day 1, if it has been recorded. Contextualises D2–D14. */
export async function loadPreverbInterest(childId: string): Promise<string | null> {
  const { data } = await supabase
    .from("children")
    .select("preverb_interest")
    .eq("id", childId)
    .maybeSingle()
  return (data?.preverb_interest as string | null) ?? null
}

/* -------------------------------------------------------------------------- */
/*  Reading — everything the progress surfaces need                           */
/* -------------------------------------------------------------------------- */

/** Every run for this child, oldest first. The source for all progress views. */
export async function loadPreverbRuns(childId: string): Promise<PreverbRun[]> {
  const { data, error } = await supabase
    .from("preverb_activity_run")
    .select("calendar_date, day_number, duration_seconds, completed")
    .eq("child_id", childId)
    .order("calendar_date", { ascending: true })

  if (error || !data) return []
  return data.map((r) => ({
    date: r.calendar_date as string,
    dayNumber: r.day_number as number,
    seconds: (r.duration_seconds as number) ?? 0,
    completed: !!r.completed,
  }))
}

/** What happened on one calendar date. Several runs collapse into one day. */
export interface DayProgress {
  seconds: number
  /** True if ANY run that date reached the end of the script. */
  completed: boolean
  /** Content days played that date — usually one, more if they replayed. */
  dayNumbers: number[]
}

/** Runs folded by calendar date. `YYYY-MM-DD` → what happened that day. */
export type PreverbProgress = Record<string, DayProgress>

export function foldRunsByDate(runs: PreverbRun[]): PreverbProgress {
  const out: PreverbProgress = {}
  for (const r of runs) {
    const d = (out[r.date] ??= { seconds: 0, completed: false, dayNumbers: [] })
    d.seconds += r.seconds
    d.completed ||= r.completed
    if (!d.dayNumbers.includes(r.dayNumber)) d.dayNumbers.push(r.dayNumber)
  }
  return out
}

/** Sessions, for surfaces that care about the programme rather than the clock. */
export interface PreverbSession {
  id: string
  dayNumber: number
  startedAt: string
  completedAt: string | null
}

/** Every session for this child, oldest content-day first. */
export async function loadPreverbSessions(childId: string): Promise<PreverbSession[]> {
  const { data } = await supabase
    .from("preverb_day_session")
    .select("id, day_number, started_at, completed_at")
    .eq("child_id", childId)
    .order("day_number", { ascending: true })

  return (data ?? []).map((r) => ({
    id: r.id as string,
    dayNumber: r.day_number as number,
    startedAt: r.started_at as string,
    completedAt: r.completed_at as string | null,
  }))
}

/* -------------------------------------------------------------------------- */
/*  TRACKER — the pilot's primary instrument (migration 0018)                 */
/* -------------------------------------------------------------------------- */

/** One answer, in whichever scale the question uses. */
export type TrackerAnswer =
  | { scale: "bmk"; value: BmkRating }
  | { scale: "ccs"; value: CcsLevel }
  | { scale: "ja"; value: JaLevel }
  | { scale: "rutin"; value: RutinRating }
  | { scale: "text"; value: string }

/**
 * Save one answered question. Called on EVERY screen, not at the end.
 *
 * Spec §5.8: auto-save every answered screen. A parent who abandons the tracker
 * at question 7 has still told us six things, and — more importantly — WHERE she
 * stopped is itself the finding (`obs_abandoned{question_id}`). Batching the
 * writes to the end would throw away exactly the data the pilot exists to get.
 */
export async function saveTrackerAnswer(
  childId: string,
  sessionId: string | null,
  dayNumber: number,
  q: ObservationQuestion,
  answer: TrackerAnswer
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return

  // Free text NEVER touches the clinical store. It goes to the vault, and the
  // clinical row keeps only "yes, there was something new" — see 0018.
  if (answer.scale === "text") {
    const text = answer.value.trim()
    if (text) {
      await supabase.rpc("save_word_bank_entry", {
        p_child_id: childId,
        p_day_number: dayNumber,
        p_entry: text,
      })
    }
    await upsertTracker(childId, uid, sessionId, dayNumber, q, {
      has_new_words: text.length > 0,
    })
    return
  }

  await upsertTracker(childId, uid, sessionId, dayNumber, q, {
    [answer.scale]: answer.value,
  })

  // A positive answer on a milestone question is a FIRST — record the date.
  if (
    q.milestone_on_positive &&
    answer.scale === "bmk" &&
    (answer.value === "muncul" || answer.value === "konsisten")
  ) {
    await recordMilestone(childId, uid, dayNumber, q.milestone_on_positive)
  }
}

async function upsertTracker(
  childId: string,
  uid: string,
  sessionId: string | null,
  dayNumber: number,
  q: ObservationQuestion,
  values: Record<string, unknown>
): Promise<void> {
  await supabase.from("tracker_record").upsert(
    {
      child_id: childId,
      guardian_id: uid,
      session_id: sessionId,
      day_number: dayNumber,
      question_id: q.question_id,
      role: q.role,
      category: q.category ?? null,
      answered_at: new Date().toISOString(),
      ...values,
    },
    { onConflict: "child_id,day_number,question_id" }
  )
}

/**
 * A first. Idempotent by construction: `unique (child_id, milestone_id)` plus
 * ignoreDuplicates means the EARLIEST date wins, which is the only date an SLT
 * cares about. Re-answering "Muncul" on Day 9 must not restamp a Day 3 first.
 */
async function recordMilestone(
  childId: string,
  uid: string,
  dayNumber: number,
  milestoneId: string
): Promise<void> {
  const day = dayConfig(dayNumber)
  const label =
    day?.kind === "activity"
      ? (day.milestones.find((m: { milestone_id: string }) => m.milestone_id === milestoneId)
            ?.label ?? milestoneId)
      : milestoneId

  await supabase.from("milestone_event").insert(
    {
      child_id: childId,
      guardian_id: uid,
      milestone_id: milestoneId,
      label,
      day_number: dayNumber,
      occurred_on: isoDate(new Date()),
    },
  ).select().maybeSingle()
  // A duplicate raises a unique violation, which we swallow: the first already
  // exists, and that is the correct outcome, not an error.
}

/** Answers already given for a day — so the tracker resumes where she stopped. */
export async function loadTrackerAnswers(
  childId: string,
  dayNumber: number
): Promise<Record<string, TrackerAnswer>> {
  const { data } = await supabase
    .from("tracker_record")
    .select("question_id, bmk, ccs, ja, rutin, has_new_words")
    .eq("child_id", childId)
    .eq("day_number", dayNumber)

  const out: Record<string, TrackerAnswer> = {}
  for (const r of data ?? []) {
    const id = r.question_id as string
    if (r.bmk) out[id] = { scale: "bmk", value: r.bmk as BmkRating }
    else if (r.ccs) out[id] = { scale: "ccs", value: r.ccs as CcsLevel }
    else if (r.ja) out[id] = { scale: "ja", value: r.ja as JaLevel }
    else if (r.rutin) out[id] = { scale: "rutin", value: r.rutin as RutinRating }
    else if (r.has_new_words !== null && r.has_new_words !== undefined) {
      // The TEXT itself lives in the vault; fetched separately, only when needed.
      out[id] = { scale: "text", value: "" }
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */
/*  REFLECTION — C15–C17. The LEADING indicator (migration 0019)              */
/* -------------------------------------------------------------------------- */

export interface Reflection {
  /** C15 — ids from REFLECTION_STATEMENTS. Empty is a real answer. */
  statements: string[]
  /** C16 */
  feeling: Feeling | null
  /** C17 — free text. Goes to the vault, never the clinical store. */
  moment: string
}

/**
 * Save the reflection. Called once, at the end of C17.
 *
 * Unlike the tracker this is NOT saved per screen — the three reflection screens
 * are one thought, and a half-written "momen bermakna" is not a fact about the
 * day. But the whole thing is upserted on (child_id, day_number), so re-doing it
 * corrects rather than duplicates.
 */
export async function saveReflection(
  childId: string,
  sessionId: string | null,
  dayNumber: number,
  r: Reflection
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return

  const moment = r.moment.trim()

  // The moment is the most personal thing in the app. Vault only.
  if (moment) {
    await supabase.rpc("save_reflection_moment", {
      p_child_id: childId,
      p_day_number: dayNumber,
      p_moment: moment,
    })
  }

  await supabase.from("reflection_record").upsert(
    {
      child_id: childId,
      guardian_id: uid,
      session_id: sessionId,
      day_number: dayNumber,
      statements: r.statements,
      feeling: r.feeling,
      has_moment: moment.length > 0,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "child_id,day_number" }
  )

  // She said she needs help. This is the one row a HUMAN is meant to act on —
  // written the moment she says it, not batched, not conditional on her
  // finishing the rest of the flow.
  if (r.feeling === "perlukan_bantuan") {
    await supabase.from("support_trigger").upsert(
      {
        child_id: childId,
        guardian_id: uid,
        day_number: dayNumber,
        source: "reflection",
      },
      { onConflict: "child_id,day_number", ignoreDuplicates: true }
    )
  }
}
