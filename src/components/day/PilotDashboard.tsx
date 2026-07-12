/* ========================================================================== *
 *  DASH · Dashboard — the app's home. Today's card is the primary CTA.
 *
 *  Framing rules enforced here (spec §1.3), because they're easy to break:
 *    · never "14 hari selesai" as an end state — this is "Fasa Asas"
 *    · the PARENT's progress (leading) is shown BEFORE the child's (lagging)
 *    · no age norms, no comparison to other children — ever
 *
 *  NOT BUILT YET:
 *    · T1–T4 tour + the toy picker (T3) — the toy gate that Day 1 needs
 *    · day unlock state — there are no day_session rows, so "locked" is faked
 *    · PROG / ITEMS / HELP / SET destinations
 * ========================================================================== */

import { Lock, Sparkles, Stethoscope, X } from "lucide-react"
import { useState } from "react"

import { MayaBubble } from "@/components/day/TodayCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TOTAL_DAYS } from "@/content/days"
import { type AnyDayConfig } from "@/lib/dayConfig"
import { interpolate, type Vars } from "@/lib/interpolate"
import { type ResultVariant } from "@/lib/screening"
import { cn } from "@/lib/utils"

export function PilotDashboard({
  vars,
  variant,
  today,
  authoredDays,
  onStartDay,
}: {
  vars: Vars
  variant: ResultVariant
  /** The day config the parent is on. Undefined = not authored yet. */
  today: AnyDayConfig | undefined
  /** Which day numbers actually have content. Days 2–14 aren't extracted yet. */
  authoredDays: number[]
  onStartDay: () => void
}) {
  // Variant B persists a dismissable SLT banner; it returns after the weekly
  // re-screen if the flags are still there (spec §5.1). Dismissal is per-session
  // here — there is nowhere to persist it yet.
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const say = (s: string) => interpolate(s, vars)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header>
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
          Fasa Asas · 14 hari pertama
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
          Hai, {vars.panggilan}
        </h1>
      </header>

      {variant === "B" && !bannerDismissed && (
        <Card className="relative border-destructive/30 bg-destructive/5 p-4 pr-10">
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
            <Stethoscope className="size-4" />
            Penilaian SLT disyorkan
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Program ini melengkapkan terapi — bukan menggantikannya. Anda tetap boleh teruskan.
          </p>
        </Card>
      )}

      {variant === "C" && (
        <Card className="border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-foreground">
            <Stethoscope className="size-4 text-primary" />
            Guna bersama terapi {vars.anak}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Kongsikan tracker anda dengan SLT pada setiap sesi.
          </p>
        </Card>
      )}

      <MayaBubble>
        {today
          ? `Kad hari anda dah sedia. Satu aktiviti, 15 minit, dalam rutin biasa.`
          : `Hari ini belum ada kandungan lagi.`}
      </MayaBubble>

      {/* TODAY — the primary CTA. Everything else on this screen is secondary. */}
      {today ? (
        <Card className="overflow-hidden border-primary/40">
          <div className="bg-primary/10 px-5 py-3">
            <p className="font-display text-xs font-semibold uppercase tracking-wide text-primary">
              Hari {today.day_number} · Hari ini
            </p>
          </div>
          <div className="p-5">
            <h2 className="font-display text-lg font-bold leading-tight text-foreground">
              {say(today.title)}
            </h2>
            {today.kind === "activity" && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {say(today.focus_line)}
              </p>
            )}
            <Button size="lg" className="mt-4 w-full" onClick={onStartDay}>
              Mula aktiviti
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-destructive/30 bg-destructive/5 p-5 text-sm text-muted-foreground">
          Day config tiada.
        </Card>
      )}

      {/* PARENT lane first — leading indicator before lagging (spec §1.3). */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kemajuan anda
        </p>
        <Card className="flex items-center gap-3 p-4">
          <Sparkles className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Belum bermula</p>
            <p className="text-xs text-muted-foreground">
              Perubahan ANDA dulu — {vars.anak} akan menyusul.
            </p>
          </div>
        </Card>
      </section>

      {/* The 14 days. Sequential unlock — but with no day_session rows, "unlocked"
          currently just means "authored". This is a stand-in, not the real gate. */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          14 hari
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((n) => {
            const authored = authoredDays.includes(n)
            const isToday = today?.day_number === n
            return (
              <div
                key={n}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold",
                  isToday
                    ? "border-primary bg-primary text-primary-foreground"
                    : authored
                      ? "border-border bg-card text-foreground"
                      : "border-border bg-muted text-muted-foreground"
                )}
              >
                {authored ? n : <Lock className="size-3" />}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Hari 2–14 belum diekstrak dari PDF kandungan.
        </p>
      </section>

      <Card className="border-dashed p-4">
        <p className="text-xs font-semibold text-foreground">Belum dibina</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Tour T1–T4 (termasuk pemilih mainan) · Senarai barang · Kemajuan · Tetapan.
          Tiada apa-apa disimpan — tiada pangkalan data lagi.
        </p>
      </Card>
    </div>
  )
}
