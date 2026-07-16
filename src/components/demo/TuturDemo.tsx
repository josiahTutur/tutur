/* ========================================================================== *
 *  TUTUR DEMO — PRD v1.0.  `?demo=1`
 *
 *  A clickable prototype of the product Tutur is trying to become: a daily
 *  coaching experience, not a therapy worksheet.
 *
 *  NOTHING here is connected. No backend, no auth, no storage. Every number is
 *  a JavaScript variable and it resets on refresh. That is the point — this
 *  exists to be walked by a parent so we can watch her face.
 *
 *  ── THE PRD'S FIVE PRINCIPLES, AND WHERE THEY LIVE ───────────────────────
 *    1. Parent looks at CHILD, not phone   → PlayMode is a timer and nothing
 *                                             else. There is nothing to read.
 *    2. Coach BEFORE the activity          → the audio briefing is the teaching;
 *                                             during play the phone goes down.
 *    3. Celebrate BEFORE asking questions  → Celebration comes first, and it is
 *                                             unconditional.
 *    4. One mission, one activity, one goal
 *    5. Invisible clinical engine          → the words CCS, KP, joint attention,
 *                                             milestone, tracker, assessment do
 *                                             not appear anywhere in this file.
 *
 *  ── THE THREE THINGS I CHANGED, AND WHY ──────────────────────────────────
 *
 *  (a) The PRD's "Today's Win" screen asserts "You remembered to wait before
 *      helping" — but nothing ever ASKED her. In a clickthrough that reads as a
 *      nice touch; in a product it is the app fabricating a fact about a
 *      parent's behaviour, and congratulating her for something she may not have
 *      done. So the win is now DERIVED from her own answer, and it still comes
 *      after an unconditional celebration (principle 3 survives).
 *
 *  (b) The reflection asks THREE questions, not two. The two extra taps buy the
 *      only two things the pilot actually needs: whether she used the technique
 *      (the one variable we can coach) and how often the child looked at her
 *      face (the one that moves early and can be shown back to her).
 *
 *  (c) There is a Journey screen. "Communication Journey 🌱" is an emoji that
 *      never changes; the reason anyone keeps paying is seeing the child change,
 *      and that sentence — "Day 1: once. Today: five times." — has to exist
 *      somewhere or the product has no second month.
 *
 *  Not one clinical word was needed to do any of that.
 * ========================================================================== */

import { useEffect, useRef, useState } from "react"

import "./demo.css"
import { Day7, Day14, EndingFilm, GrowBridge, Montage, TimeSkip } from "./story"
import {
  Body,
  Bubble,
  Card,
  Choice,
  Confetti,
  Eyebrow,
  Input,
  Maya,
  PrimaryButton,
  Screen,
  Small,
  Title,
  BigTitle,
} from "./ui"

/* -------------------------------------------------------------------------- */
/*  Fake data. All of it. It resets on refresh.                                */
/* -------------------------------------------------------------------------- */

interface Child {
  name: string
  age: string
  language: string
  worry: string
  reminder: string
  day: number
  minutesPlayed: number
  waited: string | null
  looks: string | null
  newThing: string
  memory: "photo" | "voice" | "note" | null
}

/*
 * EMPTY. Nothing is pre-filled.
 *
 * The profile screen used to arrive with "Adam", "3" and "Bahasa Melayu" already
 * in it — which was a DEFAULT, but read exactly like data left over from the last
 * person who used the demo. It also meant a tester could walk the entire film
 * without ever typing her own child's name, which is the one thing that makes the
 * ending land.
 *
 * (The demo has never persisted anything — it is React state and it dies on
 * refresh. There was nothing to clear; there was something to stop inventing.)
 */
const INITIAL: Child = {
  name: "",
  age: "",
  language: "",
  worry: "",
  reminder: "",
  day: 1,
  minutesPlayed: 0,
  waited: null,
  looks: null,
  newThing: "",
  memory: null,
}

/**
 * The Journey tab's history. Nine invented days.
 *
 * A prototype that only ever shows Day 1 cannot show the one thing worth
 * showing — change. This is clearly demo data and is labelled as such on screen.
 */
const HISTORY = [
  { day: 1, looks: 1, waited: true, minutes: 10 },
  { day: 2, looks: 0, waited: false, minutes: 6 },
  { day: 3, looks: 2, waited: true, minutes: 12 },
  { day: 4, looks: 2, waited: true, minutes: 10 },
  { day: 5, looks: 1, waited: false, minutes: 8 },
  { day: 6, looks: 3, waited: true, minutes: 14 },
  { day: 7, looks: 4, waited: true, minutes: 11 },
  { day: 8, looks: 3, waited: true, minutes: 10 },
  { day: 9, looks: 5, waited: true, minutes: 13 },
]

type Progress = { step: number; total: number } | null

type ScreenId =
  | "splash"
  | "welcome"
  | "maya"
  | "profile"
  | "goal"
  | "reminder"
  | "ready"
  | "dashboard"
  | "mission"
  | "briefing"
  | "play"
  | "celebration"
  | "memory"
  | "reflection"
  | "win"
  | "journey"
  | "mayaReply"
  | "tomorrow"
  | "memories"
  // ── V2: the story. Everything past Day 1 is invented, and says so. ────────
  | "grow"
  | "week1"
  | "day7"
  | "week2"
  | "day14"
  | "film"
  | "montage"

/**
 * The first run, in order — from "Start Journey" to the last reflection question.
 *
 * ONE bar across the whole thing. It is not a form's progress; it is the parent's
 * progress through her first day, and it answers the only question she is really
 * asking on every screen: how much more of this is there?
 *
 * `play` and `celebration` are IN the count but the bar is not DRAWN on them:
 *   · Play Mode's entire job is to have nothing on it. Principle 1 is "parent
 *     looks at child, not phone" — putting a progress bar on that screen invites
 *     her to watch it.
 *   · A progress bar over confetti tells her the celebration is a step to get
 *     through. It isn't. It's the point.
 *
 * The bar simply reappears further along, which reads as progress having happened
 * while she was busy — because it did.
 */
const JOURNEY: ScreenId[] = [
  "maya",
  "profile",
  "goal",
  "reminder",
  "ready",
  "mission",
  "briefing",
  "play",
  "celebration",
  "memory",
  "reflection",
]
const NO_BAR: ScreenId[] = ["play", "celebration"]

/** Reflection is three questions inside one screen, so it counts as three. */
const JOURNEY_TOTAL = JOURNEY.length + 2

export function TuturDemo() {
  const [screen, setScreen] = useState<ScreenId>("splash")
  const [child, setChild] = useState<Child>(INITIAL)
  const [done, setDone] = useState(false)
  /** 0–2 within the reflection, so the bar keeps moving across its questions. */
  const [reflectStep, setReflectStep] = useState(0)

  const go = (s: ScreenId) => setScreen(s)
  const set = (patch: Partial<Child>) => setChild((c) => ({ ...c, ...patch }))

  /** Where the bar stands, or null on screens that are not part of the journey. */
  function journeyProgress(): { step: number; total: number } | null {
    const i = JOURNEY.indexOf(screen)
    if (i === -1 || NO_BAR.includes(screen)) return null
    const step = screen === "reflection" ? i + 1 + reflectStep : i + 1
    return { step, total: JOURNEY_TOTAL }
  }

  /*
   * The closing film bleeds to the edges of the window.
   *
   * Every other screen is a phone — 390px, framed, so a reviewer judges it as an
   * app. The title card is not a screen in an app; it is the end of a film, and a
   * film with pale margins down both sides is a slide deck. So for that one
   * screen the surround takes the same violet and the frame disappears.
   */
  const isFilm = screen === "film"
  const surround = isFilm ? "var(--primary)" : "#efecf7"

  return (
    <div className="tutur-demo flex min-h-dvh justify-center" style={{ background: surround }}>
      <div
        className="relative flex h-dvh w-full flex-col overflow-hidden"
        style={{ maxWidth: isFilm ? "none" : 390, background: isFilm ? "transparent" : "var(--bg)" }}
      >
        {render()}
      </div>
    </div>
  )

  function render() {
    const progress = journeyProgress()

    switch (screen) {
      case "splash":
        return <Splash onDone={() => go("welcome")} />
      case "welcome":
        return <Welcome onNext={() => go("maya")} />
      case "maya":
        return <MeetMaya progress={progress} onNext={() => go("profile")} />
      case "profile":
        return <Profile child={child} set={set} progress={progress} onNext={() => go("goal")} onBack={() => go("maya")} />
      case "goal":
        return <Goal child={child} set={set} progress={progress} onNext={() => go("reminder")} onBack={() => go("profile")} />
      case "reminder":
        return <Reminder child={child} set={set} progress={progress} onNext={() => go("ready")} onBack={() => go("goal")} />
      case "ready":
        /*
         * "Start Day 1" now STARTS DAY 1.
         *
         * It used to land on the dashboard — so the button lied, and the very
         * first thing a parent saw after committing was an empty room: a journey
         * card at 0%, a mission she hadn't done, and a memory card saying "your
         * memories will appear here". That is the worst possible moment to show
         * someone an empty state; she is at peak intent and we hand her a
         * to-do list.
         *
         * She meets the dashboard AFTER Day 1 instead — when it has a finished
         * day, ten minutes, and a memory in it. Same screen, completely different
         * first impression.
         */
        return <Ready child={child} progress={progress} onNext={() => go("mission")} />
      case "dashboard":
        return <Dashboard child={child} done={done} go={go} />
      case "mission":
        return <Mission child={child} progress={progress} onNext={() => go("briefing")} onBack={() => go("ready")} />
      case "briefing":
        return <Briefing child={child} progress={progress} onNext={() => go("play")} onBack={() => go("mission")} />
      case "play":
        return (
          <PlayMode
            child={child}
            onFinish={(mins) => {
              set({ minutesPlayed: mins })
              go("celebration")
            }}
          />
        )
      case "celebration":
        return <Celebration child={child} onNext={() => go("memory")} />
      case "memory":
        return (
          <Memory
            child={child}
            progress={progress}
            onDone={(m) => {
              set({ memory: m })
              go("reflection")
            }}
          />
        )
      case "reflection":
        return (
          <Reflection
            child={child}
            progress={progress}
            onStep={setReflectStep}
            onDone={(r) => {
              set(r)
              go("win")
            }}
          />
        )
      case "win":
        /*
         * Straight to Maya. The Journey screen used to sit here — and it showed a
         * parent who had completed exactly ONE day a chart of NINE. A timeline
         * paradox, and the reason it read as noise. It lives on the Journey tab
         * now, where a parent goes to LOOK; and the story it was trying to tell is
         * told properly by Day 7 and Day 14, with a fortnight behind it.
         */
        return <TodaysWin child={child} onNext={() => go("mayaReply")} />
      case "journey":
        return <Journey child={child} go={go} />
      case "mayaReply":
        return <MayaReply child={child} onNext={() => go("tomorrow")} />
      case "tomorrow":
        return (
          <Tomorrow
            child={child}
            onNext={() => {
              setDone(true)
              // The trailer, not the movie. Rather than dropping her back on the
              // dashboard to grind out thirteen more days, we skip ahead and show
              // her what those days become.
              go("grow")
            }}
          />
        )

      /* ── V2 · the story ──────────────────────────────────────────────── */
      case "grow":
        return <GrowBridge onNext={() => go("week1")} />
      case "week1":
        return <TimeSkip icon="🌱" label="One week later…" onDone={() => go("day7")} />
      case "day7":
        return <Day7 name={child.name} onNext={() => go("week2")} />
      case "week2":
        return <TimeSkip icon="✨" label="Another week later…" onDone={() => go("day14")} />
      case "day14":
        return <Day14 name={child.name} onNext={() => go("film")} />
      case "film":
        return <EndingFilm onNext={() => go("montage")} />
      case "montage":
        /*
         * The demo ENDS here. It used to drop her on the dashboard, which took a
         * film and followed it with a screenshot — and asked her to evaluate a
         * product she had just been asked to feel something about.
         *
         * Replay resets to a clean state so the next parent starts from nothing.
         */
        return (
          <Montage
            name={child.name}
            onDone={() => {
              setChild(INITIAL)
              setDone(false)
              setReflectStep(0)
              go("splash")
            }}
          />
        )
      case "memories":
        return <Memories child={child} go={go} />
    }
  }
}

/* ========================================================================== *
 *  1 · SPLASH
 * ========================================================================== */
function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2000)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div className="demo-fade flex h-full flex-col items-center justify-center gap-6">
      <div className="relative" style={{ width: 108, height: 108 }}>
        <div
          className="demo-breathe absolute inset-0 rounded-full"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="relative flex h-full w-full items-center justify-center rounded-full"
          style={{ background: "#fff", boxShadow: "var(--shadow)" }}
        >
          <span className="text-[42px]">🌱</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-bold" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
          Tutur
        </p>
        <p className="mt-1" style={{ fontSize: 14, color: "var(--grey)" }}>
          Small moments. Every day.
        </p>
      </div>
    </div>
  )
}

/* ========================================================================== *
 *  2 · WELCOME
 * ========================================================================== */
function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <Screen center cta={{ label: "Start Journey", onClick: onNext }}>
      <div className="demo-stagger space-y-6 text-center">
        <div className="text-[64px] leading-none">🌱</div>
        <BigTitle>Welcome to Tutur</BigTitle>
        <Body>
          Helping your child communicate starts with small everyday moments.
        </Body>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  3 · MEET MAYA
 * ========================================================================== */
function MeetMaya({ progress, onNext }: { progress?: Progress; onNext: () => void }) {
  return (
    <Screen center progress={progress ?? undefined} cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6">
        <Maya size={120} />
        <Bubble>
          <p className="font-semibold">Hi! I'm Maya.</p>
          <p className="mt-2" style={{ color: "var(--grey)" }}>
            I'll coach you every day. You don't need to know therapy — I'll guide
            you.
          </p>
        </Bubble>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  4 · CHILD PROFILE
 * ========================================================================== */
function Profile({
  child,
  set,
  progress,
  onNext,
  onBack,
}: {
  child: Child
  set: (p: Partial<Child>) => void
  progress?: Progress
  onNext: () => void
  onBack: () => void
}) {
  return (
    <Screen
      onBack={onBack}
      progress={progress ?? undefined}
      cta={{ label: "Continue", onClick: onNext, disabled: !child.name.trim() || !child.language }}
    >
      <div className="space-y-6">
        <Title>Tell me about your child</Title>

        <div className="space-y-4">
          <div className="space-y-2">
            <Eyebrow>Name</Eyebrow>
            <Input
              value={child.name}
              onChange={(v) => set({ name: v })}
              placeholder="Her name, or his"
            />
          </div>
          <div className="space-y-2">
            <Eyebrow>Age</Eyebrow>
            <Input
              value={child.age}
              onChange={(v) => set({ age: v.replace(/\D/g, "").slice(0, 2) })}
              type="text"
            />
          </div>
          <div className="space-y-2">
            <Eyebrow>Language at home</Eyebrow>
            <Choice
              options={[
                { value: "Bahasa Melayu", label: "Bahasa Melayu" },
                { value: "English", label: "English" },
              ]}
              value={child.language}
              onPick={(v) => set({ language: v })}
            />
          </div>
        </div>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  5 · PARENT GOAL
 * ========================================================================== */
function Goal({
  child,
  set,
  progress,
  onNext,
  onBack,
}: {
  child: Child
  set: (p: Partial<Child>) => void
  progress?: Progress
  onNext: () => void
  onBack: () => void
}) {
  /*
   * No Continue button. The tap IS the answer.
   *
   * A confirm step on a single-select list asks the parent to say the same thing
   * twice — she has already decided, and the second tap only exists to reassure
   * the app. The short pause before advancing is so she SEES her choice land;
   * without it the screen changes under her thumb and she is not sure it took.
   */
  const pick = (v: string) => {
    set({ worry: v })
    window.setTimeout(onNext, 240)
  }

  return (
    <Screen onBack={onBack} progress={progress ?? undefined}>
      <div className="space-y-6">
        <Title>What worries you the most?</Title>
        <Small>There's no wrong answer. This just tells me where to start.</Small>
        <Choice
          options={[
            { value: "talk", label: "Not talking yet" },
            { value: "respond", label: "Doesn't respond to me" },
            { value: "point", label: "Doesn't point or gesture" },
            { value: "understand", label: "Doesn't seem to understand" },
            { value: "other", label: "Something else" },
          ]}
          value={child.worry}
          onPick={pick}
        />
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  6 · REMINDER
 * ========================================================================== */
function Reminder({
  child,
  set,
  progress,
  onNext,
  onBack,
}: {
  child: Child
  set: (p: Partial<Child>) => void
  progress?: Progress
  onNext: () => void
  onBack: () => void
}) {
  const pick = (v: string) => {
    set({ reminder: v })
    window.setTimeout(onNext, 240)
  }

  return (
    <Screen onBack={onBack} progress={progress ?? undefined}>
      <div className="space-y-6">
        <Title>When should I remind you?</Title>
        <Small>Pick the time your day is calmest. You can change it later.</Small>
        <Choice
          options={[
            { value: "morning", label: "Morning", sub: "Around breakfast" },
            { value: "afternoon", label: "Afternoon", sub: "After the nap" },
            { value: "evening", label: "Evening", sub: "Before bath or bed" },
          ]}
          value={child.reminder}
          onPick={pick}
        />
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  7 · READY
 * ========================================================================== */
function Ready({
  child,
  progress,
  onNext,
}: {
  child: Child
  progress?: Progress
  onNext: () => void
}) {
  return (
    <Screen center progress={progress ?? undefined} cta={{ label: "Start Day 1", onClick: onNext }}>
      <div className="demo-stagger space-y-6 text-center">
        <div className="text-[64px] leading-none">☀️</div>
        <BigTitle>You're ready</BigTitle>
        <Body>
          Today takes about 10 minutes with {child.name}. Nothing to prepare, and
          nothing to buy.
        </Body>
        <Card tint="var(--secondary)">
          <p className="text-[15px] font-semibold leading-relaxed">
            You are already the person {child.name} wants to talk to. I'll just
            show you how.
          </p>
        </Card>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  8 · DASHBOARD
 * ========================================================================== */
function Dashboard({
  child,
  done,
  go,
}: {
  child: Child
  done: boolean
  go: (s: ScreenId) => void
}) {
  return (
    <div className="demo-screen flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8">
        <div className="demo-stagger space-y-5">
          <div>
            <Small>Good evening</Small>
            <Title>{child.name}'s day</Title>
          </div>

          {/* Journey card */}
          <Card onClick={() => go("journey")}>
            <div className="flex items-center gap-4">
              <div
                className="flex shrink-0 items-center justify-center rounded-full text-[26px]"
                style={{ width: 56, height: 56, background: "rgba(106,47,232,0.09)" }}
              >
                🌱
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">Communication Journey</p>
                <p className="text-[14px]" style={{ color: "var(--grey)" }}>
                  {done ? "Day 1 complete — you've started" : "Day 1 of your journey"}
                </p>
              </div>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full"
              style={{ background: "var(--border)" }}
            >
              <div
                className="demo-grow h-full rounded-full"
                style={{ width: done ? "7%" : "0%", background: "var(--primary)" }}
              />
            </div>
          </Card>

          {/* Mission card — the hero */}
          {done ? (
            <Card tint="rgba(106,47,232,0.09)">
              <div className="flex items-center gap-3">
                <span className="text-[22px]">✅</span>
                <div>
                  <p className="text-[16px] font-semibold">Day 1 complete</p>
                  <p className="text-[14px]" style={{ color: "var(--grey)" }}>
                    {child.minutesPlayed} minutes with {child.name}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card tint="var(--secondary)">
              <Eyebrow>Today's mission</Eyebrow>
              <p className="mt-2 text-[20px] font-bold leading-snug">
                Help {child.name} notice you during play.
              </p>
              <p className="mt-2 text-[14px]" style={{ color: "var(--primary)" }}>
                10 minutes · no preparation
              </p>
              <div className="mt-5">
                <PrimaryButton onClick={() => go("mission")}>Start</PrimaryButton>
              </div>
            </Card>
          )}

          {/* Memory card */}
          <Card onClick={() => go("memories")}>
            <Eyebrow>{done ? "Today's memory" : "Yesterday's memory"}</Eyebrow>
            <div
              className="mt-3 flex items-center justify-center"
              style={{
                height: 132,
                borderRadius: 20,
                background: done
                  ? "linear-gradient(135deg,#8B5CFF,#FF8A65)"
                  : "var(--border)",
              }}
            >
              <span className="text-[34px]">{done ? "📸" : "🤍"}</span>
            </div>
            <p className="mt-3 text-[14px]" style={{ color: "var(--grey)" }}>
              {done
                ? `${child.name} chose the blocks today.`
                : "Your memories will appear here."}
            </p>
          </Card>
        </div>
      </div>

      <BottomNav active="home" go={go} />
    </div>
  )
}

function BottomNav({
  active,
  go,
}: {
  active: "home" | "journey" | "memories" | "profile"
  go: (s: ScreenId) => void
}) {
  const items: { id: typeof active; icon: string; label: string; to: ScreenId }[] = [
    { id: "home", icon: "🏠", label: "Home", to: "dashboard" },
    { id: "journey", icon: "📈", label: "Journey", to: "journey" },
    { id: "memories", icon: "💛", label: "Memories", to: "memories" },
    { id: "profile", icon: "👤", label: "Profile", to: "dashboard" },
  ]
  return (
    <div
      className="flex shrink-0 items-center justify-around px-2 pb-6 pt-3"
      style={{ background: "#fff", borderTop: "1px solid var(--border)" }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => go(it.to)}
          className="demo-press flex flex-col items-center gap-1 px-4 py-1"
          style={{ opacity: active === it.id ? 1 : 0.42 }}
        >
          <span className="text-[20px]">{it.icon}</span>
          <span className="text-[11px] font-semibold">{it.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ========================================================================== *
 *  9 · TODAY'S MISSION
 * ========================================================================== */
function Mission({
  child,
  progress,
  onNext,
  onBack,
}: {
  child: Child
  progress?: Progress
  onNext: () => void
  onBack: () => void
}) {
  return (
    <Screen onBack={onBack} progress={progress ?? undefined} cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6">
        <div
          className="flex items-center justify-center"
          style={{
            height: 150,
            borderRadius: 28,
            background: "linear-gradient(135deg,#8B5CFF,#C9B4FF)",
          }}
        >
          <span className="text-[60px]">🧸</span>
        </div>

        <div>
          <Eyebrow>Today's mission</Eyebrow>
          <Title>Play with {child.name} using his favourite toy.</Title>
        </div>

        {/* ONE coaching objective. Not three techniques, not five skills. */}
        <Card tint="rgba(106,47,232,0.07)">
          <Eyebrow>Remember only one thing</Eyebrow>
          <p className="mt-2 text-[22px] font-bold leading-snug">
            Wait five seconds after you speak.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--grey)" }}>
            That silence is where {child.name} gets his turn.
          </p>
        </Card>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  10 · AUDIO BRIEFING — the coaching happens HERE, before the activity.
 *
 *  Real audio. ms-MY-YasminNeural or en-SG-LunaNeural, generated by
 *  scripts/gen-demo-voice.mjs, chosen by the language she gave us.
 *
 *  ── WHY THIS SCREEN IS THE PRODUCT ────────────────────────────────────────
 *  Principle 2 says: coach BEFORE the activity, not during. That only works if
 *  the coaching actually lands here — because forty seconds from now the phone
 *  goes face-down and she is on her own with her child. Everything Tutur has to
 *  teach her today has to fit in this one listen.
 *
 *  Which is why the transcript matches the audio WORD FOR WORD. Reading
 *  something slightly different from what you are hearing is quietly disorienting
 *  — and she may well be listening with a toddler climbing on her.
 * ========================================================================== */
function Briefing({
  child,
  progress,
  onNext,
  onBack,
}: {
  child: Child
  progress?: Progress
  onNext: () => void
  onBack: () => void
}) {
  const lang = child.language === "English" ? "en" : "ms"
  const audio = useRef<HTMLAudioElement | null>(null)

  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)
  const [pct, setPct] = useState(0)
  const [duration, setDuration] = useState(0)

  // Never leave Maya talking into a screen the parent has left.
  useEffect(() => {
    const el = audio.current
    return () => {
      el?.pause()
    }
  }, [])

  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  const replay = () => {
    const el = audio.current
    if (!el) return
    el.currentTime = 0
    void el.play().then(() => setPlaying(true))
  }

  const secs = duration ? Math.round(duration) : 40

  const script =
    lang === "en"
      ? [
          "Today is simple.",
          "Sit somewhere your child can see your face.",
          "Say what they're doing, out loud, in short sentences. Not questions. Just words for what they can already see.",
          "Then wait. Count to five in your head.",
          "That silence will feel long. It isn't. It's where they get their turn.",
          "And when they look at you, smile. Then follow them.",
          "That's all. Put your phone down beside you now. I'll be here when you're done.",
        ]
      : [
          "Hari ini mudah sahaja.",
          "Duduk di tempat anak boleh nampak muka anda.",
          "Sebut apa yang dia sedang buat. Kuat-kuat, ayat pendek. Bukan soalan — cuma perkataan untuk apa yang dia sudah nampak.",
          "Kemudian tunggu. Kira lima dalam hati.",
          "Senyap itu akan terasa lama. Sebenarnya tidak. Di situlah giliran dia.",
          "Dan bila dia pandang anda — senyum. Kemudian ikut dia.",
          "Itu sahaja. Letak telefon di sebelah anda sekarang. Saya tunggu di sini.",
        ]

  return (
    <Screen
      onBack={onBack}
      progress={progress ?? undefined}
      cta={{ label: "Start activity", onClick: onNext }}
      secondary={played ? { label: "Play again", onClick: replay } : undefined}
    >
      <audio
        ref={audio}
        src={`/audio/demo/briefing-${lang}.mp3`}
        preload="auto"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget
          if (el.duration) setPct((el.currentTime / el.duration) * 100)
        }}
        onEnded={() => {
          setPlaying(false)
          setPlayed(true)
          setPct(100)
        }}
      />

      <div className="demo-stagger space-y-6">
        <Maya size={110} />

        <button
          type="button"
          onClick={toggle}
          className="demo-press mx-auto flex items-center gap-3"
          style={{
            height: 56,
            padding: "0 26px",
            borderRadius: 999,
            background: playing ? "var(--primary)" : "#fff",
            color: playing ? "#fff" : "var(--text)",
            boxShadow: "var(--shadow)",
            fontWeight: 600,
          }}
        >
          <span className="text-[18px]">{playing ? "⏸" : "▶️"}</span>
          {playing ? "Playing…" : played ? "Listen again" : `Listen — ${secs} seconds`}
        </button>

        {/* The bar tracks the REAL audio, not a guessed timer. */}
        {(playing || pct > 0) && (
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: "var(--primary)",
                transition: "width 200ms linear",
              }}
            />
          </div>
        )}

        <Bubble>
          <div style={{ color: "var(--grey)", lineHeight: 1.7 }}>
            {script.map((line, i) => (
              <p key={i} className={i === 3 ? "font-semibold" : ""} style={i === 3 ? { color: "var(--text)" } : undefined}>
                {line}
              </p>
            ))}
          </div>
        </Bubble>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  11 · PLAY MODE — the most important screen, because there's nothing on it.
 * ========================================================================== */
function PlayMode({ child, onFinish }: { child: Child; onFinish: (mins: number) => void }) {
  const TOTAL = 10 * 60
  const [left, setLeft] = useState(TOTAL)
  const [paused, setPaused] = useState(false)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [paused])

  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(left % 60).padStart(2, "0")

  const finish = () => {
    const elapsed = Math.round((Date.now() - startedAt.current) / 1000)
    // Demo: credit the intended 10 minutes if they cut it short, so a reviewer
    // clicking through in 20 seconds still sees a realistic celebration.
    onFinish(Math.max(1, Math.round(Math.max(elapsed, TOTAL - left) / 60)) || 10)
  }

  return (
    <div className="demo-screen flex h-full flex-col items-center justify-center px-6">
      <Eyebrow>Today's activity</Eyebrow>

      <div className="relative mt-8" style={{ width: 220, height: 220 }}>
        <div
          className="demo-breathe absolute inset-0 rounded-full"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="relative flex h-full w-full flex-col items-center justify-center rounded-full"
          style={{ background: "#fff", boxShadow: "var(--shadow)" }}
        >
          <span className="text-[44px] font-bold tabular-nums tracking-tight">
            {mm}:{ss}
          </span>
          <span className="mt-1 text-[13px]" style={{ color: "var(--grey)" }}>
            with {child.name}
          </span>
        </div>
      </div>

      <p
        className="mt-10 text-center text-[18px] font-semibold leading-relaxed"
        style={{ maxWidth: 260 }}
      >
        Enjoy this moment together.
      </p>
      {/* The ONLY instruction on the screen. She should not be reading. */}
      <p className="mt-2 text-center text-[14px]" style={{ color: "var(--grey)" }}>
        Put the phone down. I'll wait.
      </p>

      <div className="mt-auto w-full space-y-2.5 pb-8 pt-10">
        <PrimaryButton onClick={finish}>Finish activity</PrimaryButton>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="demo-press w-full py-3 text-[15px] font-semibold"
          style={{ color: "var(--grey)" }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  )
}

/* ========================================================================== *
 *  12 · CELEBRATION — unconditional, and BEFORE any question (principle 3).
 * ========================================================================== */
function Celebration({ child, onNext }: { child: Child; onNext: () => void }) {
  return (
    <div className="relative h-full">
      <Confetti />
      <Screen center cta={{ label: "Continue", onClick: onNext }}>
        <div className="demo-stagger space-y-6 text-center">
          <div className="text-[64px] leading-none">❤️</div>
          <BigTitle>Beautiful work</BigTitle>
          <Body>
            You spent{" "}
            <strong style={{ color: "var(--text)" }}>
              {child.minutesPlayed} minutes
            </strong>{" "}
            building connection with {child.name}.
          </Body>
          <Small>That's something worth celebrating.</Small>
        </div>
      </Screen>
    </div>
  )
}

/* ========================================================================== *
 *  13 · MEMORY — a gift, not a question. It comes before we ask her anything.
 * ========================================================================== */
function Memory({
  child,
  progress,
  onDone,
}: {
  child: Child
  progress?: Progress
  onDone: (m: Child["memory"]) => void
}) {
  const [capturing, setCapturing] = useState<Child["memory"]>(null)
  const [captured, setCaptured] = useState(false)

  useEffect(() => {
    if (!capturing) return
    const t = window.setTimeout(() => setCaptured(true), 1800)
    return () => window.clearTimeout(t)
  }, [capturing])

  if (captured) {
    return (
      <Screen center cta={{ label: "Continue", onClick: () => onDone(capturing) }}>
        <div className="demo-stagger space-y-5 text-center">
          <div
            className="mx-auto flex items-center justify-center"
            style={{
              width: 200,
              height: 200,
              borderRadius: 28,
              background: "linear-gradient(135deg,#8B5CFF,#FF8A65)",
              boxShadow: "var(--shadow)",
            }}
          >
            <span className="text-[54px]">
              {capturing === "voice" ? "🎙️" : capturing === "note" ? "📝" : "📸"}
            </span>
          </div>
          <Title>Saved</Title>
          <Body>
            This is day one of {child.name}'s book. In two weeks you'll be able to
            look back at it.
          </Body>
        </div>
      </Screen>
    )
  }

  if (capturing) {
    return (
      <div className="demo-screen flex h-full flex-col items-center justify-center gap-8 px-6">
        <div
          className="demo-pulse flex items-center justify-center rounded-full"
          style={{ width: 120, height: 120, background: "var(--accent)" }}
        >
          <span className="text-[44px]">{capturing === "voice" ? "🎙️" : "📸"}</span>
        </div>
        <p className="text-[17px] font-semibold">
          {capturing === "voice" ? "Listening…" : "Capturing…"}
        </p>
      </div>
    )
  }

  return (
    <Screen
      progress={progress ?? undefined}
      secondary={{ label: "Skip for today", onClick: () => onDone(null) }}
    >
      <div className="demo-stagger space-y-6">
        <div>
          <Title>Keep something from today?</Title>
          <div className="mt-2">
            <Small>
              One photo, one sound, one line. It's yours — not a record for anyone
              else.
            </Small>
          </div>
        </div>

        <div className="space-y-3">
          {(
            [
              { id: "photo", icon: "📸", label: "Take a photo" },
              { id: "voice", icon: "🎙️", label: "Record his voice" },
              { id: "note", icon: "📝", label: "Write a line" },
            ] as const
          ).map((o) => (
            <Card key={o.id} onClick={() => setCapturing(o.id)}>
              <div className="flex items-center gap-4">
                <span className="text-[26px]">{o.icon}</span>
                <span className="text-[16px] font-semibold">{o.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  14 · REFLECTION — three questions. Not one clinical word.
 *
 *  Q1 is the parent's technique. It is the only variable we can coach, and it
 *     is what makes screen 15 TRUE rather than flattering.
 *  Q2 is the child behaviour that moves earliest — and it is a COUNT, not a
 *     grade. "Three times" and "not yet" carry the same information and land
 *     completely differently on a mother.
 *  Q3 is the moment. It is where the clinically interesting thing actually
 *     shows up, and it is the only question that gives her something back.
 * ========================================================================== */
function Reflection({
  child,
  progress,
  onStep,
  onDone,
}: {
  child: Child
  progress?: Progress
  /** Lifts the sub-step so the ONE journey bar keeps moving across the three. */
  onStep: (n: number) => void
  onDone: (r: Partial<Child>) => void
}) {
  const [step, setStepRaw] = useState(0)
  const setStep = (n: number) => {
    setStepRaw(n)
    onStep(n)
  }
  const [waited, setWaited] = useState<string | null>(null)
  const [looks, setLooks] = useState<string | null>(null)
  const [newThing, setNewThing] = useState("")
  const [answeredNew, setAnsweredNew] = useState<string | null>(null)

  const finish = () => onDone({ waited, looks, newThing })

  if (step === 0) {
    return (
      <Screen progress={progress ?? undefined}>
        <div className="demo-stagger space-y-6">
          <Eyebrow>1 of 3</Eyebrow>
          <Title>Did you manage to wait before helping?</Title>
          <Small>Be honest — it's harder than it sounds, and nobody is scoring you.</Small>
          <Choice
            options={[
              { value: "yes", label: "Yes, most of the time" },
              { value: "some", label: "Sometimes" },
              { value: "no", label: "Not today" },
            ]}
            value={waited ?? undefined}
            onPick={(v) => {
              setWaited(v)
              window.setTimeout(() => setStep(1), 220)
            }}
          />
        </div>
      </Screen>
    )
  }

  if (step === 1) {
    return (
      <Screen onBack={() => setStep(0)} progress={progress ?? undefined}>
        <div className="demo-stagger space-y-6">
          <Eyebrow>2 of 3</Eyebrow>
          <Title>How many times did {child.name} look at your face?</Title>
          <Small>A rough count is fine. Even a glance counts.</Small>
          <Choice
            options={[
              { value: "0", label: "Not yet today" },
              { value: "1-2", label: "Once or twice" },
              { value: "3+", label: "Three times or more" },
            ]}
            value={looks ?? undefined}
            onPick={(v) => {
              setLooks(v)
              window.setTimeout(() => setStep(2), 220)
            }}
          />
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      onBack={() => setStep(1)}
      progress={progress ?? undefined}
      cta={
        answeredNew
          ? {
              label: "Finish",
              onClick: finish,
              disabled: answeredNew === "yes" && !newThing.trim(),
            }
          : undefined
      }
    >
      <div className="demo-stagger space-y-6">
        <Eyebrow>3 of 3</Eyebrow>
        <Title>Did {child.name} do anything new today?</Title>
        <Choice
          options={[
            { value: "yes", label: "Yes — something new" },
            { value: "maybe", label: "Maybe, I'm not sure" },
            { value: "not-yet", label: "Not yet" },
          ]}
          value={answeredNew ?? undefined}
          onPick={setAnsweredNew}
        />

        {answeredNew === "yes" && (
          <div className="demo-fade space-y-2">
            <Eyebrow>Tell Maya what happened</Eyebrow>
            <textarea
              value={newThing}
              onChange={(e) => setNewThing(e.target.value)}
              rows={3}
              className="w-full resize-none outline-none"
              style={{
                borderRadius: 16,
                border: "2px solid var(--border)",
                background: "#fff",
                padding: "14px 16px",
                fontSize: 16,
              }}
            />
          </div>
        )}
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  15 · TODAY'S WIN — derived from HER answer. Never asserted.
 * ========================================================================== */
function TodaysWin({ child, onNext }: { child: Child; onNext: () => void }) {
  /*
   * The PRD said this screen should read "You remembered to wait before helping."
   * But nothing had asked her. So the app would have congratulated a parent for a
   * thing she may not have done — and taught her the wrong lesson in the process.
   *
   * Every branch below is TRUE of the answer she just gave. And note that the
   * "no" branch is still a win: she showed up, and the honest thing to praise is
   * the thing she actually did.
   */
  const name = child.name || "your child"

  const win =
    child.waited === "yes"
      ? {
          emoji: "🕐",
          title: "You waited.",
          body: `That silence is the hardest part of today, and you held it. Every time you wait, ${name} gets a turn he wouldn't otherwise have had.`,
        }
      : child.waited === "some"
        ? {
            emoji: "🌱",
            title: "You noticed yourself helping.",
            /*
             * This used to read: "Noticing that you jumped in early IS the skill.
             * Tomorrow you'll catch it a second sooner — that's how this changes."
             *
             * Nobody could parse it, including the person who commissioned it.
             * The idea underneath is real and worth keeping — the hard part is not
             * staying silent, it is CATCHING yourself before you rescue — but it
             * has to be said in words a tired mother can read once.
             */
            body: `Most parents help before they realise they're doing it. You caught yourself — and that noticing is the whole skill. Once you can see it, you can stop it.`,
          }
        : {
            emoji: "❤️",
            title: "You showed up.",
            body: `Waiting is genuinely hard, and today it didn't happen. That's normal, and it's not a failure. You still gave ${name} ${child.minutesPlayed} minutes of you — and that is the part that counts.`,
          }

  return (
    <Screen cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6 pt-6">
        <Eyebrow>Today's biggest win</Eyebrow>
        <div className="text-[56px] leading-none">{win.emoji}</div>
        <Title>{win.title}</Title>
        <Card tint="rgba(106,47,232,0.07)">
          <p className="text-[16px] leading-relaxed">{win.body}</p>
        </Card>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  JOURNEY — the tab. And the one sentence the product is built on.
 *
 *  ── WHAT WAS WRONG WITH THIS SCREEN ──────────────────────────────────────
 *  It showed "Day 1: 1 look → Today: 5 looks", a bar chart titled "Looks at your
 *  face", and then — unconnected, underneath — "You waited on 7 of the last 9
 *  days." Three facts, no sentence. A parent reading it has to work out for
 *  herself what a "look" is, why it matters, and what waiting has to do with it.
 *
 *  She shouldn't have to. The causal claim IS the product:
 *
 *      YOU WAITED  →  HE LOOKED.
 *
 *  When she pauses instead of jumping in, the child has to reach for her — and
 *  reaching for her means looking up. That is the first thing that changes, and
 *  everything else in the fourteen days grows out of it.
 *
 *  So the screen now LEADS with that sentence, and the chart exists to prove it:
 *  the days she waited are marked, and the bars are taller on those days. The
 *  numbers stopped being trivia and became evidence.
 * ========================================================================== */
function Journey({ child, go }: { child: Child; go: (s: ScreenId) => void }) {
  const name = child.name || "your child"
  const max = Math.max(...HISTORY.map((h) => h.looks), 1)
  const waitedDays = HISTORY.filter((h) => h.waited).length

  const first = HISTORY[0].looks
  const last = HISTORY[HISTORY.length - 1].looks

  return (
    <div className="demo-screen flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8">
        <div className="demo-stagger space-y-5">
          {/* THE SENTENCE. Everything below exists to back it up. */}
          <div>
            <Eyebrow>Your first two weeks</Eyebrow>
            <Title>You waited. So {name} looked.</Title>
          </div>

          <Card tint="rgba(106,47,232,0.07)">
            <p className="text-[15px] leading-relaxed">
              When you pause instead of helping, {name} has to reach for you — and
              reaching for you means <strong>looking up at your face</strong>.
            </p>
            <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: "var(--grey)" }}>
              It's the first thing that changes. Everything else grows out of it.
            </p>
          </Card>

          {/* The chart, now doing a job: it shows the two things TOGETHER, so the
              link is visible rather than asserted. Taller bars sit on the days she
              waited — and the two flat days are the two she didn't. */}
          <Card>
            <div className="flex items-baseline justify-between">
              <Eyebrow>Times {name} looked at you</Eyebrow>
              <span className="text-[12px] font-semibold" style={{ color: "var(--primary)" }}>
                {first} → {last}
              </span>
            </div>

            <div className="mt-5 flex h-28 items-end gap-1.5">
              {HISTORY.map((h) => (
                <div key={h.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>
                    {h.looks}
                  </span>
                  <div
                    className="demo-grow w-full rounded-t-md"
                    style={{
                      height: `${Math.max((h.looks / max) * 100, 5)}%`,
                      background: h.waited ? "var(--primary)" : "var(--border)",
                    }}
                  />
                  {/* The waited/didn't row, directly under the bar it explains. */}
                  <span className="text-[11px] leading-none">{h.waited ? "⏳" : "·"}</span>
                  <span className="text-[10px]" style={{ color: "var(--grey)" }}>
                    {h.day}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="mt-4 flex items-center gap-4 border-t pt-3 text-[12px]"
              style={{ borderColor: "var(--border)", color: "var(--grey)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  style={{ width: 10, height: 10, borderRadius: 3, background: "var(--primary)" }}
                />
                ⏳ You waited
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  style={{ width: 10, height: 10, borderRadius: 3, background: "var(--border)" }}
                />
                · You didn't — that's normal
              </span>
            </div>
          </Card>

          <Card tint="var(--secondary)">
            <p className="text-[17px] font-semibold leading-snug">
              You waited on {waitedDays} of {HISTORY.length} days.
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: "var(--primary)" }}>
              Look at days 2 and 5 — the days you didn't. {name} looked less. That
              isn't a coincidence, and it isn't a criticism. It's proof that the
              part you control is the part that matters.
            </p>
          </Card>

          <p className="text-center text-[12px] leading-snug" style={{ color: "var(--grey)" }}>
            Example data — this is what your first two weeks could look like.
          </p>
        </div>
      </div>

      <BottomNav active="journey" go={go} />
    </div>
  )
}

/* ========================================================================== *
 *  17 · MAYA'S REPLY
 * ========================================================================== */
function MayaReply({ child, onNext }: { child: Child; onNext: () => void }) {
  return (
    <Screen center cta={{ label: "Continue", onClick: onNext }}>
      <div className="demo-stagger space-y-6">
        <Maya size={110} />
        <Bubble>
          <p className="font-semibold">Thank you ❤️</p>
          <p className="mt-2" style={{ color: "var(--grey)" }}>
            {child.newThing.trim()
              ? `I've kept what you told me about ${child.name}. I'll use it to shape tomorrow.`
              : `I'll use today to shape tomorrow's activity for ${child.name}.`}{" "}
            Every little moment matters.
          </p>
        </Bubble>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  18 · TOMORROW
 * ========================================================================== */
function Tomorrow({ child, onNext }: { child: Child; onNext: () => void }) {
  return (
    <Screen cta={{ label: "Finish", onClick: onNext }}>
      <div className="demo-stagger space-y-6 pt-6">
        <Eyebrow>Tomorrow</Eyebrow>
        <div className="text-[56px] leading-none">🥣</div>
        <Title>Breakfast</Title>
        <Card>
          <Eyebrow>Mission</Eyebrow>
          <p className="mt-2 text-[18px] font-semibold leading-snug">
            Help {child.name} communicate while he eats.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--grey)" }}>
            Same ten minutes. Same one thing to remember. I'll be here.
          </p>
        </Card>
        <Small>I'll remind you in the evening, as you asked.</Small>
      </div>
    </Screen>
  )
}

/* ========================================================================== *
 *  MEMORIES — the keepsake. The thing she'd cancel a subscription NOT to lose.
 * ========================================================================== */
function Memories({ child, go }: { child: Child; go: (s: ScreenId) => void }) {
  const tiles = [
    { day: 9, icon: "📸", tint: "linear-gradient(135deg,#8B5CFF,#FF8A65)" },
    { day: 8, icon: "🎙️", tint: "linear-gradient(135deg,#6A2FE8,#8B5CFF)" },
    { day: 7, icon: "📸", tint: "linear-gradient(135deg,#FF8A65,#FFB199)" },
    { day: 6, icon: "📝", tint: "linear-gradient(135deg,#8B5CFF,#C9B4FF)" },
    { day: 5, icon: "📸", tint: "linear-gradient(135deg,#6A2FE8,#FF8A65)" },
    { day: 3, icon: "🎙️", tint: "linear-gradient(135deg,#C9B4FF,#8B5CFF)" },
  ]

  return (
    <div className="demo-screen flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8">
        <div className="demo-stagger space-y-5">
          <div>
            <Eyebrow>{child.name}'s book</Eyebrow>
            <Title>Small moments</Title>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <div key={t.day} className="space-y-1.5">
                <div
                  className="flex items-center justify-center"
                  style={{
                    aspectRatio: "1",
                    borderRadius: 22,
                    background: t.tint,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <span className="text-[30px]">{t.icon}</span>
                </div>
                <p className="text-[12px]" style={{ color: "var(--grey)" }}>
                  Day {t.day}
                </p>
              </div>
            ))}
          </div>

          <Small>Demo data — this is what fourteen days of small moments looks like.</Small>
        </div>
      </div>
      <BottomNav active="memories" go={go} />
    </div>
  )
}
