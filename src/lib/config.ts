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
