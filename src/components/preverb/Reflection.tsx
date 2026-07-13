/* ========================================================================== *
 *  C15–C18 · Refleksi ibu bapa, and the day's close.
 *
 *  ── THE PARENT IS THE POINT ───────────────────────────────────────────────
 *  The SLT document says it twice: "Refleksi ibu bapa = leading indicator.
 *  Kemajuan anak = lagging indicator." The child may show nothing until Day 7–14.
 *  The parent changes in days, and her change is what causes his. A pilot that
 *  measured ten things about the child and nothing about her would be measuring
 *  the lagging half of its own thesis.
 *
 *  C15  "Hari ini saya sedar…"      four statements, multi-select, none is valid
 *  C16  "Hari ini saya rasa…"       one feeling — "Perlukan bantuan" branches
 *  C17  "Satu momen bermakna…"      free text → identity_vault, optional
 *  C18  celebration                 + tomorrow's preview
 *
 *  ── NOTHING HERE IS SCORED ────────────────────────────────────────────────
 *  Two of the four C15 statements are admissions ("Saya terlalu cepat membantu").
 *  Naming the thing you did is how you stop doing it — so ticking it must never
 *  read as a wrong answer. It is the single most useful thing she can tell us.
 * ========================================================================== */

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, Heart, LifeBuoy, Sparkles } from "lucide-react"

import { MayaBubble } from "@/components/preverb/TodayCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FEELINGS, REFLECTION_STATEMENTS, type Feeling } from "@/content/preverb/reflection"
import { interpolate, type Vars } from "@/lib/interpolate"
import { useLang } from "@/lib/i18n"
import { INTEREST_LABELS, type DayConfig, type Interest } from "@/lib/preverbConfig"
import { type Reflection as ReflectionData } from "@/lib/preverbDb"
import { cn } from "@/lib/utils"

const STR = {
  ms: {
    aware: "Hari ini saya sedar…",
    awareHint: "Pilih apa yang benar. Boleh pilih lebih dari satu — atau tiada langsung.",
    feel: "Hari ini saya rasa…",
    moment: "Satu momen bermakna hari ini?",
    momentHint: "Apa yang {anak} buat, dan apa yang anda rasa. Simpan untuk diri sendiri.",
    momentSkip: "Tiada hari ini",
    next: "Seterusnya",
    finish: "Selesai",
    // C16 support branch
    supportTitle: "Kami dengar.",
    supportBody:
      "Anda tidak gagal. Belajar cara baharu untuk berhubung memang sukar pada mulanya — dan anda muncul setiap hari untuk {anak}.\n\nPasukan Tutur akan hubungi anda. Sementara itu, teruskan esok; tiada apa yang hilang.",
    supportOk: "Terima kasih",
    // C18
    doneTitle: (n: number) => `Hari ${n} selesai`,
    doneMaya:
      "Syabas. Yang anda buat hari ini — tunggu, perhati, ikut dia — itulah kerja sebenar.",
    lagging:
      "Perubahan ANDA datang dahulu. Perubahan {anak} menyusul, selalunya sekitar Hari 7–14.",
    interest: "Minat hari ini",
    interestWhy:
      "Ini konteks untuk Hari 2 hingga Hari 14 — {anak} yang pilih, jadi dia akan lebih fokus. Esok kita guna mainan yang {anak} pilih.",
    close: "Kembali ke dashboard",
  },
  en: {
    aware: "Today I noticed…",
    awareHint: "Pick what's true. More than one is fine — or none at all.",
    feel: "Today I feel…",
    moment: "One meaningful moment today?",
    momentHint: "What {anak} did, and how it felt. This is kept for you.",
    momentSkip: "Not today",
    next: "Next",
    finish: "Done",
    supportTitle: "We hear you.",
    supportBody:
      "You are not failing. Learning a new way of connecting is genuinely hard at first — and you are showing up for {anak} every single day.\n\nThe Tutur team will reach out. In the meantime, carry on tomorrow; nothing is lost.",
    supportOk: "Thank you",
    doneTitle: (n: number) => `Day ${n} complete`,
    doneMaya:
      "Well done. What you did today — waiting, watching, following him — that is the actual work.",
    lagging:
      "YOUR change comes first. {anak}'s follows, usually around Day 7–14.",
    interest: "Today's interest",
    interestWhy:
      "This is the context for Days 2 to 14 — {anak} chose it, so they'll stay with it longer. Tomorrow we use the toy {anak} picked.",
    close: "Back to dashboard",
  },
} as const

type Screen = "aware" | "feel" | "support" | "moment" | "done"

export function Reflection({
  day,
  vars,
  interest,
  onSave,
  onExit,
}: {
  day: DayConfig
  vars: Vars
  /** Day 1's answer — the toy the child reached for. Shown on the closing screen. */
  interest?: Interest
  /** Called once, when the reflection is complete (end of C17). */
  onSave: (r: ReflectionData) => void
  onExit: () => void
}) {
  const { lang } = useLang()
  const t = STR[lang]
  const say = (s: string) => interpolate(s, vars)

  const [screen, setScreen] = useState<Screen>("aware")
  const [statements, setStatements] = useState<string[]>([])
  const [feeling, setFeeling] = useState<Feeling | null>(null)
  const [moment, setMoment] = useState("")

  function finish(text: string) {
    onSave({ statements, feeling, moment: text })
    setScreen("done")
  }

  /* ── C18 · celebration ─────────────────────────────────────────────────── */
  if (screen === "done") {
    return (
      <Frame>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-y-auto py-4 text-center">
          <div className="animate-scale-in">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-8 text-primary" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
              {t.doneTitle(day.day_number)}
            </h1>
          </div>

          <div className="text-left">
            <MayaBubble>{say(t.doneMaya)}</MayaBubble>
            {/* The single most important thing a parent can be told on Day 1 — and
                the reason she comes back on Day 2. Without it, a week of "nothing
                happened" reads as failure and she quits before the child moves.

                It sits directly under Maya's bubble rather than in a card of its
                own: boxed, it read as a separate notice to be skimmed past. As a
                plain line beneath her, it is still her saying it. */}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {say(t.lagging)}
            </p>
          </div>

          {/* THE ANSWER TO DAY 1.
              Day 1 is called "Kenal Pasti Minat", and the child's choice is its
              entire output — the thing that contextualises the next thirteen days.
              Recording it and then never showing it back would leave the parent
              having done the work without ever seeing what it produced. */}
          {interest && day.records_interest && (
            <Card className="border-neon-cyan/30 bg-neon-cyan/5 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">
                {t.interest}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">
                {INTEREST_LABELS[interest][lang]}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {say(t.interestWhy)}
              </p>
            </Card>
          )}

        </div>

        <Button size="lg" className="w-full shrink-0" onClick={onExit}>
          {t.close}
        </Button>
      </Frame>
    )
  }

  /* ── C16b · the support branch ─────────────────────────────────────────── */
  if (screen === "support") {
    return (
      <Frame>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 overflow-y-auto py-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <LifeBuoy className="size-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t.supportTitle}
          </h1>
          {/* She said she needs help. She is NOT handed confetti and moved along —
              the support_trigger is already written, and this screen says so in
              words. A parent ignored by a machine does not ask twice. */}
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {say(t.supportBody)}
          </p>
        </div>

        <Button size="lg" className="w-full shrink-0" onClick={() => setScreen("moment")}>
          {t.supportOk}
        </Button>
      </Frame>
    )
  }

  /* ── C17 · satu momen bermakna ─────────────────────────────────────────── */
  if (screen === "moment") {
    return (
      <Frame>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2">
          <MayaBubble>{t.moment}</MayaBubble>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {say(t.momentHint)}
          </p>
          <textarea
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl border-[1.5px] border-border bg-muted px-4 py-3.5 text-base text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-2">
          <BackButton onClick={() => setScreen(feeling === "perlukan_bantuan" ? "support" : "feel")} />
          {/* "Tiada hari ini" is a real answer. A parent forced to invent a
              meaningful moment to get past this screen is writing fiction. */}
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => finish("")}
          >
            {t.momentSkip}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={!moment.trim()}
            onClick={() => finish(moment)}
          >
            {t.finish}
          </Button>
        </div>
      </Frame>
    )
  }

  /* ── C16 · hari ini saya rasa… ─────────────────────────────────────────── */
  if (screen === "feel") {
    return (
      <Frame>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2">
          <MayaBubble>{t.feel}</MayaBubble>
          <div className="space-y-2.5 pt-1">
            {FEELINGS.map((f) => (
              <Row
                key={f.id}
                label={f.text}
                selected={feeling === f.id}
                icon={f.id === "perlukan_bantuan" ? LifeBuoy : undefined}
                onClick={() => {
                  setFeeling(f.id)
                  window.setTimeout(
                    () => setScreen(f.id === "perlukan_bantuan" ? "support" : "moment"),
                    200
                  )
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-2">
          <BackButton onClick={() => setScreen("aware")} />
          <div className="h-11 flex-1" />
        </div>
      </Frame>
    )
  }

  /* ── C15 · hari ini saya sedar… ────────────────────────────────────────── */
  return (
    <Frame>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-2">
        <MayaBubble>{t.aware}</MayaBubble>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.awareHint}</p>
        <div className="space-y-2.5">
          {REFLECTION_STATEMENTS.map((st) => (
            <Row
              key={st.id}
              label={st.text}
              selected={statements.includes(st.id)}
              square
              onClick={() =>
                setStatements((prev) =>
                  prev.includes(st.id)
                    ? prev.filter((x) => x !== st.id)
                    : [...prev, st.id]
                )
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2">
        <BackButton onClick={onExit} />
        <Button size="lg" className="flex-1" onClick={() => setScreen("feel")}>
          {t.next}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </Frame>
  )
}

/* -------------------------------------------------------------------------- */

/** The two-band shell every day-player screen uses: content top, CTA bottom. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-5 py-4">
      {children}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label="Back"
      className="size-11 shrink-0"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )
}

function Row({
  label,
  selected,
  square = false,
  icon: Icon,
  onClick,
}: {
  label: string
  selected: boolean
  /** Square = multi-select (C15). Round = one-of (C16). */
  square?: boolean
  icon?: typeof Heart
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-all active:scale-[0.99]",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border-[1.5px] transition-colors",
          square ? "rounded-md" : "rounded-full",
          selected ? "border-primary bg-primary" : "border-border"
        )}
      >
        {selected && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
        {label}
      </span>
      {Icon && <Icon className="size-4 shrink-0 text-primary" />}
    </button>
  )
}
