import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import ParticleFace from "@/components/ParticleFace"
import ParticleMessages from "@/components/ParticleMessages"

const LINES = [
  "Setiap mak ada saat ini",
  "Anak dah pergi therapy",
  "Tapi balik rumah… langkah yang seterusnya apa",
  "Therapy 1 jam seminggu, yang lain 167 jam — di rumah.",
  "Tutur tunjuk caranya, saat demi saat.",
]

// Maya's greeting, typed out over the same window the face assembles in.
const GREETING = "Hai, saya Maya AI"
const GREETING_DURATION = 3000
// Pause after the greeting finishes before the story begins.
const STORY_DELAY = 700

export default function Intro({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  /** Top-right "Log Masuk" — goes straight to the sign-in page. */
  onSkip: () => void
}) {
  // The face assembles first, then the messages begin cycling above it.
  const [storyStarted, setStoryStarted] = useState(false)
  const [storyDone, setStoryDone] = useState(false)
  // Typewriter — types Maya's greeting in step with the face assembling.
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    if (typed >= GREETING.length) return
    const id = setTimeout(
      () => setTyped((t) => t + 1),
      GREETING_DURATION / GREETING.length
    )
    return () => clearTimeout(id)
  }, [typed])

  // The story begins only after the greeting has finished typing.
  useEffect(() => {
    if (typed < GREETING.length) return
    const id = setTimeout(() => setStoryStarted(true), STORY_DELAY)
    return () => clearTimeout(id)
  }, [typed])

  return (
    <main className="relative flex min-h-screen flex-col px-7 pb-10 pt-12">
      {/* Brand mark + sign-in */}
      <div className="mb-6 flex animate-fade-in items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl glass-strong shadow-glow-cyan">
            <span className="text-lg font-bold text-gradient">T</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Tutur</span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full glass px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          Log Masuk
        </button>
      </div>

      {/* Story particles above the persistent portrait */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
        {/* Each line assembles & disperses as particles in this fixed slot.
            Taller than the text so the smoke has room to rise. */}
        <div className="h-44 w-full max-w-md shrink-0 sm:h-48">
          <ParticleMessages
            lines={LINES}
            start={storyStarted}
            onComplete={() => setStoryDone(true)}
            className="h-full w-full"
          />
        </div>

        {/* Maya's portrait — assembles from particles, then stays put */}
        <div className="h-[42vh] w-full max-w-sm">
          <ParticleFace className="h-full w-full" />
        </div>

        {/* Maya's greeting — typed out directly below the portrait */}
        <p
          className="mt-2 text-center text-lg font-semibold tracking-tight text-gradient"
          aria-label={GREETING}
        >
          {GREETING.slice(0, typed)}
          {typed < GREETING.length && (
            <span className="ml-0.5 animate-pulse font-normal text-foreground/60">
              |
            </span>
          )}
        </p>
      </div>

      {/* Glowing CTA — fades up after the story has played out */}
      <div
        className={[
          "mt-10 transition-all duration-700",
          storyDone
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
      >
        <Button
          size="lg"
          onClick={onComplete}
          className="shimmer-overlay group w-full animate-pulse-glow rounded-2xl text-base font-semibold"
        >
          Mula dengan Tutur
          <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Percuma untuk bermula · Tiada kad kredit diperlukan
        </p>
      </div>
    </main>
  )
}
