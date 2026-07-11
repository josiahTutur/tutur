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

/** The id of the child the signed-in user is actively linked to — their own or
 *  one shared with them. Invited (non-owner) memberships win over an owned one,
 *  so a joined co-parent lands on the shared child and a solo parent on theirs.
 *  Null if they have no child yet. */
export async function loadActiveChildId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("child_guardians")
    .select("child_id, role, created_at")
    .eq("guardian_id", user.id)
  if (!data || data.length === 0) return null

  const sorted = [...data].sort((a, b) => {
    const ao = a.role === "owner" ? 1 : 0
    const bo = b.role === "owner" ? 1 : 0
    if (ao !== bo) return ao - bo // invited/shared child first
    return (a.created_at ?? "").localeCompare(b.created_at ?? "")
  })
  return (sorted[0].child_id as string) ?? null
}

/** Load the signed-in user's onboarding selections, or null if not signed in.
 *  Reads the shared child (via membership) and its plan; falls back to the
 *  profile's legacy plan columns for accounts predating the shared-child model. */
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

  const childId = await loadActiveChildId()
  let child: {
    name: string | null
    age: string | null
    stage: number | null
    profiled_at: string | null
    primary_goal: string | null
    routines: string[] | null
    activities: string[] | null
  } | null = null
  if (childId) {
    const { data } = await supabase
      .from("children")
      .select("name, age, stage, profiled_at, primary_goal, routines, activities")
      .eq("id", childId)
      .maybeSingle()
    child = data
  }

  // Prefer the shared child's plan; fall back to the profile (pre-migration).
  const routines =
    (child?.routines?.length ? child.routines : profile?.routines) ?? []
  const activities =
    (child?.activities?.length ? child.activities : profile?.activities) ?? []

  return {
    goal: child?.primary_goal ?? profile?.primary_goal ?? undefined,
    routines,
    activities,
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

  // Update the child the user is linked to (own or shared); create one only if
  // they have none yet. The DB trigger auto-links the creator as owner.
  const childId = await loadActiveChildId()

  const childRow: Record<string, unknown> = {
    name: profile.childName || null,
    age: profile.childAge || null,
    stage: profile.stage ?? null,
    profiled_at: profile.profiledAt || null,
  }
  if (answers) childRow.profiling_answers = answers

  const { error: cErr } = childId
    ? await supabase.from("children").update(childRow).eq("id", childId)
    : await supabase
        .from("children")
        .insert({ guardian_id: user.id, ...childRow })
  if (cErr) console.error("[saveProfile] children save failed:", cErr)
}

/** Save the signed-in user's onboarding selections (no-op if not signed in). */
export async function saveOnboarding(data: OnboardingData): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Keep a copy on the profile (admin analytics still read it)…
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

  // …and write the shared plan onto the child so co-parents see the same thing.
  const childId = await loadActiveChildId()
  if (childId) {
    const childPlan: Record<string, unknown> = {
      primary_goal: data.goal ?? null,
      routines: data.routines,
      activities: data.activities,
    }
    if (data.stage != null) childPlan.stage = data.stage
    const { error: childError } = await supabase
      .from("children")
      .update(childPlan)
      .eq("id", childId)
    if (childError) {
      console.error("[saveOnboarding] child plan update failed:", childError)
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Account deletion                                                          */
/*                                                                            */
/*  Soft delete ONLY: the profile is marked with a `deleted_at` timestamp and  */
/*  nothing else changes — all details (names, email, ages, child, completions,*/
/*  feedback) are retained. The account is simply hidden: the boot guard        */
/*  (isAccountDeleted) blocks the user from logging back in.                    */
/* -------------------------------------------------------------------------- */

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false
      /** Why the delete didn't happen — drives the message shown to the user. */
      reason: "not_signed_in" | "admin" | "error"
      /** Raw DB error (for the "error" reason), surfaced to help diagnose. */
      message?: string
    }

/** Mark the signed-in user's account as deleted — a soft-delete flag only.
 *
 *  All data is retained; only `deleted_at` is set, which hides the account and
 *  (via the boot guard) stops the user logging back in. Admin accounts are
 *  PROTECTED — they're provisioned from the SQL editor and can't self-delete
 *  here. On failure the raw DB error is returned so the reason is visible. */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: "not_signed_in" }

  // Protect admins — deleting one would also break the analytics dashboard.
  const role = await loadUserRole()
  if (role === "admin") return { ok: false, reason: "admin" }

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id)
  if (pErr) {
    console.error("[deleteAccount] mark-deleted failed:", pErr)
    return { ok: false, reason: "error", message: pErr.message }
  }

  return { ok: true }
}

/** Whether the signed-in user's account has been soft-deleted. Used on boot to
 *  bounce a returning session out instead of resurrecting a deleted account. */
export async function isAccountDeleted(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .maybeSingle()
  return !!data?.deleted_at
}

/* -------------------------------------------------------------------------- */
/*  Login days — per-user engagement (personalized, syncs across devices)     */
/* -------------------------------------------------------------------------- */

/** Local YYYY-MM-DD (matches how the calendar labels its day cells). */
function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

/** Record today as a login day for the signed-in user (idempotent). */
export async function recordLoginDay(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from("login_days")
    .upsert(
      { guardian_id: user.id, day: isoDay(new Date()) },
      { onConflict: "guardian_id,day", ignoreDuplicates: true }
    )
  if (error) console.error("[recordLoginDay] failed:", error)
}

/** Distinct login days this month for the signed-in user (floored at 1, since a
 *  user viewing this is active today). Personalized per account. */
export async function loginDaysThisMonth(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 1
  const now = new Date()
  const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const { count, error } = await supabase
    .from("login_days")
    .select("*", { count: "exact", head: true })
    .eq("guardian_id", user.id)
    .gte("day", first)
  if (error) {
    console.error("[loginDaysThisMonth] failed:", error)
    return 1
  }
  return Math.max(1, count ?? 1)
}

/* -------------------------------------------------------------------------- */
/*  App settings (maintenance) + admin actions                                */
/* -------------------------------------------------------------------------- */

/** Whether new sign-ups are paused (runtime flag, toggled by admins). Readable
 *  by everyone, including signed-out visitors. */
export async function loadMaintenance(): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("maintenance")
    .eq("id", 1)
    .maybeSingle()
  return !!data?.maintenance
}

/** Toggle maintenance mode (admin only, enforced by RLS). */
export async function setMaintenance(on: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("app_settings")
    .update({ maintenance: on, updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (error) {
    console.error("[setMaintenance] failed:", error)
    return false
  }
  return true
}

/** Reactivate a soft-deleted guardian (admin only, via SECURITY DEFINER RPC). */
export async function reactivateGuardian(id: string): Promise<boolean> {
  const { error } = await supabase.rpc("set_guardian_deleted", {
    gid: id,
    del: false,
  })
  if (error) {
    console.error("[reactivateGuardian] failed:", error)
    return false
  }
  return true
}

/** Permanently delete a guardian and all their data (admin only). Irreversible. */
export async function deleteGuardian(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_delete_guardian", { gid: id })
  if (error) {
    console.error("[deleteGuardian] failed:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  Sharing — invite a co-parent to the child via a short code                */
/* -------------------------------------------------------------------------- */

/** Mint an invite code for the active child. Null if not signed in / no child. */
export async function createChildInvite(): Promise<string | null> {
  const childId = await loadActiveChildId()
  if (!childId) return null
  const { data, error } = await supabase.rpc("create_child_invite", {
    cid: childId,
  })
  if (error) {
    console.error("[createChildInvite] failed:", error)
    return null
  }
  return (data as string) ?? null
}

/** The active (unexpired, not-used-up) invite code for the child, if one exists
 *  — so Settings can re-show it instead of minting a new code each visit. */
export async function loadActiveInvite(): Promise<string | null> {
  const childId = await loadActiveChildId()
  if (!childId) return null
  const { data, error } = await supabase
    .from("child_invites")
    .select("code, uses, max_uses")
    .eq("child_id", childId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[loadActiveInvite] failed:", error)
    return null
  }
  const active = (data ?? []).find((r) => (r.uses ?? 0) < (r.max_uses ?? 0))
  return active?.code ?? null
}

/** Redeem an invite code → link the signed-in user to the shared child. */
export async function acceptChildInvite(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("accept_child_invite", {
    invite_code: code.trim(),
  })
  if (error) {
    console.error("[acceptChildInvite] failed:", error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export interface CoGuardian {
  guardianId: string
  name: string | null
  role: string
}

/** Everyone linked to the active child (for the "shared with" list). */
export async function loadCoGuardians(): Promise<CoGuardian[]> {
  const childId = await loadActiveChildId()
  if (!childId) return []
  const { data, error } = await supabase.rpc("list_child_guardians", {
    cid: childId,
  })
  if (error) {
    console.error("[loadCoGuardians] failed:", error)
    return []
  }
  return ((data as { guardian_id: string; guardian_name: string | null; role: string }[]) ?? []).map(
    (r) => ({ guardianId: r.guardian_id, name: r.guardian_name, role: r.role })
  )
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

  const childId = await loadActiveChildId()
  const { data, error } = await supabase
    .from("activity_completions")
    .insert({
      guardian_id: user.id,
      child_id: childId, // shared child → co-parents see the same progress
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

/* -------------------------------------------------------------------------- */
/*  Admin analytics — powers the Wawasan dashboard                            */
/*                                                                            */
/*  These read across ALL users, which only works for admins: the RLS admin   */
/*  SELECT policies (migrations 0003/0004) widen access for role='admin', and  */
/*  a normal guardian would just get their own rows back. UI gates visibility  */
/*  on the role too, so this is defence in depth, not the only guard.          */
/* -------------------------------------------------------------------------- */

/** The signed-in user's role ('admin' | 'guardian'), or null if not signed in. */
export async function loadUserRole(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (error) {
    console.error("[loadUserRole] failed:", error)
    return null
  }
  return data?.role ?? null
}

export interface AdminProfileRow {
  id: string
  created_at: string
  guardian_name: string | null
  email: string | null
  primary_goal: string | null
  relationship: string | null
  guardian_age: string | null
  role: string
  /** Set when the guardian soft-deleted their account (null = active). */
  deleted_at: string | null
}
export interface AdminChildRow {
  guardian_id: string
  name: string | null
  age: string | null
  stage: number | null
  profiled_at: string | null
}
export interface AdminCompletionRow {
  guardian_id: string
  activity_code: string
  seconds: number
  completed_at: string
}
export interface AdminFeedbackRow {
  guardian_id: string | null
  responses: Record<string, string | string[]>
  created_at: string
}

/** All the raw rows the Wawasan dashboard aggregates in-memory. */
export interface AdminData {
  profiles: AdminProfileRow[]
  children: AdminChildRow[]
  completions: AdminCompletionRow[]
  feedback: AdminFeedbackRow[]
}

/** Load every guardian/child/completion/feedback row for the admin dashboard.
 *  Returns null if not signed in. Individual queries that error yield an empty
 *  set for that slice rather than failing the whole load. */
export async function loadAdminData(): Promise<AdminData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [profilesRes, childrenRes, completionsRes, feedbackRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, created_at, guardian_name, email, primary_goal, relationship, guardian_age, role, deleted_at"
        ),
      supabase
        .from("children")
        .select("guardian_id, name, age, stage, profiled_at"),
      supabase
        .from("activity_completions")
        .select("guardian_id, activity_code, seconds, completed_at"),
      supabase.from("feedback").select("guardian_id, responses, created_at"),
    ])

  for (const [name, res] of [
    ["profiles", profilesRes],
    ["children", childrenRes],
    ["activity_completions", completionsRes],
    ["feedback", feedbackRes],
  ] as const) {
    if (res.error) console.error(`[loadAdminData] ${name} failed:`, res.error)
  }

  return {
    profiles: (profilesRes.data as AdminProfileRow[]) ?? [],
    children: (childrenRes.data as AdminChildRow[]) ?? [],
    completions: (completionsRes.data as AdminCompletionRow[]) ?? [],
    feedback: (feedbackRes.data as AdminFeedbackRow[]) ?? [],
  }
}
