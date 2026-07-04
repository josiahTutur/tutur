import { useEffect, useState } from "react"
import { ArrowRight, Wrench } from "lucide-react"
import { useLang, useT, type Lang } from "@/lib/i18n"
import { MAINTENANCE } from "@/lib/config"
import ParticleFace from "@/components/ParticleFace"
import ParticleMessages from "@/components/ParticleMessages"
import BrandPanel from "@/components/BrandPanel"
import tuturSymbol from "@/assets/brand/tutur-symbol-trim.png"
import tuturWordmark from "@/assets/brand/tutur-wordmark-trim.png"

// Maya's greeting is typed out over the window the face assembles in.
const GREETING_DURATION = 1000

export default function Intro({
  onComplete,
  onSkip,
}: {
  onComplete: () => void
  /** Top-right "Log Masuk" — goes straight to the sign-in page. */
  onSkip: () => void
}) {
  const t = useT()
  const { lang, setLang } = useLang()
  const LINES = t.intro.lines
  const GREETING = t.intro.greeting

  // The story messages, Maya's portrait, and the CTA all appear together from
  // the start — the parent never waits through a sequence before beginning.
  const storyStarted = true
  // The CTA fades in early — while Maya's portrait is still assembling.
  const [ctaReady, setCtaReady] = useState(false)
  // Typewriter — types Maya's greeting in step with the face assembling.
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setCtaReady(true), 700)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (typed >= GREETING.length) return
    const id = setTimeout(
      () => setTyped((t) => t + 1),
      GREETING_DURATION / GREETING.length
    )
    return () => clearTimeout(id)
  }, [typed])

  // Maintenance mode — a focused full-screen takeover: only the poster + a login
  // entry for existing users. Maya, the brand panel and everything else are hidden.
  if (MAINTENANCE) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
        style={{ background: "var(--surface-app)", color: "var(--text-body)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 40% at 50% 30%, var(--violet-50), transparent 72%)",
          }}
        />
        <div className="relative w-full max-w-md">
          <MaintenanceNotice t={t} onLogin={onSkip} />
        </div>
      </main>
    )
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--surface-app)" }}
    >
      {/* Violet brand half (desktop only) */}
      <BrandPanel />

      {/* Action half — Maya + CTA */}
      <main
        className="relative flex min-h-screen flex-1 flex-col overflow-hidden px-7 pb-10 pt-8 lg:px-12"
        style={{ color: "var(--text-body)" }}
      >
        {/* Soft violet calm so the white side never feels clinical */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 40% at 50% 34%, var(--violet-50), transparent 72%)",
          }}
        />

        {/* Borderless top nav — logo lockup (mobile only) + language + sign-in */}
        <nav className="relative flex animate-fade-in items-center">
          {/* Symbol + wordmark, mobile only (desktop uses the BrandPanel logo) */}
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src={tuturSymbol}
              alt=""
              className="h-6 w-auto select-none"
              draggable={false}
            />
            <img
              src={tuturWordmark}
              alt="Tutur"
              className="h-5 w-auto select-none"
              draggable={false}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Language switch — new users can start in their language */}
            <div
              className="flex rounded-full p-0.5 text-[11px] font-semibold"
              style={{ background: "var(--color-brand-subtle)" }}
            >
              {(["ms", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className="rounded-full px-2.5 py-1 transition-colors"
                  style={
                    lang === l
                      ? {
                          background: "var(--color-brand)",
                          color: "var(--color-on-brand)",
                        }
                      : { color: "var(--violet-700)" }
                  }
                >
                  {l === "ms" ? "BM" : "EN"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: "var(--color-brand-subtle)",
                color: "var(--violet-700)",
              }}
            >
              {t.common.signIn}
            </button>
          </div>
        </nav>

        {/* Centered content, capped to a comfortable reading width */}
        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col">
          {/* Story particles above the persistent portrait */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
            {/* Each line assembles & disperses as particles in this fixed slot. */}
            <div className="h-44 w-full max-w-md shrink-0 sm:h-48">
              <ParticleMessages
                lines={LINES}
                start={storyStarted}
                onComplete={() => {}}
                className="h-full w-full"
              />
            </div>

            {/* Maya's portrait — assembles from particles, then stays put */}
            <div className="h-[42vh] w-full max-w-sm">
              <ParticleFace className="h-full w-full" />
            </div>

            {/* Maya's greeting — typed out directly below the portrait */}
            <p
              className="mt-2 text-center text-xl font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                backgroundImage:
                  "linear-gradient(100deg, var(--violet-500), var(--violet-700))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
              aria-label={GREETING}
            >
              {GREETING.slice(0, typed)}
              {typed < GREETING.length && (
                <span
                  className="ml-0.5 animate-pulse font-normal"
                  style={{ color: "var(--violet-300)" }}
                >
                  |
                </span>
              )}
            </p>
          </div>

          {/* CTA — fades in while Maya is still assembling */}
          <div
            className={[
              "mt-8 transition-all duration-700",
              ctaReady
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={onComplete}
              className="shimmer-overlay group flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold transition-transform active:scale-[0.98]"
              style={{
                fontFamily: "var(--font-display)",
                background: "var(--color-brand)",
                color: "var(--color-on-brand)",
                boxShadow: "var(--shadow-brand)",
                letterSpacing: "-0.01em",
              }}
            >
              {t.intro.cta}
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <p
              className="mt-4 text-center text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {t.intro.freeNote}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Maintenance notice — shows the poster at /maintenance.png when present,
 * with a styled fallback if it isn't. The login button stays either way, so
 * existing users can always get in.
 * ------------------------------------------------------------------ */

function MaintenanceNotice({
  t,
  onLogin,
}: {
  t: ReturnType<typeof useT>
  onLogin: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <>
      {imgError ? (
        <div
          className="rounded-3xl border p-5 text-center"
          style={{
            background: "var(--color-brand-subtle)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "var(--surface-card)" }}
          >
            <Wrench
              className="h-6 w-6"
              style={{ color: "var(--color-brand)" }}
            />
          </div>
          <h2
            className="text-base font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-strong)",
            }}
          >
            {t.maintenance.title}
          </h2>
          <p
            className="mx-auto mt-2 max-w-xs text-sm"
            style={{ color: "var(--text-body)" }}
          >
            {t.maintenance.body}
          </p>
        </div>
      ) : (
        <img
          src="/maintenance.png"
          alt={t.maintenance.title}
          onError={() => setImgError(true)}
          className="w-full select-none rounded-3xl"
          draggable={false}
          style={{ boxShadow: "var(--shadow-md)" }}
        />
      )}

      <button
        type="button"
        onClick={onLogin}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-transform active:scale-[0.98]"
        style={{
          fontFamily: "var(--font-display)",
          background: "var(--color-brand)",
          color: "var(--color-on-brand)",
          boxShadow: "var(--shadow-brand)",
        }}
      >
        {t.maintenance.loginCta}
        <ArrowRight className="h-5 w-5" />
      </button>
    </>
  )
}
