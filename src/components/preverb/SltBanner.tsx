/* ========================================================================== *
 *  SLT recommendation — the dashboard's quiet open door.
 *
 *  TONE IS THE WHOLE JOB HERE. This is shown to a parent whose child's screening
 *  flagged a concern, EVERY time she opens the app. Get it wrong and she either
 *  dreads the dashboard or leaves.
 *
 *  So, deliberately:
 *
 *    · NOT a warning. No red, no amber, no alert icon, no "tindakan diperlukan".
 *      A destructive-coloured banner would turn every app-open into a reminder
 *      that something may be wrong with her child. It is styled as a soft resource
 *      card, in the app's own violet.
 *
 *    · NOT above the day's card. She opens Tutur to DO today's activity — that is
 *      the hero, and it stays the hero. This sits underneath, patiently.
 *
 *    · Framed as an offer, not a verdict. "Nak jumpa…?" — a question she can say
 *      no to — rather than "your child was flagged". She already knows something
 *      might be wrong; that is why she downloaded a speech app. This isn't news to
 *      her. It's a door she can walk through when she's ready.
 *
 *    · Dismissable, and it STAYS dismissed — until a D7/D14 re-screen flags again,
 *      which is a genuinely new claim on new evidence. See 0013_slt_banner.sql.
 * ========================================================================== */

import { useState } from "react"
import { HeartHandshake, X } from "lucide-react"

import { Card } from "@/components/ui/card"
import { useLang } from "@/lib/i18n"

/**
 * The SLT we point families to. A single vetted recommendation rather than a
 * search — "find one yourself" is not much help to a parent who has just been
 * told her child may need assessing.
 */
const SLT_MAP_URL = "https://maps.app.goo.gl/nBHofFR5vRSDv5p5A"

const STR = {
  ms: {
    title: "Nak jumpa Ahli Terapi Pertuturan?",
    body: "Penilaian SLT boleh membantu anda memahami keperluan anak dengan lebih jelas. Tiada tergesa-gesa — pintu ini sentiasa terbuka bila anda sedia.",
    cta: "SLT Pilihan Kami",
    dismiss: "Tutup",
  },
  en: {
    title: "Would you like to see a Speech Therapist?",
    body: "An SLT assessment can help you understand your child's needs more clearly. There's no rush — this door stays open for whenever you're ready.",
    cta: "Our Recommended SLT",
    dismiss: "Dismiss",
  },
} as const

export function SltBanner({ onDismiss }: { onDismiss: () => void }) {
  const { lang } = useLang()
  const s = STR[lang]

  // Hide immediately on tap; the write is fire-and-forget. Making her watch a
  // spinner to close a banner about her child would be its own small insult.
  const [closed, setClosed] = useState(false)
  if (closed) return null

  return (
    <Card className="relative border-primary/25 bg-[hsl(var(--primary)/0.04)] p-4 pr-10">
      <button
        type="button"
        onClick={() => {
          setClosed(true)
          onDismiss()
        }}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3">
        {/* A supportive icon, not a medical one. No stethoscope. */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.10)]">
          <HeartHandshake className="size-[18px] text-primary" />
        </span>

        <div className="min-w-0">
          <p className="font-display text-sm font-bold leading-snug text-foreground">
            {s.title}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {s.body}
          </p>

          {/* A link, not a button. A filled CTA competes with "Mula aktiviti"
              above it — and today's activity is what she came here to do.

              A real <a>, not a window.open(): it long-presses, it opens in the
              Google Maps app on a phone rather than a browser tab, and it works
              if popups are blocked. `noreferrer` keeps the referrer off it. */}
          <a
            href={SLT_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-block text-[13px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            {s.cta} →
          </a>
        </div>
      </div>
    </Card>
  )
}
