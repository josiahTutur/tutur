/* ========================================================================== *
 *  C1 · Today Card — the learning plan, and the day's primary CTA.
 *
 *  No question is asked here. The parent picks HOW they want to learn today
 *  (skrip / gambar / video) and then starts the activity.
 *
 *  PILOT NOTE: gambar and video have no assets yet, so their buttons render as
 *  "Akan datang" and fall back to skrip (spec §4 schema rules). The fallback is
 *  built first ON PURPOSE — it's the path most days will take.
 * ========================================================================== */

import { useState } from "react"
import { Clock, FileText, Image, Play, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { type DayConfig } from "@/lib/dayConfig"
import { interpolate, type Vars } from "@/lib/interpolate"
import { cn } from "@/lib/utils"

export type LearnMode = "skrip" | "gambar" | "video"

/** Which modes actually have assets. Driven by the day's learn_content. */
function modeAvailable(day: DayConfig, mode: LearnMode): boolean {
  if (mode === "skrip") return true // skrip is always available — it IS the content
  if (mode === "gambar") return (day.learn_content.storyboard_ids?.length ?? 0) > 0
  return Boolean(day.learn_content.video_id)
}

const MODES: { id: LearnMode; label: string; icon: typeof FileText }[] = [
  { id: "skrip", label: "Skrip & nada", icon: FileText },
  { id: "gambar", label: "Gambar", icon: Image },
  { id: "video", label: "Video", icon: Play },
]

export function TodayCard({
  day,
  vars,
  assetsReady,
  onStart,
}: {
  day: DayConfig
  vars: Vars
  /**
   * Whether the media assets referenced by `learn_content` actually exist on
   * disk. In the pilot skeleton this is false — no D1–D14 audio/video/storyboards
   * have been produced yet, so every mode but skrip shows "Akan datang".
   */
  assetsReady: boolean
  onStart: (mode: LearnMode) => void
}) {
  const [mode, setMode] = useState<LearnMode>("skrip")
  const say = (s: string) => interpolate(s, vars)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      {/* Header — Hari N · routine */}
      <div>
        <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
          Hari {day.day_number} · Minggu {day.week}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-foreground">
          {say(day.title)}
        </h1>
      </div>

      {/* Focus line — the ONE thing the parent works on today (G1 leading) */}
      <Card className="border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Fokus hari ini
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
          {say(day.focus_line)}
        </p>
      </Card>

      {/* Maya's framing of the day */}
      <MayaBubble>{say(day.sub_goal)}</MayaBubble>

      {/* Mode switcher */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cara belajar
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(({ id, label, icon: Icon }) => {
            const ready = assetsReady && modeAvailable(day, id)
            const active = mode === id
            return (
              <button
                key={id}
                type="button"
                disabled={!ready}
                onClick={() => ready && setMode(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  !ready && "cursor-not-allowed opacity-50 hover:border-border"
                )}
              >
                <Icon className="size-4" />
                <span className="text-[11px] font-semibold leading-tight">{label}</span>
                {!ready && (
                  <span className="text-[9px] font-medium text-muted-foreground">
                    Akan datang
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sediakan — the prep items for today */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sediakan
        </p>
        <ul className="space-y-1.5">
          {day.prep_items.map((item) => (
            <li
              key={item.item_id}
              className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{say(item.name)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Momen seronok — shared enjoyment cue */}
      <Card className="border-neon-cyan/30 bg-neon-cyan/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neon-cyan">
          Momen seronok
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          {say(day.shared_enjoyment)}
        </p>
      </Card>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        <span>Kira-kira 15 minit</span>
      </div>

      <Button size="lg" className="w-full" onClick={() => onStart(mode)}>
        Mula aktiviti
      </Button>
    </div>
  )
}

/** Maya's speech bubble — her voice, distinct from the app's own chrome. */
export function MayaBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <img
        src="/maya.png"
        alt=""
        className="size-8 shrink-0 rounded-full border border-border object-cover"
      />
      <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  )
}
