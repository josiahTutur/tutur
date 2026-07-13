/* ========================================================================== *
 *  HELP · Maya's FAQ — a chat-shaped answer surface.
 *
 *  Opens from the Maya avatar in the top bar. Closes with the X.
 *
 *  ── TAP ONLY. NO TEXT INPUT. ──────────────────────────────────────────────
 *  There is deliberately nowhere to type. An input box is a PROMISE — it says
 *  "ask me anything" — and the moment a parent types a question we haven't
 *  written, we'd have to answer it with silence. On a product where a frightened
 *  parent might type "is my child autistic", silence is the worst possible reply.
 *
 *  So: every question on this screen is one Maya can actually answer.
 *
 *  ── AND NO LANGUAGE MODEL ─────────────────────────────────────────────────
 *  Spec §1.3: "Maya: scripted dialogue trees, tap-to-answer. No generative AI in
 *  the pilot." Every answer is written, reviewable, and signed off by an SLT. A
 *  confidently-wrong generated answer here would not be a bug — it would be harm.
 *
 *  ── THE PAUSE ─────────────────────────────────────────────────────────────
 *  Maya "types" for a second before every message — including her greeting.
 *  It is not a loading spinner; nothing is loading, the answers are already in
 *  memory. An answer that appears INSTANTLY reads as a lookup; one that arrives
 *  after a beat reads as someone thinking about what you asked. On a screen a
 *  worried parent comes to, that beat is most of the difference between a system
 *  and a person.
 * ========================================================================== */

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Sparkles, X } from "lucide-react"

import { FAQ, FAQ_CATEGORIES, type FaqCategory, type FaqEntry } from "@/content/faq"
import { useLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** How long Maya "thinks" before each message. */
const TYPING_MS = 600

const STR = {
  ms: {
    title: "Tanya Maya",
    subtitle: "Soalan lazim",
    intro: "Hai! Ada apa-apa yang anda tertanya-tanya? Pilih satu soalan di bawah.",
  },
  en: {
    title: "Ask Maya",
    subtitle: "Common questions",
    intro: "Hi! Is there something you're wondering about? Pick a question below.",
  },
}

/** One exchange. `a: null` = Maya is still typing. */
interface Turn {
  q: string
  a: string | null
}

export function MayaFaq({
  onClose,
  onAsk,
}: {
  onClose: () => void
  /** `faq_opened{topic}` — WHAT parents ask is a pilot finding (spec §6.1). */
  onAsk?: (id: string) => void
}) {
  const { lang } = useLang()
  const t = STR[lang]

  // Maya types her greeting too — she doesn't appear mid-sentence.
  const [introReady, setIntroReady] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [typing, setTyping] = useState(false)
  const [openCat, setOpenCat] = useState<FaqCategory | null>(null)

  const threadEnd = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  /** Group by situation — a parent scans by "what's wrong", not by scrolling. */
  const grouped = useMemo(() => {
    const g = new Map<FaqCategory, FaqEntry[]>()
    for (const e of FAQ) g.set(e.category, [...(g.get(e.category) ?? []), e])
    return [...g.entries()]
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setIntroReady(true), TYPING_MS)
    timers.current.push(id)
    // Never leave a timer running into an unmounted component.
    return () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [])

  const scrollDown = () => {
    const id = window.setTimeout(
      () => threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
      50
    )
    timers.current.push(id)
  }

  const busy = typing || !introReady

  function ask(e: FaqEntry) {
    if (busy) return // one question at a time — Maya isn't a search engine

    onAsk?.(e.id)
    setTurns((prev) => [...prev, { q: e.q[lang], a: null }])
    setTyping(true)
    scrollDown()

    const id = window.setTimeout(() => {
      setTurns((prev) =>
        prev.map((turn, i) => (i === prev.length - 1 ? { ...turn, a: e.a[lang] } : turn))
      )
      setTyping(false)
      scrollDown()
    }, TYPING_MS)
    timers.current.push(id)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t.title}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <img
            src="/maya.png"
            alt=""
            aria-hidden
            className="size-10 shrink-0 rounded-full border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold leading-tight text-foreground">
              {t.title}
            </p>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Thread */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {introReady ? <MayaBubble>{t.intro}</MayaBubble> : <TypingBubble />}

          {turns.map((turn, i) => (
            <div key={i} className="mt-4">
              <ParentBubble>{turn.q}</ParentBubble>
              <div className="mt-3">
                {turn.a === null ? <TypingBubble /> : <MayaBubble>{turn.a}</MayaBubble>}
              </div>
            </div>
          ))}
          <div ref={threadEnd} />
        </div>

        {/* The questions — collapsed by category. Tap a title to open it. */}
        <div className="max-h-[45vh] shrink-0 overflow-y-auto border-t border-border bg-card/50 px-4 py-3">
          {/*
            The chip names the LIST, not the panel. Everything above it is Maya
            talking; everything below it is the set of questions she can answer.
            It sticks so that stays true once the list is scrolled.
          */}
          <div className="sticky top-0 z-10 -mx-4 -mt-3 mb-2 bg-card/50 px-4 pb-2 pt-3 backdrop-blur-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.08)] px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" aria-hidden />
              Smart F&amp;Q
            </span>
          </div>

          {grouped.map(([cat, entries]) => {
            const open = openCat === cat
            return (
              <section key={cat} className="mb-1.5 last:mb-0">
                <button
                  type="button"
                  onClick={() => setOpenCat(open ? null : cat)}
                  aria-expanded={open}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                    open ? "bg-[hsl(var(--primary)/0.08)]" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-[13px] font-bold",
                      open ? "text-primary" : "text-foreground"
                    )}
                  >
                    {FAQ_CATEGORIES[cat][lang]}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {entries.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-500",
                        open && "rotate-180"
                      )}
                    />
                  </span>
                </button>

                {/*
                  Height animation without knowing the height.
                  A closed section is `grid-rows-[0fr]`, an open one `grid-rows-[1fr]`
                  — the row itself is the animated value, so it resolves to the
                  content's natural height without us measuring anything. (`h-0 →
                  h-auto` cannot transition; `max-h-[999px]` would make the timing
                  depend on how many questions the category happens to have.)

                  The panel stays MOUNTED so it has something to collapse FROM —
                  `{open && …}` would just yank it out. Hidden buttons are taken out
                  of the tab order by `inert`.
                */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className={cn(
                        "space-y-1.5 pb-0.5 pl-1 pt-1.5 transition-opacity duration-500",
                        open ? "opacity-100" : "opacity-0"
                      )}
                      inert={!open}
                    >
                      {entries.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => ask(e)}
                          disabled={busy}
                          className={cn(
                            "w-full rounded-xl border-[1.5px] border-border bg-card px-3 py-2 text-left text-[13px] font-medium",
                            "transition-all hover:border-primary hover:bg-[hsl(var(--primary)/0.06)] active:scale-[0.99]",
                            busy && "cursor-not-allowed opacity-50 hover:border-border"
                          )}
                        >
                          {e.q[lang]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Bubbles                                                                    */
/*                                                                            */
/*  Both have a real tail — a square rotated 45° and tucked half-behind the    */
/*  bubble, so only its outer corner shows. Without the tail these are just    */
/*  rounded boxes; with it, the two sides of the conversation point at each    */
/*  other and it reads as talking.                                            */
/* -------------------------------------------------------------------------- */

/** Maya's voice. Avatar left, tail pointing back at her. */
function MayaBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <img
        src="/maya.png"
        alt=""
        aria-hidden
        className="size-7 shrink-0 rounded-full border border-border object-cover"
      />
      {/* Tail shows its LEFT + BOTTOM borders once rotated → a notch pointing left. */}
      <div className="relative max-w-[85%] whitespace-pre-line rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
        <span
          className="absolute -left-[6px] top-3 size-2.5 rotate-45 border-b border-l border-border bg-card"
          aria-hidden
        />
        {children}
      </div>
    </div>
  )
}

/** The parent's question. Right-aligned, their voice, tail pointing right. */
function ParentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      {/* No border on this one — it's solid primary, so the tail is just a square. */}
      <div className="relative max-w-[85%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground">
        <span
          className="absolute -right-[3px] top-3 size-2 rotate-45 rounded-[1px] bg-primary"
          aria-hidden
        />
        {children}
      </div>
    </div>
  )
}

/** Maya thinking. Three dots, staggered — the universal "someone is replying". */
function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <img
        src="/maya.png"
        alt=""
        aria-hidden
        className="size-7 shrink-0 rounded-full border border-border object-cover"
      />
      <div
        className="relative flex items-center gap-1 rounded-2xl border border-border bg-card px-3.5 py-3"
        role="status"
        aria-label="Maya is typing"
      >
        <span
          className="absolute -left-[6px] top-3 size-2.5 rotate-45 border-b border-l border-border bg-card"
          aria-hidden
        />
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  )
}
