import { useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, Sparkles } from "lucide-react"

/* ------------------------------------------------------------------ *
 * Visual asset placeholders
 * Sleek, self-contained SVG illustrations (no external assets). Each one
 * leans on a soft radial glow that matches the slide's accent colour.
 * ------------------------------------------------------------------ */

function NetworkIllustration() {
  // Slide 1 — a connected network of family & speech loops, cyan glow.
  return (
    <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
      <defs>
        <radialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(187 100% 55%)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="hsl(187 100% 55%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stroke-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(187 100% 70%)" />
          <stop offset="100%" stopColor="hsl(200 100% 60%)" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#glow-cyan)" />

      {/* connection lines */}
      <g stroke="url(#stroke-cyan)" strokeWidth="1.5" strokeOpacity="0.5">
        <line x1="100" y1="100" x2="52" y2="58" />
        <line x1="100" y1="100" x2="150" y2="60" />
        <line x1="100" y1="100" x2="54" y2="146" />
        <line x1="100" y1="100" x2="150" y2="142" />
        <line x1="52" y1="58" x2="150" y2="60" />
        <line x1="54" y1="146" x2="150" y2="142" />
      </g>

      {/* speech-loop nodes */}
      {[
        [52, 58],
        [150, 60],
        [54, 146],
        [150, 142],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill="hsl(240 20% 9%)" stroke="url(#stroke-cyan)" strokeWidth="1.5" />
          <path
            d={`M${x - 5} ${y - 1} q0 -5 6 -5 t6 5 q0 5 -6 5 l-4 3 0.5 -4 q-2.5 -1.5 -2.5 -4`}
            fill="hsl(187 100% 70%)"
            fillOpacity="0.85"
          />
        </g>
      ))}

      {/* central hub */}
      <circle cx="100" cy="100" r="24" fill="hsl(240 22% 8%)" stroke="url(#stroke-cyan)" strokeWidth="2" />
      <circle cx="100" cy="100" r="24" stroke="hsl(187 100% 60%)" strokeOpacity="0.35" strokeWidth="6" />
      <path
        d="M91 100q0 -8 9 -8t9 8q0 8 -9 8l-6 5 1 -6q-4 -2.5 -4 -7z"
        fill="hsl(187 100% 75%)"
      />
    </svg>
  )
}

function MayaIllustration() {
  // Slide 2 — "Maya" AI avatar generating a modular roadmap, purple glow.
  return (
    <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
      <defs>
        <radialGradient id="glow-purple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(270 95% 68%)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="hsl(270 95% 68%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stroke-purple" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(270 95% 78%)" />
          <stop offset="100%" stopColor="hsl(290 90% 65%)" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#glow-purple)" />

      {/* Maya avatar */}
      <g transform="translate(58 44)">
        <circle cx="20" cy="22" r="22" fill="hsl(240 22% 8%)" stroke="url(#stroke-purple)" strokeWidth="2" />
        <circle cx="20" cy="22" r="22" stroke="hsl(270 95% 65%)" strokeOpacity="0.3" strokeWidth="6" />
        {/* friendly face */}
        <circle cx="13" cy="20" r="2.6" fill="hsl(270 95% 80%)" />
        <circle cx="27" cy="20" r="2.6" fill="hsl(270 95% 80%)" />
        <path d="M12 28 q8 7 16 0" stroke="hsl(270 95% 80%)" strokeWidth="2" strokeLinecap="round" />
        {/* antenna spark */}
        <line x1="20" y1="0" x2="20" y2="-9" stroke="url(#stroke-purple)" strokeWidth="2" />
        <circle cx="20" cy="-12" r="3.5" fill="hsl(270 95% 78%)" />
      </g>

      {/* roadmap connector */}
      <path
        d="M78 92 q22 6 22 26 q0 20 22 26 q22 6 22 26"
        stroke="url(#stroke-purple)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        strokeOpacity="0.6"
        fill="none"
      />

      {/* modular target cards */}
      {[
        [70, 104],
        [98, 138],
        [126, 172],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect width="56" height="22" rx="7" fill="hsl(240 20% 9%)" stroke="url(#stroke-purple)" strokeWidth="1.5" />
          <circle cx="12" cy="11" r="4.5" fill="none" stroke="hsl(270 95% 75%)" strokeWidth="1.8" />
          <path d="M9.7 11 l1.6 1.7 l3.1 -3.4" stroke="hsl(270 95% 80%)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="24" y="6" width="26" height="3.4" rx="1.7" fill="hsl(270 60% 70%)" fillOpacity="0.7" />
          <rect x="24" y="13" width="17" height="3.4" rx="1.7" fill="hsl(270 40% 60%)" fillOpacity="0.5" />
        </g>
      ))}
    </svg>
  )
}

function RoutineIllustration() {
  // Slide 3 — phone dashboard with a daily-routine checklist, emerald glow.
  return (
    <svg viewBox="0 0 200 200" fill="none" className="h-full w-full">
      <defs>
        <radialGradient id="glow-emerald" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(158 80% 52%)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="hsl(158 80% 52%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stroke-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(158 80% 62%)" />
          <stop offset="100%" stopColor="hsl(180 75% 55%)" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#glow-emerald)" />

      {/* phone body */}
      <rect x="62" y="34" width="76" height="132" rx="16" fill="hsl(240 22% 8%)" stroke="url(#stroke-emerald)" strokeWidth="2" />
      <rect x="86" y="42" width="28" height="5" rx="2.5" fill="hsl(240 14% 18%)" />

      {/* header pill */}
      <rect x="72" y="56" width="56" height="14" rx="7" fill="hsl(158 50% 40%)" fillOpacity="0.18" />
      <rect x="78" y="61" width="30" height="4" rx="2" fill="hsl(158 80% 62%)" fillOpacity="0.8" />

      {/* checklist rows */}
      {[0, 1, 2].map((i) => {
        const y = 84 + i * 26
        const done = i < 2
        return (
          <g key={i}>
            <rect x="72" y={y} width="56" height="20" rx="6" fill="hsl(240 18% 11%)" stroke="hsl(158 40% 40%)" strokeOpacity="0.35" strokeWidth="1" />
            <circle
              cx="82"
              cy={y + 10}
              r="5.5"
              fill={done ? "hsl(158 80% 45%)" : "none"}
              stroke="url(#stroke-emerald)"
              strokeWidth="1.6"
            />
            {done && (
              <path
                d={`M79.4 ${y + 10} l1.8 1.9 l3.4 -3.8`}
                stroke="hsl(240 22% 8%)"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <rect x="93" y={y + 7} width={done ? 24 : 30} height="3.4" rx="1.7" fill="hsl(158 60% 60%)" fillOpacity={done ? 0.45 : 0.8} />
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Slide data
 * ------------------------------------------------------------------ */

type Glow = "cyan" | "purple" | "emerald"

interface Slide {
  illustration: ReactNode
  title: string
  body: ReactNode
  glow: Glow
}

const SLIDES: Slide[] = [
  {
    illustration: <NetworkIllustration />,
    title: "Apa itu Tutur? 🌐",
    body: (
      <>
        Tutur ialah Aplikasi <strong className="font-semibold text-foreground">Bimbingan Ibu Bapa Peribadi</strong>{" "}
        (Personalized Parent Coaching) untuk sokongan pertuturan &amp; komunikasi,
        dibina khas buat keluarga di Malaysia.
      </>
    ),
    glow: "cyan",
  },
  {
    illustration: <MayaIllustration />,
    title: "Kenapa Memilih Tutur? 🧠",
    body: (
      <>
        Di Tutur, ibu bapa boleh memilih satu matlamat utama pada satu-satu masa.
        AI kami, <strong className="font-semibold text-gradient">Maya</strong>, akan
        membina pelan tindakan intervensi yang diperibadikan sepenuhnya. Ibu bapa
        dibimbing dalam setiap saat, membantu anak berkomunikasi dengan lebih baik
        setiap hari.
      </>
    ),
    glow: "purple",
  },
  {
    illustration: <RoutineIllustration />,
    title: "Cara Mudah Menggunakan Tutur 🚀",
    body: (
      <>
        Hanya log masuk setiap hari, dan kami akan menyediakan aktiviti rutin
        harian yang ringkas dan praktikal mengikut matlamat yang telah anda pilih.{" "}
        <strong className="font-semibold text-foreground">Tiada tekanan, hanya konsistensi.</strong>
      </>
    ),
    glow: "emerald",
  },
]

// Per-slide accent styling kept as static class strings so Tailwind can see them.
const GLOW_RING: Record<Glow, string> = {
  cyan: "shadow-[0_0_60px_-12px_hsl(187_100%_50%/0.5)] ring-cyan-400/20",
  purple: "shadow-[0_0_60px_-12px_hsl(270_95%_65%/0.5)] ring-purple-400/20",
  emerald: "shadow-[0_0_60px_-12px_hsl(158_80%_52%/0.45)] ring-emerald-400/20",
}

const SWIPE_THRESHOLD = 48 // px before a drag counts as a slide change

export default function OnboardingStory({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const isLast = index === SLIDES.length - 1

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)))
  }

  function handleNext() {
    if (isLast) onComplete()
    else goTo(index + 1)
  }

  // Touch swipe — left/right to move between slides.
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(index + (delta < 0 ? 1 : -1))
    touchStartX.current = null
  }

  return (
    <main className="relative flex min-h-screen flex-col px-6 pb-10 pt-14">
      {/* Brand mark */}
      <div className="mb-8 flex animate-fade-in items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl glass-strong shadow-glow-cyan">
          <span className="text-lg font-bold text-gradient">T</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">Tutur</span>
      </div>

      {/* Carousel */}
      <div className="flex flex-1 flex-col justify-center">
        <div
          className="overflow-hidden rounded-3xl"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* sliding track */}
          <div
            className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide, i) => (
              <div key={i} className="w-full shrink-0 px-1">
                <article
                  className={cn(
                    "flex flex-col items-center rounded-3xl glass-strong p-7 text-center ring-1 transition-shadow",
                    GLOW_RING[slide.glow]
                  )}
                >
                  {/* Visual asset placeholder */}
                  <div
                    className={cn(
                      "mb-6 h-44 w-44 transition-opacity duration-500",
                      i === index ? "animate-float opacity-100" : "opacity-60"
                    )}
                  >
                    {slide.illustration}
                  </div>

                  {/* Title + body cross-fade as the active slide settles */}
                  <div
                    key={i === index ? `active-${i}` : `idle-${i}`}
                    className={i === index ? "animate-fade-up" : ""}
                    style={{ animationFillMode: "both" }}
                  >
                    <h2 className="text-balance text-2xl font-bold tracking-tight">
                      {slide.title}
                    </h2>
                    <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-muted-foreground">
                      {slide.body}
                    </p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-7 flex items-center justify-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Pergi ke slaid ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-full transition-all duration-500 ease-out",
                i === index
                  ? "w-7 bg-primary shadow-glow-cyan"
                  : "w-2 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* CTA — morphs into a glowing neon button on the final slide */}
      <div className="mt-10">
        <Button
          size="lg"
          onClick={handleNext}
          className={cn(
            "group w-full rounded-2xl text-base font-semibold transition-all duration-500",
            isLast && "shimmer-overlay animate-pulse-glow"
          )}
        >
          {isLast ? (
            <>
              <Sparkles className="transition-transform duration-300 group-hover:scale-110" />
              Mula Profiling AI
            </>
          ) : (
            <>
              Seterusnya
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </Button>

        {/* Skip — quietly available until the last slide */}
        <button
          type="button"
          onClick={onComplete}
          className={cn(
            "mx-auto mt-4 block text-xs text-muted-foreground underline-offset-4 transition-opacity hover:text-foreground hover:underline",
            isLast && "pointer-events-none opacity-0"
          )}
        >
          Langkau pengenalan
        </button>
      </div>
    </main>
  )
}
