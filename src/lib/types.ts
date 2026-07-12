/**
 * Shared app-level data shapes.
 *
 * `Profile` captures everything collected during sign-in + AI profiling. While
 * the product is pre-backend it's assembled in `App` and handed to the hub; the
 * "Langkau" demo shortcut fills it with a fixed default so other features can
 * be built without walking through onboarding each time.
 */
export interface Profile {
  childName: string
  childAge: string
  guardianName: string
  relationship: string
  guardianAge: string
  /**
   * {panggilan} — what the child actually CALLS this parent ("Ibu", "Nenek",
   * or something custom like "Mak Long"). Spoken aloud in every 14-day activity
   * script, so it can't be derived from `relationship`: a "Lain-lain" parent
   * types their own.
   */
  panggilan?: string
  /** Communication stage 1–5 from the profiling analysis. */
  stage: number
  email: string
  /** ISO date the child was profiled at sign-up (drives the "profiled on" label). */
  profiledAt: string
}
