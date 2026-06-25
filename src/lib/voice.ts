/* ========================================================================== *
 *  AAC voice preference — which Malay voice the daily-activity Papan AAC uses.
 *
 *  Two edge-tts voices were pre-generated under
 *    public/audio/activities/aac/<voice>/<slug>.mp3
 *  This module is the single source of truth for the chosen voice, persisted in
 *  localStorage so both the Settings picker and the board playback agree.
 *  (The main 48-word Papan AAC is unaffected — it has its own audio.)
 * ========================================================================== */

export type AacVoice = "female" | "male"

const KEY = "tutur:aac-voice"
const DEFAULT: AacVoice = "female"

/** Display metadata for the Settings picker. */
export const AAC_VOICE_OPTIONS: {
  id: AacVoice
  label: string
  description: string
}[] = [
  { id: "female", label: "Perempuan", description: "Suara wanita, mesra" },
  { id: "male", label: "Lelaki", description: "Suara lelaki, tenang" },
]

/** Current voice (defaults to female). Safe outside the browser. */
export function getAacVoice(): AacVoice {
  if (typeof localStorage === "undefined") return DEFAULT
  return localStorage.getItem(KEY) === "male" ? "male" : DEFAULT
}

/** Persist the chosen voice. */
export function setAacVoice(voice: AacVoice): void {
  try {
    localStorage.setItem(KEY, voice)
  } catch {
    /* ignore (private mode / unavailable storage) */
  }
}
