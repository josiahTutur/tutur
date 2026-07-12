/* ========================================================================== *
 *  Onboarding draft — resume-on-refresh, persisted server-side.
 *
 *  Deliberately NOT localStorage. The answers include the child's nickname, the
 *  parent's name and the screening responses; localStorage would keep all of it
 *  in plaintext on the device long after the session expires. A server draft is
 *  tied to the account, dies with it, and resumes across devices.
 *
 *  It writes to TWO places, because the data is two different kinds of thing
 *  (spec §3.1):
 *
 *    identity_vault  ← nickname, parent name, every "Lain-lain" free text
 *    onboarding_draft ← age buckets, relationship, screening, confidence, step
 *
 *  See supabase/migrations/0012_onboarding_draft.sql.
 * ========================================================================== */

import { supabase } from "@/lib/supabase"
import {
  type ChildAgeBucket,
  type Diagnosis,
  type ParentAgeBucket,
  type Relationship,
  type ScreeningAnswer,
} from "@/lib/screening"

/** The non-identifying half. Safe to sit in the clinical store. */
export interface DraftAnswers {
  childAge?: ChildAgeBucket
  relationship?: Relationship
  parentAge?: ParentAgeBucket
  q1?: ScreeningAnswer
  q2?: ScreeningAnswer
  q3?: ScreeningAnswer
  q4?: ScreeningAnswer
  q5?: ScreeningAnswer
  q6?: Diagnosis
  confidence?: number
}

/**
 * The identifying half. Lives in the vault, reached only via RPC.
 *
 * Every "Lain-lain" the parent typed belongs here, not in the clinical store —
 * free text may contain names, so it is quasi-identifying (spec §3.1).
 */
export interface DraftIdentity {
  anak?: string
  parentName?: string
  childAgeOther?: string
  panggilanOther?: string
  parentAgeOther?: string
  diagnosisOther?: string
}

export interface Draft {
  step: string
  answers: DraftAnswers
  identity: DraftIdentity
}

/* -------------------------------------------------------------------------- */

/**
 * Write the draft. Fire-and-forget: a failed draft save must never block the
 * parent mid-questionnaire — the worst case is they lose resume, not progress.
 *
 * Two round-trips, and only when there is identity to write.
 */
export async function saveDraft(
  step: string,
  answers: DraftAnswers,
  identity: DraftIdentity
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return

  const otherTexts: Record<string, string> = {}
  if (identity.childAgeOther) otherTexts.child_age = identity.childAgeOther
  if (identity.panggilanOther) otherTexts.panggilan = identity.panggilanOther
  if (identity.parentAgeOther) otherTexts.parent_age = identity.parentAgeOther
  if (identity.diagnosisOther) otherTexts.diagnosis = identity.diagnosisOther

  const hasIdentity =
    identity.anak || identity.parentName || Object.keys(otherTexts).length > 0

  await Promise.all([
    supabase.from("onboarding_draft").upsert({
      guardian_id: uid,
      step,
      answers,
      updated_at: new Date().toISOString(),
    }),
    // The RPC is partial-safe (0012): nulls mean "leave alone", not "erase".
    hasIdentity
      ? supabase.rpc("save_family_identity", {
          p_parent_name: identity.parentName ?? null,
          p_child_nickname: identity.anak ?? null,
          p_other_texts: otherTexts,
        })
      : Promise.resolve(),
  ])
}

/** Read the draft back, reassembling both halves. `null` = nothing in progress. */
export async function loadDraft(): Promise<Draft | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) return null

  const { data: row } = await supabase
    .from("onboarding_draft")
    .select("step, answers")
    .eq("guardian_id", auth.user.id)
    .maybeSingle()

  if (!row?.step) return null

  const { data: ident } = await supabase.rpc("get_family_identity")
  const v = ident?.[0] as
    | { parent_name: string | null; child_nickname: string | null; other_texts: Record<string, string> }
    | undefined
  const other = v?.other_texts ?? {}

  return {
    step: row.step as string,
    answers: (row.answers ?? {}) as DraftAnswers,
    identity: {
      anak: v?.child_nickname ?? undefined,
      parentName: v?.parent_name ?? undefined,
      childAgeOther: other.child_age,
      panggilanOther: other.panggilan,
      parentAgeOther: other.parent_age,
      diagnosisOther: other.diagnosis,
    },
  }
}

/**
 * Drop the draft once onboarding completes.
 *
 * The vault row is NOT cleared — the nickname and parent name are real,
 * durable data now (every activity script says them). Only the transient
 * questionnaire state goes.
 */
export async function clearDraft(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) return
  await supabase.from("onboarding_draft").delete().eq("guardian_id", auth.user.id)
}
