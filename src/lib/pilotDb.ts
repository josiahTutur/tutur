/* ========================================================================== *
 *  Pilot onboarding persistence (A1–A14).
 *
 *  Splits what onboarding collects across two stores, per spec §3.1:
 *
 *    identity_vault  ← parent name, child nickname, every "Lain-lain" free text
 *                      (reached only via SECURITY DEFINER RPCs; no REST surface)
 *    clinical store  ← age buckets, relationship, screening, flags, variant,
 *                      confidence — keyed by opaque child_id / guardian_id
 *
 *  See supabase/migrations/0011_pilot_onboarding.sql.
 * ========================================================================== */

import { supabase } from "@/lib/supabase"
import { type OnboardingResult } from "@/components/onboarding/OnboardingFlow"

/* ──────────────────────────────────────────────────────────────────────────
 *  REMOVED: PILOT_DEFAULTS.
 *
 *  Preverb used to write fake Goal Base data onto every family — stage 3, goal
 *  G1, four routines and six activities — none of which the parent was ever
 *  asked for, and none of which anything measured. It existed only so Goal Base's
 *  screens wouldn't crash on a null.
 *
 *  Goal Base is now off (GOAL_BASE_ENABLED), so nothing reads those columns. They
 *  are left NULL for Preverb families, which is the truth: this family has no
 *  goal, no curated routines, and above all NO STAGE — the screening cannot
 *  produce one, and a fabricated 3 sitting in a clinical column is exactly the
 *  kind of thing that ends up in an SLT export.
 *
 *  Preverb records its OWN goal/routine/activity — per DAY, snapshotted from the
 *  content, in preverb_day_session. See lib/preverbDb.ts.
 * ────────────────────────────────────────────────────────────────────────── */

/** Malay labels for the A3 buckets — what the legacy `children.age` column shows. */
const AGE_LABELS: Record<string, string> = {
  bawah_12m: "Bawah 12 bulan",
  "1_2": "1 – 2 tahun",
  "2_3": "2 – 3 tahun",
  "3_4": "3 – 4 tahun",
  lain: "Lain-lain",
}

export interface PilotOnboardingRecord {
  childId: string
  anak: string
  panggilan: string
  variant: "A" | "B" | "C"
  flags: string[]
  onboardedAt: string
}

/**
 * Persist a completed A1–A14. Returns the child_id.
 *
 * Ordering matters: the child row must exist before screening/confidence can
 * reference it. Each step is awaited and checked — a half-written onboarding is
 * worse than a failed one, because the parent would land on a dashboard whose
 * scripts have no {anak} to say.
 */
export async function savePilotOnboarding(
  r: OnboardingResult
): Promise<{ ok: true; childId: string } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return { ok: false, error: "not_signed_in" }

  // 1 ── Identity → the vault. Names never touch the clinical store.
  const otherTexts: Record<string, string> = {}
  if (r.childAgeOther) otherTexts.child_age = r.childAgeOther
  if (r.homeLanguageOther) otherTexts.home_language = r.homeLanguageOther
  if (r.diagnosisOther) otherTexts.diagnosis = r.diagnosisOther
  if (r.relationship === "lain") otherTexts.panggilan = r.panggilan

  const { error: vaultErr } = await supabase.rpc("save_family_identity", {
    p_parent_name: r.parentName,
    p_child_nickname: r.anak,
    p_other_texts: otherTexts,
  })
  if (vaultErr) return { ok: false, error: `vault: ${vaultErr.message}` }

  // 2 ── Guardian row. `relationship` and the age BUCKET are not identifying.
  // Goal Base columns (primary_goal / routines / activities) are deliberately
  // NOT written. A Preverb family has none of those things.
  const { error: profErr } = await supabase.from("profiles").upsert({
    id: uid,
    guardian_name: r.parentName, // legacy column — ProfileView still reads it
    relationship: r.relationship,
    guardian_age: r.parentAge,
    updated_at: new Date().toISOString(),
  })
  if (profErr) return { ok: false, error: `profile: ${profErr.message}` }

  // 3 ── Child row. Reuse an existing child if the parent is re-running
  //      onboarding, so we don't orphan their history behind a new child_id.
  const { data: existing } = await supabase
    .from("children")
    .select("id")
    .eq("guardian_id", uid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const childRow = {
    guardian_id: uid,
    name: r.anak, // legacy column, kept in sync so ProfileView/admin still work
    age: AGE_LABELS[r.childAge] ?? r.childAge,
    age_bucket: r.childAge,
    panggilan: r.panggilan,
    // What the child HEARS at home — a clinical input, not a UI preference.
    home_language: r.homeLanguage,
    // stage / primary_goal / routines / activities are Goal Base columns and stay
    // NULL. The screening cannot produce a stage; inventing one would be fiction.
    profiled_at: new Date().toISOString().slice(0, 10),
    onboarded_at: new Date().toISOString(),
  }

  let childId = existing?.id as string | undefined
  if (childId) {
    const { error } = await supabase.from("children").update(childRow).eq("id", childId)
    if (error) return { ok: false, error: `child: ${error.message}` }
  } else {
    const { data, error } = await supabase
      .from("children")
      .insert(childRow)
      .select("id")
      .single()
    if (error) return { ok: false, error: `child: ${error.message}` }
    childId = data.id as string
  }

  // 4 ── Screening. APPENDED, never updated — day 0 is the baseline, and the
  //      D7/D14 re-screens add their own rows so the trajectory survives.
  const { error: screenErr } = await supabase.from("screening_baseline").insert({
    child_id: childId,
    guardian_id: uid,
    q1: r.screening.q1,
    q2: r.screening.q2,
    q3: r.screening.q3,
    q4: r.screening.q4,
    q5: r.screening.q5, // null when the child is <12 months — meaningful, not missing
    q6_diagnosis: r.screening.q6,
    flags: r.flags,
    variant: r.variant,
    kadang_is_flag: false, // snapshot of the threshold in force (spec §8 item 1)
    day_number: 0,
  })
  if (screenErr) return { ok: false, error: `screening: ${screenErr.message}` }

  // 5 ── Confidence baseline (A14). Upsert: re-running onboarding replaces D0
  //      rather than creating a second "day 0".
  const { error: confErr } = await supabase.from("parent_confidence").upsert(
    {
      child_id: childId,
      guardian_id: uid,
      day_number: 0,
      score: r.confidenceD0,
    },
    { onConflict: "child_id,day_number" }
  )
  if (confErr) return { ok: false, error: `confidence: ${confErr.message}` }

  return { ok: true, childId }
}

/**
 * Should the dashboard show the SLT recommendation? (spec §5.1)
 *
 * Reads the LATEST screening, not the day-0 baseline — the D7/D14 re-screens
 * append new rows (spec §5.12), and the newest one is the truth. So:
 *
 *   · re-screen still flags  → a NEW recommendation, made on new evidence.
 *     A prior dismissal doesn't silence it; it has earned the right to be seen.
 *   · re-screen comes back clear → variant A → the banner is gone for good.
 *
 * Comparing `dismissed_at` against `taken_at` gives us all of that for free. A
 * boolean "dismissed" flag could not express any of it.
 */
export async function loadSltBanner(): Promise<{ show: boolean; childId: string } | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null

  const { data: child } = await supabase
    .from("children")
    .select("id, slt_banner_dismissed_at")
    .eq("guardian_id", uid)
    .not("onboarded_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!child) return null

  // Newest administration wins — day 14 beats day 7 beats the day-0 baseline.
  const { data: screening } = await supabase
    .from("screening_baseline")
    .select("variant, taken_at")
    .eq("child_id", child.id)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (screening?.variant !== "B") return { show: false, childId: child.id }

  const dismissed = child.slt_banner_dismissed_at
    ? new Date(child.slt_banner_dismissed_at as string)
    : null
  const taken = new Date(screening.taken_at as string)

  return { show: !dismissed || dismissed < taken, childId: child.id }
}

/** Parent closed the banner. It stays closed until the next re-screen flags again. */
export async function dismissSltBanner(childId: string): Promise<void> {
  await supabase
    .from("children")
    .update({ slt_banner_dismissed_at: new Date().toISOString() })
    .eq("id", childId)
}

/**
 * Has this parent finished A1–A14, and what did it produce?
 *
 * `null` = they haven't (or they only completed the OLD onboarding, which has no
 * screening row). The caller routes them into onboarding.
 */
export async function loadPilotOnboarding(): Promise<PilotOnboardingRecord | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null

  const { data: child } = await supabase
    .from("children")
    .select("id, panggilan, onboarded_at")
    .eq("guardian_id", uid)
    .not("onboarded_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!child?.onboarded_at) return null

  // The nickname lives in the vault — the clinical store must not be the source
  // of truth for it, even though a legacy copy sits in `children.name`.
  const { data: identity } = await supabase.rpc("get_family_identity")
  const anak = identity?.[0]?.child_nickname ?? ""

  const { data: screening } = await supabase
    .from("screening_baseline")
    .select("variant, flags")
    .eq("child_id", child.id)
    .eq("day_number", 0)
    .maybeSingle()

  return {
    childId: child.id,
    anak,
    panggilan: child.panggilan ?? "Ibu",
    variant: (screening?.variant as "A" | "B" | "C") ?? "A",
    flags: (screening?.flags as string[]) ?? [],
    onboardedAt: child.onboarded_at,
  }
}
