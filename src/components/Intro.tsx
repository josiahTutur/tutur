import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const LINES = [
  "Setiap mak ada saat ini",
  "Anak dah pergi therapy",
  "Tapi balik rumah… langkah yang seterusnya apa",
  "Therapy 1 jam seminggu, yang lain 167 jam — di rumah.",
  "Tutur tunjuk caranya, saat demi saat.",
]

// Delay before each line reveals (ms). The CTA appears after the last line.
const REVEAL_INTERVAL = 1600

export default function Intro({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  /** Demo shortcut: skip sign-in/profiling and jump to the dashboard. */
  onSkip: () => void
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= LINES.length) return
    const id = setTimeout(() => setVisibleCount((c) => c + 1), REVEAL_INTERVAL)
    return () => clearTimeout(id)
  }, [visibleCount])

  const allRevealed = visibleCount >= LINES.length

  return (
    <main className="relative flex min-h-screen flex-col px-7 pb-10 pt-16">
      {/* Brand mark + demo skip */}
      <div className="mb-12 flex animate-fade-in items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl glass-strong shadow-glow-cyan">
            <span className="text-lg font-bold text-gradient">T</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Tutur</span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full glass px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Langkau →
        </button>
      </div>

      {/* Sequential vertical fade-up text carousel */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="space-y-6">
          {LINES.map((line, i) => {
            const isVisible = i < visibleCount
            const isLast = i === LINES.length - 1
            return (
              <p
                key={i}
                className={[
                  "text-balance text-2xl font-semibold leading-snug tracking-tight transition-opacity",
                  isLast ? "text-gradient text-[1.7rem]" : "text-foreground/90",
                  isVisible ? "animate-fade-up" : "opacity-0",
                ].join(" ")}
                style={{ animationFillMode: "both" }}
                aria-hidden={!isVisible}
              >
                {line}
              </p>
            )
          })}
        </div>
      </div>

      {/* Glowing CTA — fades up only after the full story is told */}
      <div
        className={[
          "mt-12 transition-all duration-700",
          allRevealed
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
