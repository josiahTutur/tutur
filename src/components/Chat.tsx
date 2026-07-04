import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, Sparkles, Bot } from "lucide-react"
import { useLang } from "@/lib/i18n"

/* -------------------------------------------------------------------------- */
/*  UI chrome strings (co-located local table)                                */
/* -------------------------------------------------------------------------- */

const STR = {
  ms: {
    profileTitle: "Profil Tutur",
    agePlaceholder: "Taip umur anak anda…",
    answerPlaceholder: "Taip jawapan anda…",
    sendAnswer: "Hantar jawapan",
  },
  en: {
    profileTitle: "Tutur Profile",
    agePlaceholder: "Type your child's age…",
    answerPlaceholder: "Type your answer…",
    sendAnswer: "Send answer",
  },
} as const

type Lang = keyof typeof STR

/* -------------------------------------------------------------------------- */
/*  Profiling content (bilingual: Bahasa Malaysia + English)                  */
/* -------------------------------------------------------------------------- */

/**
 * A localisable pair of strings. `ms` is the canonical value that feeds the
 * scoring engine downstream — never translate it away.
 */
type Loc = { ms: string; en: string }
type LocArr = { ms: string[]; en: string[] }

// Shared Likert-scale options for the 15 assessment questions.
// IMPORTANT: the Malay (`ms`) strings are the canonical values scored by
// ProfilingResults (answerToScore matches "sangat kerap"/"kerap"/"kadang"/
// "tidak pernah"). The stored answer always uses the `ms` label; English users
// merely see the `en` label.
const SCALE_OPTIONS: LocArr = {
  ms: ["A. Tidak Pernah", "B. Kadang-kadang", "C. Kerap", "D. Sangat Kerap"],
  en: ["A. Never", "B. Sometimes", "C. Often", "D. Very Often"],
}

/**
 * `kind` drives how the answer area renders:
 *   age    — selection chips with a "Lain-lain" chip that reveals a text field
 *   text   — free-text input only (names)
 *   select — selection chips only (no free-text fallback)
 *   scale  — the shared 4-point Likert chips (assessment questions)
 */
export type Question = {
  text: Loc
  kind: "age" | "text" | "select" | "scale"
  options?: LocArr
  placeholder?: Loc
}

export const QUESTIONS: Question[] = [
  /* ---- Demographics & Identity (Questions 1–5) ---- */
  {
    text: { ms: "Berapakah umur anak anda?", en: "How old is your child?" },
    kind: "age",
    options: {
      ms: ["2 Tahun", "3 Tahun", "4 Tahun", "5 Tahun", "6 Tahun", "Lain-lain"],
      en: ["2 Years", "3 Years", "4 Years", "5 Years", "6 Years", "Other"],
    },
  },
  {
    text: { ms: "Siapakah nama anak anda?", en: "What is your child's name?" },
    kind: "text",
    placeholder: {
      ms: "Masukkan nama anak anda...",
      en: "Enter your child's name...",
    },
  },
  {
    text: { ms: "Siapakah nama anda?", en: "What is your name?" },
    kind: "text",
    placeholder: {
      ms: "Masukkan nama penuh anda...",
      en: "Enter your full name...",
    },
  },
  {
    text: {
      ms: "Apakah hubungan anda dengan anak tersebut?",
      en: "What is your relationship to the child?",
    },
    kind: "select",
    options: {
      ms: [
        "Ibu",
        "Bapa",
        "Datuk",
        "Nenek",
        "Mak Cik",
        "Pak Cik",
        "Pengasuh",
        "Saudara-mara",
        "Lain-lain",
      ],
      en: [
        "Mother",
        "Father",
        "Grandfather",
        "Grandmother",
        "Aunt",
        "Uncle",
        "Caregiver",
        "Relative",
        "Other",
      ],
    },
    placeholder: {
      ms: "Nyatakan hubungan anda…",
      en: "Describe your relationship…",
    },
  },
  {
    text: { ms: "Berapakah umur anda?", en: "How old are you?" },
    kind: "select",
    options: {
      ms: ["21 - 30 tahun", "31 - 40 tahun", "41 - 50 tahun", "51 - 60 tahun", "61 - 70 tahun"],
      en: [
        "21 - 30 years",
        "31 - 40 years",
        "41 - 50 years",
        "51 - 60 years",
        "61 - 70 years",
      ],
    },
  },
  /* ---- Speech & Communication Assessment (Questions 6–20) ---- */
  {
    text: {
      ms: "Adakah anak anda memberi respons seperti menggerakkan badan atau melihat anda apabila namanya dipanggil?",
      en: "Does your child respond — such as moving or looking at you — when their name is called?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda mengenali suara yang sering didengar dengan mencari punca suara tersebut?",
      en: "Does your child recognise familiar sounds by searching for where they come from?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda menjadi senyap atau tersenyum apabila anda bercakap dengannya?",
      en: "Does your child become quiet or smile when you talk to them?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda melakukan aksi seperti melambai 'bye-bye', memberi salam 'hai', atau menunjukkan gaya meminta dukung?",
      en: "Does your child use gestures like waving 'bye-bye', greeting 'hi', or reaching up to be carried?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda menunjukkan tanda menolak sesuatu dengan cara menggelengkan kepala?",
      en: "Does your child show they are refusing something by shaking their head?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda meminta sesuatu secara sengaja, contohnya memberikan bekas kepada anda untuk dibuka?",
      en: "Does your child ask for things on purpose, for example handing you a container to open?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: 'Adakah anak anda boleh menjawab soalan "ya" atau "tidak", contohnya apabila ditanya "Adik nak makan biskut?"',
      en: 'Can your child answer "yes" or "no" questions, for example when asked "Do you want a biscuit?"',
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda suka meniru bunyi haiwan, bunyi kereta, atau perkataan yang anda sebutkan?",
      en: "Does your child enjoy imitating animal sounds, car sounds, or words you say?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda mula menggabungkan 2 perkataan untuk membina frasa mudah? (contohnya: 'nak susu', 'mama jom')?",
      en: "Has your child started combining 2 words into simple phrases? (for example: 'want milk', 'mama come')?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: 'Adakah anak anda boleh memberi respons dengan betul kepada soalan seperti "apa?", "di mana?", dan "siapa?"',
      en: 'Can your child respond correctly to questions like "what?", "where?", and "who?"',
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda mampu mendengar dan memahami cerita-cerita pendek yang dibacakan atau diceritakan?",
      en: "Is your child able to listen to and understand short stories that are read or told to them?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: 'Adakah anak anda menggunakan 3 hingga 4 perkataan dalam satu ayat, contohnya "Mama jom taman"?',
      en: 'Does your child use 3 to 4 words in a sentence, for example "Mama come park"?',
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda boleh memberikan respons atau menjawab soalan berkaitan cerita pendek atau situasi yang dilihat/didengar?",
      en: "Can your child respond to or answer questions about a short story or a situation they have seen or heard?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: 'Adakah anak anda menggunakan kata hubung untuk membina ayat yang panjang dan kompleks (contoh: "saya rasa lapar, jadi saya makan banyak")?',
      en: 'Does your child use connecting words to build longer, more complex sentences (e.g. "I feel hungry, so I ate a lot")?',
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: {
      ms: "Adakah anak anda menceritakan tentang emosi dan perasaan diri sendiri atau watak dalam sesuatu situasi yang berlaku?",
      en: "Does your child talk about their own emotions and feelings, or those of a character, in a situation that happens?",
    },
    kind: "scale",
    options: SCALE_OPTIONS,
  },
]

const TYPING_DELAY = 950 // ms the typing indicator shows before a question appears

// The profiling progress is shown as 4 equal bars (blocks of 5 questions).
const PROGRESS_SEGMENTS = 4

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Message =
  | { role: "ai"; text: string; qIndex: number }
  // `text` is what is shown in the bubble (translated); `value` is the
  // canonical answer fed to the scoring engine. For chip answers `value` is the
  // Malay label; for free-text answers `value` equals `text`.
  | { role: "user"; text: string; value: string }

/* -------------------------------------------------------------------------- */
/*  Resume persistence                                                        */
/* -------------------------------------------------------------------------- */

interface ChatSnapshot {
  messages: Message[]
  currentIndex: number
  input: string
  otherActive: boolean
}

/** Read a saved chat snapshot, validated against the current question set. */
function readChat(
  key: string,
  questionCount: number,
  startIndex: number
): ChatSnapshot | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const v = JSON.parse(raw)
      if (
        Array.isArray(v?.messages) &&
        typeof v.currentIndex === "number" &&
        v.currentIndex >= startIndex &&
        v.currentIndex < questionCount
      ) {
        return {
          messages: v.messages as Message[],
          currentIndex: v.currentIndex,
          input: typeof v.input === "string" ? v.input : "",
          otherActive: !!v.otherActive,
        }
      }
    }
  } catch {
    /* corrupt or unavailable — start fresh */
  }
  return null
}

function clearChat(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Clears the profiling chat's saved progress (used on sign-out). */
export function clearChatProgress() {
  clearChat("tutur.chat.v1")
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Chat({
  onComplete,
  questions = QUESTIONS,
  startAnswers,
  intro,
  title,
  badge,
  persistKey,
}: {
  onComplete: (answers: string[]) => void
  /** Override the question set (e.g. the first 5 for the welcome step). */
  questions?: Question[]
  /** Answers already collected (e.g. the welcome's first 5) — start after them
   *  and prepend them to the final result, so they're never re-asked. */
  startAnswers?: string[]
  /** Optional Maya welcome bubbles shown, one at a time, before question 1. */
  intro?: string[]
  /** Header title override. */
  title?: string
  /** Small badge beside the title (e.g. "Founding Family"). */
  badge?: string
  /** When set, the conversation is saved to this localStorage key and resumed
   *  from it on refresh (skipping the intro reveal). */
  persistKey?: string
}) {
  const { lang } = useLang()
  const s = STR[lang as Lang]
  const startIndex = startAnswers?.length ?? 0

  // Restore a saved conversation once, so a refresh resumes mid-profiling.
  const [hydrated] = useState<ChatSnapshot | null>(() =>
    persistKey ? readChat(persistKey, questions.length, startIndex) : null
  )

  const [messages, setMessages] = useState<Message[]>(
    () => hydrated?.messages ?? []
  )
  const [currentIndex, setCurrentIndex] = useState(
    hydrated?.currentIndex ?? startIndex
  ) // question awaiting an answer
  const [typing, setTyping] = useState(false)
  const [awaiting, setAwaiting] = useState<boolean>(!!hydrated) // resumed → answerable
  const [input, setInput] = useState(hydrated?.input ?? "")
  const [otherActive, setOtherActive] = useState<boolean>(
    hydrated?.otherActive ?? false
  ) // age "Lain-lain" → manual entry

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const otherInputRef = useRef<HTMLInputElement | null>(null)
  const answered = startIndex + messages.filter((m) => m.role === "user").length
  // A question bubble has appeared (vs. the welcome intro bubbles).
  const questionAsked = messages.some((m) => m.role === "ai" && m.qIndex >= 0)
  const current = questions[currentIndex]

  // Progress bar segments — one block of 5 for the profiling, or one per
  // question for a short set (e.g. the 5-question welcome).
  const segCount = questions.length <= 6 ? questions.length : PROGRESS_SEGMENTS
  const perSeg = questions.length / segCount

  // Reveal a question with a brief "typing" indicator beforehand.
  function askQuestion(index: number) {
    setAwaiting(false)
    setTyping(true)
    setOtherActive(false) // collapse any open manual-entry field
    const id = setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        { role: "ai", text: questions[index].text[lang as Lang], qIndex: index },
      ])
      setCurrentIndex(index)
      setAwaiting(true)
    }, TYPING_DELAY)
    return id
  }

  // Persist an answerable snapshot so a refresh resumes at this exact question
  // with any typed text intact. Only saved while a question is on screen and
  // awaiting an answer, so restored state is always consistent.
  useEffect(() => {
    if (!persistKey || !awaiting) return
    try {
      localStorage.setItem(
        persistKey,
        JSON.stringify({ messages, currentIndex, input, otherActive })
      )
    } catch {
      /* ignore persistence failures */
    }
  }, [persistKey, awaiting, messages, currentIndex, input, otherActive])

  // On mount: stage the welcome bubbles (if any), then ask the first question.
  // Skipped entirely when resuming from a saved snapshot.
  useEffect(() => {
    if (hydrated) return
    const timers: ReturnType<typeof setTimeout>[] = []
    if (intro && intro.length) {
      intro.forEach((line, i) => {
        timers.push(
          setTimeout(
            () => {
              setMessages((m) => [...m, { role: "ai", text: line, qIndex: -1 }])
              if (i === intro.length - 1) timers.push(askQuestion(startIndex))
            },
            500 + i * 1100
          )
        )
      })
    } else {
      timers.push(askQuestion(startIndex))
    }
    return () => timers.forEach((t) => clearTimeout(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, typing])

  // `display` is what appears in the chat bubble (translated); `canonical` is
  // the value fed to the scoring engine. They differ only for chip answers,
  // where `canonical` is the Malay label the scorer matches against. For
  // free-text answers, pass the same string as both (canonical omitted).
  function submitAnswer(display: string, canonical?: string) {
    const text = display.trim()
    if (!text || !awaiting) return
    const value = (canonical ?? display).trim()

    setMessages((m) => [...m, { role: "user", text, value }])
    setInput("")
    setAwaiting(false)

    const next = currentIndex + 1
    if (next < questions.length) {
      askQuestion(next)
    } else {
      // Final answer submitted → hand the full ordered answer set to the
      // scoring engine in ProfilingResults (which owns the analysis screen).
      // Use each message's canonical `value` (Malay for chips) so scoring is
      // language-independent.
      if (persistKey) clearChat(persistKey) // conversation done — drop the snapshot
      const answers = [
        ...(startAnswers ?? []),
        ...messages
          .filter((m): m is Extract<Message, { role: "user" }> => m.role === "user")
          .map((m) => m.value),
        value,
      ]
      onComplete(answers)
    }
  }

  function handleInputSubmit(e: FormEvent) {
    e.preventDefault()
    submitAnswer(input)
  }

  /* ------------------------------ QA chat ------------------------------ */
  return (
    <main className="flex h-screen flex-col">
      {/* Progress header */}
      <header className="shrink-0 border-b border-border/60 bg-background/70 px-5 pb-3 pt-5 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg glass shadow-glow-cyan">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="font-display font-semibold tracking-tight">
            {title ?? s.profileTitle}
          </span>
          {badge && (
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                background: "hsl(var(--primary) / 0.14)",
                color: "hsl(var(--primary))",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Progress segments — one per block of 5 (profiling) or per question
            (short welcome set). A segment fills as its questions are answered. */}
        <div className="flex items-center gap-2">
          {Array.from({ length: segCount }, (_, seg) => {
            const fill =
              Math.max(0, Math.min(1, (answered - seg * perSeg) / perSeg)) * 100
            return (
              <div
                key={seg}
                className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${fill}%` }}
                />
              </div>
            )
          })}
        </div>
      </header>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-6"
      >
        {messages.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="flex items-end gap-2.5">
              <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full glass shadow-glow-cyan">
                <Bot className="h-4 w-4 text-primary" />
              </span>
              <div className="max-w-[80%] animate-fade-up rounded-2xl rounded-bl-md glass-strong px-4 py-3 text-sm leading-relaxed">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] animate-fade-up rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow-cyan">
                {m.text}
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-end gap-2.5">
            <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full glass shadow-glow-cyan">
              <Bot className="h-4 w-4 text-primary" />
            </span>
            <div className="flex animate-fade-in items-center gap-1.5 rounded-2xl rounded-bl-md glass-strong px-4 py-4">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-bounce rounded-full bg-primary/80"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Answer area — rendered according to the question's `kind` */}
      <footer className="shrink-0 border-t border-border/60 bg-background/70 px-5 pb-6 pt-4 backdrop-blur-xl">
        {/* Selection chips — for age / select / scale questions */}
        {current && current.kind !== "text" && questionAsked && (
          <div
            className={[
              "flex flex-wrap gap-2 transition-opacity duration-300",
              otherActive ? "mb-3" : "",
              awaiting ? "opacity-100" : "pointer-events-none opacity-40",
            ].join(" ")}
          >
            {current.options?.[lang as Lang].map((opt, i) => {
              // Canonical Malay label at the same index — drives "Other"
              // detection and the value stored for scoring.
              const canonical = current.options!.ms[i]
              // "Lain-lain" opens a manual-entry field (age & relationship)
              // instead of submitting straight away.
              const isOtherChip = canonical === "Lain-lain"
              const selected = isOtherChip && otherActive
              return (
                <button
                  key={canonical}
                  type="button"
                  disabled={!awaiting}
                  onClick={() => {
                    if (isOtherChip) {
                      setOtherActive(true)
                      setInput("")
                      setTimeout(() => otherInputRef.current?.focus(), 50)
                    } else {
                      submitAnswer(opt, canonical)
                    }
                  }}
                  className={[
                    "animate-fade-up rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
                    selected
                      ? "glass-strong text-primary shadow-glow-cyan"
                      : "glass text-foreground/90 hover:border-primary/50 hover:text-primary hover:shadow-glow-cyan",
                  ].join(" ")}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        )}

        {/* Free-text input — always for `text` questions, and for the age
            question once "Lain-lain" has been chosen. */}
        {current && (current.kind === "text" || otherActive) && questionAsked && (
          <form
            onSubmit={handleInputSubmit}
            className={[
              "flex items-center gap-2",
              otherActive ? "animate-fade-up" : "",
            ].join(" ")}
            style={otherActive ? { animationFillMode: "both" } : undefined}
          >
            <input
              ref={otherInputRef}
              type="text"
              inputMode={current.kind === "age" ? "numeric" : "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!awaiting}
              placeholder={
                current.kind === "age"
                  ? s.agePlaceholder
                  : current.placeholder?.[lang as Lang] ?? s.answerPlaceholder
              }
              autoFocus={current.kind === "text"}
              className="h-12 flex-1 rounded-2xl glass px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:shadow-glow-cyan disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!awaiting || !input.trim()}
              className="h-12 w-12 shrink-0 rounded-2xl"
              aria-label={s.sendAnswer}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        )}
      </footer>
    </main>
  )
}
