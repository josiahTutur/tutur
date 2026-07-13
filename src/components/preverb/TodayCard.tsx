/* ========================================================================== *
 *  C1 · Today Card — the day's briefing, and its primary CTA.
 *
 *  ── ONE IDEA PER SCREEN ───────────────────────────────────────────────────
 *  This used to be a single scrolling wall: the day, the focus, the skills,
 *  Maya, the mode picker, the prep list, the joy cue and the CTA, all stacked.
 *  A parent had to scroll to find out what she was even being asked to do.
 *
 *  It is now two screens, and neither scrolls on a phone:
 *
 *    1 · PLAN     — Hari N, today's purpose, the focus, the three skills.
 *                   Tap a skill to learn what it actually means.
 *    2 · SEDIAKAN — how you want to learn, and what you need in your hands.
 *
 *  The split is not cosmetic. Screen 1 is "what am I doing today"; screen 2 is
 *  "what do I need before I start". Mixing them meant the parent was choosing a
 *  video format before she knew what the day was for.
 *
 *  PILOT NOTE: gambar and video have no assets yet, so their buttons render as
 *  "Akan datang" and cannot be picked (spec §4 schema rules).
 * ========================================================================== */

import { useState } from "react"
import { ArrowLeft, Check, ChevronDown, Clock, FileText, Image, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SKILLS } from "@/content/preverb/skills"
import { useLang } from "@/lib/i18n"
import { type DayConfig } from "@/lib/preverbConfig"
import { interpolate, type Vars } from "@/lib/interpolate"
import { cn } from "@/lib/utils"

export type LearnMode = "skrip" | "gambar" | "video"

/**
 * Can this mode actually be played today?
 *
 * SKRIP IS ALWAYS READY. It is not an asset waiting to be produced — it IS the
 * content, lifted verbatim from the SLT document, and it ships with the app.
 * `assetsReady` describes the MEDIA (audio, storyboards, video), which does not
 * exist yet; ANDing it across all three modes — as this used to — switched off
 * the one mode we have, and left a parent staring at three dead tiles.
 */
function modeReady(day: DayConfig, mode: LearnMode, assetsReady: boolean): boolean {
  if (mode === "skrip") return true
  if (!assetsReady) return false
  if (mode === "gambar") return (day.learn_content.storyboard_ids?.length ?? 0) > 0
  return Boolean(day.learn_content.video_id)
}

/**
 * ⚠ TEMPORARY. The three toys are hard-coded here rather than read from content.
 *
 * Day 1's `arahan` names them ("[A] Anak patung/Barbie · [B] Masak-masak ·
 * [C] Lego/Blok") but only as prose inside a sentence, so there is nothing to
 * render a checklist from. This list is a stand-in until the toy picker lands
 * with the tutorial, at which point it becomes the family's OWN toys.
 */
const TOYS = ["Anak patung / Barbie", "Masak-masak", "Lego / Blok"]

/*
 * The ticks persist. They are a fact about the HOUSE, not about this visit —
 * the Lego did not stop existing because she backed out to the dashboard.
 *
 * Re-ticking three boxes every single time she opens the day is the kind of small
 * repeated tax that quietly ends a 14-day programme, and it teaches her to tick
 * without reading, which defeats the gate entirely.
 *
 * localStorage, not the database, ON PURPOSE: this list is hard-coded and
 * temporary (see TOYS above). When the tutorial's real toy picker lands, the
 * family's OWN toys get a proper table, and this goes away with them. Writing a
 * migration for a placeholder would be the worse mistake.
 */
const TOYS_KEY = "tutur:preverb:toys"

function loadToys(): string[] {
  try {
    const raw = localStorage.getItem(TOYS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    // Only keep toys that still exist — the list will change, and a stale name
    // must not silently count toward "all three ready".
    return Array.isArray(parsed) ? parsed.filter((x) => TOYS.includes(x as string)) : []
  } catch {
    return []
  }
}

function saveToys(toys: string[]): void {
  try {
    localStorage.setItem(TOYS_KEY, JSON.stringify(toys))
  } catch {
    /* private mode — the ticks just won't persist */
  }
}

const STR = {
  ms: {
    day: (n: number) => `Hari ${n}`,
    focus: "Fokus hari ini",
    skills: "Kemahiran hari ini",
    focusTag: "fokus",
    skillHint: "Ketik untuk faham setiap kemahiran.",
    howToLearn: "Cara belajar",
    comingSoon: "Akan datang",
    prepare: "Sediakan",
    toysHint: "Tanda ketiga-tiga mainan sebelum mula.",
    toysMissing:
      "Sediakan ketiga-tiga mainan dahulu. Aktiviti hari ini ialah PILIHAN — tanpa tiga pilihan sebenar, tiada apa yang boleh dipilih.",
    duration: "Kira-kira 15 minit",
    next: "Seterusnya",
    start: "Mula aktiviti",
    modes: { skrip: "Skrip & nada", gambar: "Gambar", video: "Video" },
  },
  en: {
    day: (n: number) => `Day ${n}`,
    focus: "Today's focus",
    skills: "Today's skills",
    focusTag: "focus",
    skillHint: "Tap to understand each skill.",
    howToLearn: "How to learn",
    comingSoon: "Coming soon",
    prepare: "What to prepare",
    toysHint: "Tick all three toys before you start.",
    toysMissing:
      "Get all three toys ready first. Today's activity is a CHOICE — without three real options, there is nothing to choose between.",
    duration: "About 15 minutes",
    next: "Next",
    start: "Start activity",
    modes: { skrip: "Script & tone", gambar: "Pictures", video: "Video" },
  },
} as const

const MODE_ICONS: Record<LearnMode, typeof FileText> = {
  skrip: FileText,
  gambar: Image,
  video: Play,
}
const MODE_IDS: LearnMode[] = ["skrip", "gambar", "video"]

export function TodayCard({
  day,
  vars,
  assetsReady,
  onStart,
  onExit,
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
  /** Leave the day and go back to the dashboard. */
  onExit: () => void
}) {
  const [step, setStep] = useState(1)
  // Skrip is the default because it is the only mode that exists — gambar and
  // video have no assets. Making her pick a mode when there is nothing to pick
  // between would be a checkpoint that only ever has one answer.
  const [mode, setMode] = useState<LearnMode>("skrip")
  const [openSkill, setOpenSkill] = useState<string | null>(null)
  const [toys, setToys] = useState<string[]>(loadToys)

  /*
   * The toys are not a shopping list — they are the activity.
   *
   * Day 1 IS "Kenal Pasti Minat": lay three toys down, do not suggest, and record
   * which one the child reaches for. With only two toys on the floor the choice is
   * thinner; with one it does not exist. The interest recorded would then be an
   * artefact of what happened to be in reach, and it is the context for the next
   * thirteen days.
   *
   * So the CTA is NOT disabled — a dead button explains nothing and the parent is
   * left poking at it. It stays live, and tells her why when she taps.
   */
  const toysReady = TOYS.every((toy) => toys.includes(toy))
  const [showToyWarning, setShowToyWarning] = useState(false)

  const { lang } = useLang()
  const t = STR[lang]
  const say = (s: string) => interpolate(s, vars)

  // Back on step 1 leaves the day entirely; on step 2 it goes back a screen.
  const back = () => (step === 1 ? onExit() : setStep(step - 1))

  return (
    // Header and CTA are shrink-0; only the middle band flexes. The parent's
    // thumb should never have to hunt for "Seterusnya".
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-5 py-6">

      {step === 1 ? (
        <>
          {/* CONTENT — top-aligned, flush under the app's top bar. It takes the
              height it needs and no more; the slack falls BELOW it, between the
              content and the CTA, where it simply shrinks to nothing on a short
              phone (iPhone SE) and never pushes the button off-screen. */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {/* Hari N — the week is deliberately not shown. "Minggu 1" is our
              structure, not hers; it tells a parent nothing she can act on. */}
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
              {t.day(day.day_number)}
            </p>
            {/* Routine as the small label, the day's purpose as the headline —
                the same split as the dashboard card, so the two screens agree. */}
            <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {say(day.title)}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold leading-tight text-foreground">
              {say(day.subtitle)}
            </h1>
          </div>

          {/* Focus line — the ONE thing the parent works on today (G1 leading) */}
          <Card className="border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t.focus}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
              {say(day.focus_line)}
            </p>
          </Card>

          {/* KEMAHIRAN HARI INI — the toolkit.
              The SLT document lists SEVERAL techniques in play each day, then
              narrows to ONE that is actually measured. Showing only the focus hid
              the other two from the parent, who is still meant to be USING them —
              they just aren't being graded on them. `focus_skill` marks the graded
              one, so the relationship is visible rather than inferred.

              They are now tappable, because naming a technique at a parent is not
              teaching it. "Withhold & Wait" means nothing until someone tells her
              it means: stop, count to five, and don't rescue. */}
          {day.skills_today.length > 0 && (
            <section>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                {t.skills}
              </p>
              <p className="mb-2.5 text-xs text-muted-foreground">{t.skillHint}</p>
              <div className="space-y-2">
                {day.skills_today.map((skill) => (
                  <SkillRow
                    key={skill}
                    skill={skill}
                    graded={skill === day.focus_skill}
                    focusTag={t.focusTag}
                    open={openSkill === skill}
                    onToggle={() => setOpenSkill(openSkill === skill ? null : skill)}
                  />
                ))}
              </div>
            </section>
          )}

          </div>

          <Footer onBack={back}>
            <Button size="lg" className="flex-1" onClick={() => setStep(2)}>
              {t.next}
            </Button>
          </Footer>
        </>
      ) : (
        <>
          {/* CONTENT — top-aligned, flush under the app's top bar. It takes the
              height it needs and no more; the slack falls BELOW it, between the
              content and the CTA, where it simply shrinks to nothing on a short
              phone (iPhone SE) and never pushes the button off-screen. */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          {/* Mode switcher — a real choice, not a pre-ticked default. */}
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.howToLearn}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MODE_IDS.map((id) => {
                const Icon = MODE_ICONS[id]
                const ready = modeReady(day, id, assetsReady)
                const active = mode === id
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!ready}
                    onClick={() => ready && setMode(id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                      // Anything ready is LIVE — including the one already chosen.
                      // cursor-pointer used to be on `ready && !active` only, so
                      // the selected tile (Skrip, always) had an arrow cursor and
                      // no hover response: it looked as dead as its two greyed-out
                      // neighbours even though it was the only one that worked.
                      ready && "cursor-pointer hover:brightness-105 active:scale-[0.98]",
                      active &&
                        "border-primary bg-primary/10 text-foreground shadow-sm",
                      ready && !active &&
                        "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5",
                      // Not built yet: flat, faded, and it says why.
                      !ready &&
                        "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground opacity-60"
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="text-[11px] font-semibold leading-tight">
                      {t.modes[id]}
                    </span>
                    {!ready && (
                      <span className="text-[9px] font-medium leading-tight text-muted-foreground">
                        {t.comingSoon}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sediakan — what has to be in her hands before she starts. */}
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.prepare}
            </p>
            {day.prep_items.map((item) => (
              <p key={item.item_id} className="text-sm font-semibold text-foreground">
                {say(item.name)}
              </p>
            ))}
            <p className="mb-2.5 mt-1 text-xs text-muted-foreground">{t.toysHint}</p>
            <div className="space-y-2">
              {TOYS.map((toy) => (
                <ToyRow
                  key={toy}
                  toy={toy}
                  checked={toys.includes(toy)}
                  onToggle={() => {
                    setShowToyWarning(false)
                    setToys((prev) => {
                      const next = prev.includes(toy)
                        ? prev.filter((x) => x !== toy)
                        : [...prev, toy]
                      saveToys(next)
                      return next
                    })
                  }}
                />
              ))}
            </div>
          </section>

          </div>

          <div className="mb-3 mt-4 flex shrink-0 items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>{t.duration}</span>
          </div>

          {showToyWarning && !toysReady && (
            <div className="mb-3 shrink-0 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
              <p className="text-[13px] leading-relaxed text-foreground">
                {t.toysMissing}
              </p>
            </div>
          )}

          <Footer onBack={back}>
            {/* NOT `disabled`. A dead button explains nothing — the parent taps it,
                gets silence, and has to guess. This one always responds: tapped
                without the toys ready, it says why. But it must not LOOK like a
                live CTA while it cannot start, or the tap feels like a failure
                rather than an answer. So it dims until the three toys are down. */}
            <Button
              size="lg"
              variant={toysReady ? "default" : "outline"}
              className={cn(
                "flex-1 transition-all",
                !toysReady && "text-muted-foreground"
              )}
              onClick={() => (toysReady ? onStart(mode) : setShowToyWarning(true))}
            >
              {t.start}
            </Button>
          </Footer>
        </>
      )}
    </div>
  )
}

/**
 * The bottom band: back, then the CTA.
 *
 * Back lives HERE and not in a header of its own, because that header was an
 * entire row of chrome holding one small icon — and it pushed the content down
 * and the CTA further toward the fold. Beside the CTA it costs nothing: it is
 * already where the thumb is, next to the button it is the opposite of.
 */
function Footer({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onBack}
        aria-label="Back"
        className="size-11 shrink-0"
      >
        <ArrowLeft className="size-5" />
      </Button>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Rows                                                                      */
/* -------------------------------------------------------------------------- */

/** One skill, tappable, with its explanation sliding open beneath it. */
function SkillRow({
  skill,
  graded,
  focusTag,
  open,
  onToggle,
}: {
  skill: string
  graded: boolean
  focusTag: string
  open: boolean
  onToggle: () => void
}) {
  const explainer = SKILLS[skill]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        graded ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!explainer}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          className={cn(
            "text-sm font-semibold",
            graded ? "text-primary" : "text-foreground"
          )}
        >
          {skill}
        </span>
        {graded && (
          <span className="rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
            {focusTag}
          </span>
        )}
        {explainer && (
          <ChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-500",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Height animation without measuring: the grid ROW is the animated value,
          so it resolves to the text's natural height. `h-0 → h-auto` cannot
          transition, and a max-height cap would make short skills open faster
          than long ones. It stays mounted so it has something to collapse FROM. */}
      {explainer && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "space-y-1.5 px-3 pb-3 text-sm leading-relaxed transition-opacity duration-500",
                open ? "opacity-100" : "opacity-0"
              )}
              inert={!open}
            >
              <p className="text-foreground">{explainer.what}</p>
              <p className="text-muted-foreground">{explainer.how}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** One toy — "do you have this at home?" */
function ToyRow({
  toy,
  checked,
  onToggle,
}: {
  toy: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]",
        checked
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors",
          checked ? "border-primary bg-primary" : "border-border"
        )}
      >
        {checked && (
          <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{toy}</span>
    </button>
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
      {/* A REAL tail, pointing back at her.
          This used to be `rounded-tl-sm` — a squared-off corner, which is a hint
          at a tail, not a tail. Beside an avatar it just reads as a bubble with
          one corner slightly wrong. The tail is a square rotated 45° and tucked
          half behind the bubble, so only its outer corner shows, and it shows its
          LEFT + BOTTOM borders once rotated — a notch that points at Maya. Same
          construction as the FAQ panel, so her voice looks the same everywhere. */}
      <div className="relative rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
        <span
          className="absolute -left-[6px] top-3.5 size-2.5 rotate-45 border-b border-l border-border bg-card"
          aria-hidden
        />
        {children}
      </div>
    </div>
  )
}
