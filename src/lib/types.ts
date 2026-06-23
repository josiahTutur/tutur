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
  /** Communication stage 1–5 from the profiling analysis. */
  stage: number
  email: string
}
