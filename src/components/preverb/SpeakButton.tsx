/* ========================================================================== *
 *  SpeakButton — "dengar nada".
 *
 *  Sits beside any scripted line. Tap to hear it; tap again to stop.
 *
 *  It renders NOTHING when the device cannot speak. A speaker icon that does
 *  nothing when pressed is worse than no icon: the parent concludes the app is
 *  broken, not that her phone lacks a voice.
 * ========================================================================== */

import { useEffect, useState } from "react"
import { Square, Volume2 } from "lucide-react"

import { useLang } from "@/lib/i18n"
import { canSpeakLine, speak, stopSpeaking } from "@/lib/speak"
import { cn } from "@/lib/utils"

const STR = {
  ms: { listen: "Dengar nada", stop: "Berhenti" },
  en: { listen: "Hear the tone", stop: "Stop" },
} as const

export function SpeakButton({
  line,
  rawLine,
  className,
}: {
  /** What the parent SEES — personalised. Used only if we fall back to browser TTS. */
  line: string
  /** The raw config line. The Yasmin clip is keyed on this, tokens and all. */
  rawLine?: string
  className?: string
}) {
  const { lang } = useLang()
  const t = STR[lang]
  const [playing, setPlaying] = useState(false)

  // Never leave a voice talking into an unmounted screen. Closing the CCS drawer
  // mid-sentence must silence it.
  useEffect(() => () => stopSpeaking(), [])

  if (!canSpeakLine(rawLine)) return null

  return (
    <button
      type="button"
      aria-label={playing ? t.stop : t.listen}
      onClick={(e) => {
        e.stopPropagation()
        if (playing) {
          stopSpeaking()
          setPlaying(false)
          return
        }
        setPlaying(true)
        void speak(line, rawLine).then(() => setPlaying(false))
      }}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95",
        playing
          ? "border-primary bg-primary text-primary-foreground"
          : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
        className
      )}
    >
      {playing ? (
        <Square className="size-3 fill-current" />
      ) : (
        <Volume2 className="size-3.5" />
      )}
      {playing ? t.stop : t.listen}
    </button>
  )
}
