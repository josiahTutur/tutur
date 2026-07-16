/* ========================================================================== *
 *  TUTUR DEMO · V2 — the story.
 *
 *  Day 1 → one week later → Day 7 → another week later → Day 14 → the film.
 *
 *  ── THIS IS A TRAILER, NOT THE MOVIE ─────────────────────────────────────
 *  It exists to show a parent what Tutur BECOMES, in ten minutes rather than
 *  fourteen days. Everything after Day 1 is invented.
 *
 *  ── AND THAT IS EXACTLY WHY THE FRAMING MATTERS ──────────────────────────
 *  This is shown TO PARENTS, as a reason to subscribe. The moment fake data is
 *  put in front of a real mother as "what your journey looks like", it stops
 *  being an illustration and becomes a PROMISE — and some children will not
 *  point, or say "ba", or make eye contact in fourteen days. The SLT document
 *  says so plainly, and has a referral rule for exactly that child.
 *
 *  So two rules run through every screen below:
 *
 *    1. It is ADAM's story, and it says so. Not a forecast of her child.
 *    2. The promises we make are about HER, not him. "You spent 143 minutes.
 *       You created 12 memories. You kept showing up." Those are guaranteed by
 *       using the product. "First point on Day 9" is not, and is presented as
 *       something Sarah NOTICED — never as something Tutur delivers.
 *
 *  The emotional payload survives that intact. It just stops being a lie.
 * ========================================================================== */

import { useEffect, useState } from "react"

import { Body, Bubble, Card, Eyebrow, Maya, Screen, Small, Title, BigTitle } from "./ui"
import { useAmbientMusic } from "./useAmbientMusic"

/* -------------------------------------------------------------------------- */
/*  Fake data — all of it. Hardcoded, per the amendment.                      */
/* -------------------------------------------------------------------------- */

export const STORY = {
  parent: "Sarah",
  /** Fallback only. The real name comes from what the parent typed — see `name`. */
  child: "Adam",
  week1: { days: 6, minutes: 64, memories: 5 },
  total: { minutes: 143, days: 12, memories: 12, moments: 8 },
  favouriteRoutine: "Breakfast",
  favouriteToy: "Blocks",
}

const week1Memories = (n: string) => [
  { day: 1, icon: "📷", text: `${n} smiled.` },
  { day: 3, icon: "🎤", text: "“ba”" },
  { day: 5, icon: "📷", text: "Bubble bath" },
  { day: 6, icon: "❤️", text: "Shared laughter" },
]

const week1Noticed = (n: string) => [
  `${n} looks towards you more often.`,
  `${n} waits, instead of pulling your hand.`,
  `${n} smiles more during play.`,
]

const JOURNEY_MOMENTS = [
  { icon: "👀", label: "First eye contact", day: 2 },
  { icon: "😊", label: "First laugh together", day: 5 },
  { icon: "🧸", label: "He handed you the blocks", day: 7 },
  { icon: "👆", label: "First point", day: 9 },
  { icon: "🎤", label: "First “ba”", day: 12 },
]

const MONTAGE = [
  { day: 1, icon: "📷", caption: "The day you started.", tint: "linear-gradient(140deg,#8B5CFF,#FF8A65)" },
  { day: 3, icon: "🎤", caption: "“ba”", tint: "linear-gradient(140deg,#6A2FE8,#8B5CFF)" },
  { day: 6, icon: "📷", caption: "Shared laughter.", tint: "linear-gradient(140deg,#FF8A65,#FFB199)" },
  { day: 9, icon: "👆", caption: "He pointed. At you.", tint: "linear-gradient(140deg,#8B5CFF,#C9B4FF)" },
  { day: 14, icon: "❤️", caption: "Look how far you've both come.", tint: "linear-gradient(140deg,#6A2FE8,#FF8A65)" },
]

/* -------------------------------------------------------------------------- */
/*  The line that turns a promise back into a story.                          */
/* -------------------------------------------------------------------------- */
function StoryNote({ name }: { name: string }) {
  return (
    <p
      className="text-center leading-snug"
      style={{ fontSize: 12, color: "var(--grey)", opacity: 0.85 }}
    >
      {name} and Sarah are an example. Every child moves at their own pace.
    </p>
  )
}

/* ========================================================================== *
 *  BRIDGE — "Communication grows slowly."
 * ========================================================================== */
export function GrowBridge({ onNext }: { onNext: () => void }) {
  return (
    <Screen center cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6 text-center">
        <div className="text-[64px] leading-none">🌱</div>
        <BigTitle>Communication grows slowly.</BigTitle>
        <Body>Every little moment matters — and they add up faster than you think.</Body>
        <Small>Let's see what one week later might look like.</Small>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  TIME SKIP
 * ========================================================================== */
export function TimeSkip({
  label,
  icon,
  onDone,
}: {
  label: string
  icon: string
  onDone: () => void
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2600)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5"
      style={{ background: "var(--bg)" }}
    >
      <div className="demo-skip flex flex-col items-center gap-5">
        <div className="relative">
          <span className="text-[60px] leading-none">{icon}</span>
          <span className="demo-leaf absolute -right-3 top-0 text-[20px]">🍃</span>
        </div>
        <p className="text-[24px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
          {label}
        </p>
      </div>
    </div>
  )
}

/* ========================================================================== *
 *  DAY 7 — encouragement. Nothing is asked. Nothing is scored.
 * ========================================================================== */
export function Day7({ name, onNext }: { name: string; onNext: () => void }) {
  const [step, setStep] = useState(0)

  if (step === 0) {
    return (
      <Screen center cta={{ label: "Continue", onClick: () => setStep(1) }}>
        <div className="demo-stagger space-y-6">
          <Maya size={110} />
          <Bubble>
            <p className="text-[19px] font-semibold">
              You've been amazing this week, {STORY.parent}.
            </p>
            <p className="mt-2" style={{ color: "var(--grey)" }}>
              Not because {name} changed — because you kept showing up
              before he did.
            </p>
          </Bubble>
        </div>
      </Screen>
    )
  }

  if (step === 1) {
    return (
      <Screen cta={{ label: "Continue", onClick: () => setStep(2) }}>
        <div className="demo-stagger space-y-4 pt-4">
          <Eyebrow>Your first week</Eyebrow>

          {/* Promises we can actually keep: these are produced by USING the app. */}
          <Card tint="rgba(106,47,232,0.07)">
            <Stat big={`${STORY.week1.days} days`} small="You played together" />
          </Card>
          <Card>
            <Stat big={`${STORY.week1.minutes} minutes`} small="You spent with him" />
          </Card>
          <Card tint="var(--secondary)">
            <Stat big={`${STORY.week1.memories} memories`} small="You kept forever" />
          </Card>
        </div>
      </Screen>
    )
  }

  if (step === 2) {
    return (
      <Screen cta={{ label: "Continue", onClick: () => setStep(3) }}>
        <div className="space-y-5 pt-4">
          <div>
            <Eyebrow>This week</Eyebrow>
            <Title>The moments you kept</Title>
          </div>

          <div className="demo-timeline space-y-3">
            {week1Memories(name).map((m) => (
              <div key={m.day} className="flex items-center gap-3">
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    background: "#fff",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <span className="text-[24px]">{m.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold uppercase" style={{ color: "var(--grey)" }}>
                    Day {m.day}
                  </p>
                  <p className="text-[16px] font-semibold">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen cta={{ label: "Continue", onClick: onNext }}>
      <div className="space-y-5 pt-4">
        <div>
          <Maya size={72} />
          <div className="mt-4">
            <Title>This week, {STORY.parent} noticed…</Title>
          </div>
        </div>

        {/* Framed as what SHE noticed — not as what Tutur measured or promises.
            The distinction is the difference between a story and a claim. */}
        <div className="demo-scale space-y-3">
          {week1Noticed(name).map((n) => (
            <Card key={n}>
              <div className="flex items-start gap-3">
                <span className="text-[20px]">❤️</span>
                <p className="text-[16px] font-medium leading-snug">{n}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card tint="rgba(106,47,232,0.07)">
          <p className="text-[16px] leading-relaxed">
            Next week we'll gently build on these moments.
          </p>
        </Card>

        <StoryNote name={name} />
      </div>
    </Screen>
  )
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <p className="text-[13px]" style={{ color: "var(--grey)" }}>
        {small}
      </p>
      <p className="mt-0.5 text-[30px] font-bold leading-none">{big}</p>
    </div>
  )
}

/* ========================================================================== *
 *  DAY 14 — the payoff. Not a graduation. A reflection.
 * ========================================================================== */
export function Day14({ name, onNext }: { name: string; onNext: () => void }) {
  const [step, setStep] = useState(0)

  if (step === 0) {
    return (
      <Screen center cta={{ label: "Continue", onClick: () => setStep(1) }}>
        <div className="demo-stagger space-y-6 text-center">
          <div className="text-[64px] leading-none">❤️</div>
          <BigTitle>Look what you've built together.</BigTitle>
        </div>
      </Screen>
    )
  }

  if (step === 1) {
    return (
      <Screen cta={{ label: "Continue", onClick: () => setStep(2) }}>
        <div className="space-y-5 pt-4">
          <div>
            <Eyebrow>Two weeks</Eyebrow>
            <Title>The moments {STORY.parent} noticed</Title>
          </div>

          <div className="demo-timeline space-y-1">
            {JOURNEY_MOMENTS.map((m, i) => (
              <div key={m.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 999,
                      background: "#fff",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <span className="text-[20px]">{m.icon}</span>
                  </div>
                  {i < JOURNEY_MOMENTS.length - 1 && (
                    <div
                      style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)" }}
                    />
                  )}
                </div>
                <div className="pb-5 pt-2.5">
                  <p className="text-[12px] font-bold uppercase" style={{ color: "var(--grey)" }}>
                    Day {m.day}
                  </p>
                  <p className="text-[17px] font-semibold leading-snug">{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          <StoryNote name={name} />
        </div>
      </Screen>
    )
  }

  if (step === 2) {
    return (
      <Screen center cta={{ label: "Continue", onClick: () => setStep(3) }}>
        <div className="space-y-8 text-center">
          <div className="demo-film-1 space-y-2">
            <Small>Two weeks ago…</Small>
            <p className="text-[24px] font-semibold leading-snug">
              You weren't sure where to begin.
            </p>
          </div>
          <div className="demo-film-2 space-y-2">
            <Small>Today…</Small>
            <BigTitle>Look what you've built.</BigTitle>
          </div>
          <div className="demo-film-3 text-[44px] leading-none">❤️</div>
        </div>
      </Screen>
    )
  }

  if (step === 3) {
    return (
      <Screen cta={{ label: "Continue", onClick: () => setStep(4) }}>
        <div className="demo-stagger space-y-4 pt-4">
          <div>
            <Eyebrow>Your journey</Eyebrow>
            <Title>What you did</Title>
          </div>

          {/* EVERY number here is about the PARENT. These are the only promises
              the product can actually keep — they are produced by using it. */}
          <Card tint="rgba(106,47,232,0.07)">
            <Stat big={`${STORY.total.minutes} minutes`} small="You spent together" />
          </Card>
          <Card>
            <Stat big={`${STORY.total.memories} memories`} small="You created" />
          </Card>
          <Card>
            <Stat big={`${STORY.total.moments} moments`} small="You noticed" />
          </Card>
          <Card tint="var(--secondary)">
            <p className="text-[20px] font-bold leading-snug">You kept showing up.</p>
            <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--primary)" }}>
              On {STORY.total.days} of 14 days — including the ones where nothing
              seemed to happen.
            </p>
          </Card>
        </div>
      </Screen>
    )
  }

  return (
    <Screen center cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6">
        <Maya size={110} />
        <Bubble>
          <p style={{ lineHeight: 1.65 }}>
            Based on everything we've been through together, I'm ready to
            personalise the next activities for {name}.
          </p>
          <p className="mt-3 font-semibold">Let's continue. ❤️</p>
        </Bubble>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  THE FILM — Tutur violet, edge to edge, and it says nothing about a child's
 *  outcome.
 *
 *  It used to be a near-black card sitting inside the 390px phone, with the page
 *  surround showing pale on either side. That is fine for a screen INSIDE the
 *  app — but this is the closing title, and a title card with margins is a
 *  slide, not a film. The colour now runs to the edges of whatever it is shown
 *  on (see the `bleed` background in TuturDemo).
 * ========================================================================== */
export function EndingFilm({ onNext }: { onNext: () => void }) {
  const [showCta, setShowCta] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setShowCta(true), 5200)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      style={{ background: "var(--primary)", color: "#fff" }}
    >
      <div className="space-y-3">
        <p className="demo-film-1 text-[26px] font-semibold">Every conversation</p>
        <p className="demo-film-2 text-[26px] font-semibold">begins</p>
        <p className="demo-film-3 text-[26px] font-semibold">with one moment.</p>
      </div>

      <div className="demo-film-4 mt-12 space-y-4">
        <p className="text-[30px] leading-none">❤️</p>
        <p className="text-[26px] font-bold" style={{ letterSpacing: "-0.02em" }}>
          Tutur
        </p>
      </div>

      {showCta && (
        <div className="demo-fade absolute bottom-10 left-0 right-0 px-8">
          <button
            type="button"
            onClick={onNext}
            className="demo-press w-full text-[17px] font-semibold"
            style={{
              height: 56,
              borderRadius: 18,
              background: "#fff",
              color: "var(--primary)",
            }}
          >
            See your journey
          </button>
        </div>
      )}
    </div>
  )
}

/* ========================================================================== *
 *  MONTAGE — Apple Photos, auto-playing. The last thing she sees.
 * ========================================================================== */
export function Montage({ name, onDone }: { name: string; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [muted, setMuted] = useState(false)

  /*
   * Music, under the five memory slides only.
   *
   * It is allowed to start because she TAPPED to get here ("See your journey") —
   * browsers block audio that nobody asked for, and rightly. It fades out the
   * moment the last slide passes, so the closing ask lands in silence.
   */
  useAmbientMusic(i < MONTAGE.length && !muted)

  useEffect(() => {
    if (i >= MONTAGE.length) return
    const t = window.setTimeout(() => setI((n) => n + 1), 3400)
    return () => window.clearTimeout(t)
  }, [i])

  if (i >= MONTAGE.length) {
    /*
     * THE ASK.
     *
     * She has just watched a film about her child. This is not the moment to say
     * "Subscribe" — that word names the commercial transaction at the emotional
     * peak, and retroactively turns the film into an advert. It is also not the
     * moment for "Sign Up", which describes what she GIVES us.
     *
     * The button describes what happens next FOR HER, and it uses the name she
     * typed — the only place in the whole demo where that name can do real work.
     *
     * Everything else is stripped out. Three lines, one button. The two things a
     * frightened parent is actually asking — is this hard, does it cost me — are
     * answered underneath in six words, where they can be read and not dwelt on.
     */
    const label = name.trim() ? `Begin with ${name.trim()}` : "Begin tonight"

    return (
      <Screen center cta={{ label, onClick: onDone }}>
        <div className="demo-stagger space-y-5 text-center">
          <div className="text-[56px] leading-none">🌱</div>
          <BigTitle>Ten minutes. Tonight.</BigTitle>
          <Body>In whatever you were already going to do together.</Body>
          <p className="text-[13px] font-semibold" style={{ color: "var(--primary)" }}>
            Nothing to prepare. Nothing to buy.
          </p>
        </div>
      </Screen>
    )
  }

  const m = MONTAGE[i]

  return (
    <div className="relative h-full overflow-hidden" style={{ background: "#140f22" }}>
      <div key={i} className="demo-ken absolute inset-0" style={{ background: m.tint }} />

      <div className="relative flex h-full flex-col items-center justify-center gap-6 px-8">
        <span className="demo-fade text-[64px] leading-none">{m.icon}</span>
        <p
          className="demo-fade text-center text-[24px] font-bold leading-snug"
          style={{ color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.25)" }}
        >
          {m.caption}
        </p>
        <p
          className="demo-fade text-[13px] font-bold uppercase"
          style={{ color: "rgba(255,255,255,0.8)", letterSpacing: "0.1em" }}
        >
          Day {m.day}
        </p>
      </div>

      {/* Story progress — the dots tell her how long this lasts. */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 px-8">
        {MONTAGE.map((_, n) => (
          <span
            key={n}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 999,
              background: n <= i ? "#fff" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>

      <div className="absolute left-0 right-0 top-5 flex items-center justify-between px-5">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="demo-press flex h-9 w-9 items-center justify-center rounded-full text-[15px]"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          type="button"
          onClick={() => setI(MONTAGE.length)}
          className="text-[13px] font-semibold"
          style={{ color: "rgba(255,255,255,0.75)" }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
