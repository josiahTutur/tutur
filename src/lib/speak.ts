/* ========================================================================== *
 *  speak — hear the line, not just read it.
 *
 *  ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *  The mode is called "Skrip & NADA" — script and TONE. Half of it was missing.
 *  The whole technique in these CCS prompts is HOW the sentence is said: the
 *  sing-song of "Barbie jalan, jalan", the deliberate hang of "Nak Barbie?"
 *  before the five-second wait, the lift on "MERAH… ke… BIRU?". A parent who has
 *  never heard a speech therapist do this cannot get it off a page, and printed
 *  words are exactly where tone goes to die.
 *
 *  ── WHAT IS SPOKEN, AND WHAT IS NOT ───────────────────────────────────────
 *  The content mixes speech with stage directions:
 *
 *    CCS2: "Nak Barbie?" [tunggu 5s, hulur tapi tahan]
 *           ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           she says this  she DOES this
 *
 *  Reading the brackets aloud would have Maya solemnly instructing the child to
 *  "tunggu lima saat, hulur tapi tahan". So `spokenPart()` strips them, and only
 *  the words meant to leave her mouth are voiced.
 *
 *  ── VOICE: ms-MY-YasminNeural ─────────────────────────────────────────────
 *  Pre-generated with edge-tts (`node scripts/gen-preverb-voice.mjs`) — the same
 *  warm Malaysian-Malay voice the AAC board uses. The browser's own
 *  speechSynthesis is only the fallback now: on a phone with no Malay voice
 *  installed it reads Malay with an English accent, which is worse than useless
 *  on a screen whose whole purpose is to model tone.
 *
 *  ⚠ THE CLIP IS GENERIC; THE SCREEN IS PERSONALISED.
 *  The lines carry {panggilan} / {anak}, and pre-generated audio cannot know the
 *  child is called Adam. So the clip voices the SLT document's own wording —
 *  "Ibu ambil Barbie", "Adik rasa?" — while the parent READS her personalised
 *  line. It is a demonstration of TONE, not a read-aloud of her sentence, and the
 *  button is labelled "Dengar nada" so it cannot pretend otherwise.
 *
 *  Which is also why lookup is keyed on the RAW config line, not on the resolved
 *  text: "Adam rasa?" and "Aisyah rasa?" are the same clip.
 * ========================================================================== */

import VOICE_MANIFEST from "@/content/preverb/voice-manifest.json"

/** Strip stage directions. `"Nak Barbie?" [tunggu 5s]` → `Nak Barbie?`
 *  MUST stay in step with the copy in scripts/gen-preverb-voice.mjs. */
export function spokenPart(line: string): string {
  return line
    .replace(/\[[^\]]*\]/g, " ") // [tunggu 5s, hulur tapi tahan]
    .replace(/\([^)]*\)/g, " ") // (senyum, tunggu 3 saat)
    .replace(/["“”]/g, " ") // the quotes that marked it as speech
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The Yasmin clip for a raw config line, if one has been generated.
 *
 * Keyed on the RAW line (tokens and stage directions intact), because that is
 * what the generator hashed. Falls to null for any line not yet voiced, and the
 * caller drops to browser TTS.
 */
function clipFor(rawLine: string | undefined): string | null {
  if (!rawLine) return null
  const file = (VOICE_MANIFEST as Record<string, string>)[rawLine]
  return file ? `/audio/preverb/${file}` : null
}

let current: SpeechSynthesisUtterance | null = null
let currentAudio: HTMLAudioElement | null = null

/** True if the browser can speak at all. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

/** The best Malay voice available, or null if the device has none. */
function malayVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === "ms-MY") ??
    voices.find((v) => v.lang.startsWith("ms")) ??
    voices.find((v) => v.lang.startsWith("id")) ?? // Indonesian: far closer than English
    null
  )
}

/** Stop whatever is currently being said — clip or synthesised. */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  current = null
}

/**
 * Say a line aloud. Resolves when it finishes (or immediately if it cannot).
 *
 * `text` is what the parent sees (personalised); `rawLine` is the config line the
 * clip was generated from. Pass both — the clip is looked up by `rawLine`, and
 * `text` is only used if we have to fall back to the browser voice.
 *
 * Speaking always CANCELS whatever came before it. Two voices talking over each
 * other is not a feature, and a parent tapping down a list of CCS prompts would
 * otherwise queue up all four.
 */
export function speak(text: string, rawLine?: string): Promise<void> {
  const spoken = spokenPart(text)
  stopSpeaking()

  const clip = clipFor(rawLine ?? text)
  if (clip) {
    return new Promise((resolve) => {
      const audio = new Audio(clip)
      currentAudio = audio
      const done = () => {
        currentAudio = null
        resolve()
      }
      audio.onended = done
      audio.onerror = done
      void audio.play().catch(done)
    })
  }

  if (!spoken || !canSpeak()) return Promise.resolve()

  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(spoken)
    utter.lang = "ms-MY"
    const v = malayVoice()
    if (v) utter.voice = v
    // Slower than default. This is child-directed speech — the pauses ARE the
    // technique, and a brisk read of "Barbie… jalan… jalan" teaches the opposite
    // of what the line is for.
    utter.rate = 0.85
    utter.pitch = 1.05
    utter.onend = () => {
      current = null
      resolve()
    }
    utter.onerror = () => {
      current = null
      resolve()
    }
    current = utter
    window.speechSynthesis.speak(utter)
  })
}

/** Is anything being spoken right now? */
export function isSpeaking(): boolean {
  if (currentAudio) return true
  return canSpeak() && window.speechSynthesis.speaking && current !== null
}

/** True if we can voice this line at all — a real clip, or a browser voice. */
export function canSpeakLine(rawLine?: string): boolean {
  return clipFor(rawLine) !== null || canSpeak()
}
