/* ========================================================================== *
 *  Database helpers — read/write the signed-in user's data in Supabase.
 *
 *  Onboarding selections (goal, routines, activities) live on the `profiles`
 *  row; the child's stage lives on the single `children` row. RLS guarantees a
 *  user can only ever touch their own rows, so these helpers never need to pass
 *  a user id for filtering beyond the auth check.
 * ========================================================================== */
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/types"

export interface OnboardingData {
  goal?: string
  routines: string[]
  activities: string[]
  stage?: number
  email?: string
  // Profile details collected in the 20-question profiling.
  guardianName?: string
  relationship?: string
  guardianAge?: string
  childName?: string
  childAge?: string
  profiledAt?: string
}

/** Ensure a profiles row exists for the signed-in user (the signup trigger may
 *  not have created it). Insert-if-missing only — never overwrites saved data. */
export async function ensureProfile(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email ?? null },
      { onConflict: "id", ignoreDuplicates: true }
    )
  if (error) console.error("[ensureProfile] failed:", error)
}

/** Load the signed-in user's onboarding selections, or null if not signed in. */
export async function loadOnboarding(): Promise<OnboardingData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "primary_goal, routines, activities, guardian_name, relationship, guardian_age"
    )
    .eq("id", user.id)
    .maybeSingle()

  const { data: child } = await supabase
    .from("children")
    .select("name, age, stage, profiled_at")
    .eq("guardian_id", user.id)
    .maybeSingle()

  return {
    goal: profile?.primary_goal ?? undefined,
    routines: profile?.routines ?? [],
    activities: profile?.activities ?? [],
    stage: child?.stage ?? undefined,
    email: user.email ?? undefined,
    guardianName: profile?.guardian_name ?? undefined,
    relationship: profile?.relationship ?? undefined,
    guardianAge: profile?.guardian_age ?? undefined,
    childName: child?.name ?? undefined,
    childAge: child?.age ?? undefined,
    profiledAt: child?.profiled_at ?? undefined,
  }
}

/** Save the guardian + child profile (names, relationship, ages, stage). */
export async function saveProfile(
  profile: Profile,
  answers?: string[]
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error: pErr } = await supabase.from("profiles").upsert({
    id: user.id,
    email: profile.email || user.email || null,
    guardian_name: profile.guardianName || null,
    relationship: profile.relationship || null,
    guardian_age: profile.guardianAge || null,
  })
  if (pErr) console.error("[saveProfile] profiles upsert failed:", pErr)

  // One child row per guardian — insert it, or update the existing one.
  const { data: existing } = await supabase
    .from("children")
    .select("id")
    .eq("guardian_id", user.id)
    .maybeSingle()

  const childRow: Record<string, unknown> = {
    guardian_id: user.id,
    name: profile.childName || null,
    age: profile.childAge || null,
    stage: profile.stage ?? null,
    profiled_at: profile.profiledAt || null,
  }
  if (answers) childRow.profiling_answers = answers

  const { error: cErr } = existing
    ? await supabase.from("children").update(childRow).eq("id", existing.id)
    : await supabase.from("children").insert(childRow)
  if (cErr) console.error("[saveProfile] children save failed:", cErr)
}

/** Save the signed-in user's onboarding selections (no-op if not signed in). */
export async function saveOnboarding(data: OnboardingData): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Upsert (not update) so it works even if the signup trigger never created
  // the profile row — insert it if missing, update it if present.
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    primary_goal: data.goal ?? null,
    routines: data.routines,
    activities: data.activities,
  })
  if (profileError) {
    console.error("[saveOnboarding] profiles upsert failed:", profileError)
  }
}

/* -------------------------------------------------------------------------- */
/*  Activity completions — the core per-day log                               */
/* -------------------------------------------------------------------------- */

export interface CompletionRecord {
  note: string
  seconds: number
  id: string
}

/** Today's completions for the signed-in user, keyed by activity code. */
export async function loadTodayCompletions(): Promise<
  Record<string, CompletionRecord>
> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const start = new Date()
  start.setHours(0, 0, 0, 0) // local midnight → "today"

  const { data } = await supabase
    .from("activity_completions")
    .select("id, activity_code, note, seconds, completed_at")
    .gte("completed_at", start.toISOString())
    .order("completed_at", { ascending: true })

  const map: Record<string, CompletionRecord> = {}
  for (const row of data ?? []) {
    // Latest completion per activity wins (rows are ordered oldest → newest).
    map[row.activity_code] = {
      note: row.note ?? "",
      seconds: row.seconds ?? 0,
      id: row.id,
    }
  }
  return map
}

/** Record a new completion; returns its row id (or null if not signed in). */
export async function insertCompletion(
  code: string,
  note: string,
  seconds: number,
  stage?: number
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("activity_completions")
    .insert({
      guardian_id: user.id,
      activity_code: code,
      note,
      seconds,
      stage_at_completion: stage ?? null,
    })
    .select("id")
    .single()

  if (error) return null
  return data?.id ?? null
}

/** Update an existing completion (e.g. the parent edits their reflection). */
export async function updateCompletion(
  id: string,
  note: string,
  seconds: number
): Promise<void> {
  await supabase
    .from("activity_completions")
    .update({ note, seconds })
    .eq("id", id)
}

/* -------------------------------------------------------------------------- */
/*  Feedback survey                                                           */
/* -------------------------------------------------------------------------- */

/** Submit a feedback-form response. Returns true on success. */
export async function saveFeedback(
  responses: Record<string, string | string[]>
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase
    .from("feedback")
    .insert({ guardian_id: user?.id ?? null, responses })
  if (error) {
    console.error("[saveFeedback] failed:", error)
    return false
  }
  return true
}
