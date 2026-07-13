/* ========================================================================== *
 *  App-wide runtime config.
 * ========================================================================== */

/**
 * Maintenance mode — pauses NEW sign-ups while existing users keep full access.
 *
 * When on, the landing shows a maintenance notice instead of the "Start" CTA
 * and the auth screen only allows logging in (the sign-up switch is hidden).
 *
 * IMPORTANT: this is only the UI half. The authoritative block is the Supabase
 * dashboard toggle "Allow new users to sign up" (Authentication → Sign In /
 * Providers) — that also stops NEW Google sign-ups, which the UI can't.
 *
 * Turn on by setting `VITE_MAINTENANCE=true` in your host's env (then redeploy),
 * or a local `.env.local`. Defaults to off.
 */
export const MAINTENANCE =
  (import.meta.env as Record<string, string | undefined>).VITE_MAINTENANCE ===
  "true"

/* ========================================================================== *
 *  GOAL BASE — the legacy activity system, switched off.
 *
 *  Two activity systems exist in this codebase:
 *
 *    · GOAL BASE — pick a GOAL (G1…), pick ROUTINES (R1…), curate ACTIVITIES
 *                  (A1–A6). Browse-and-pick catalogue + AAC board player.
 *                  DB: profiles/children .primary_goal .routines .activities
 *                  .stage, and activity_completions.
 *
 *    · PREVERB   — the 14-day pre-speech programme (parents see "Fasa Asas").
 *                  One card, one day, a scripted player. No picking.
 *                  DB: preverb_* tables.
 *
 *  Goal Base is OFF. Preverb no longer writes its columns — a Preverb family
 *  used to be given a `stage` nobody measured and a goal they never picked, just
 *  so Goal Base's screens wouldn't crash. Those columns are now left NULL, which
 *  is the truth.
 *
 *  Everything Goal Base still owns is gated on this constant, so bringing it back
 *  (or deleting it) is one decision, not a hunt.
 * ========================================================================== */
export const GOAL_BASE_ENABLED = false
