import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowUp, Sparkles, Bot } from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Profiling content (Bahasa Malaysia)                                       */
/* -------------------------------------------------------------------------- */

const INTRO = {
  title: "Kenali Potensi Sebenar Anak Anda 🌟",
  description:
    "Selamat datang ke Tutur! Setiap kanak-kanak membesar mengikut kadar tersendiri. Sila jawab beberapa soalan ringkas tentang cara anak anda berkomunikasi. Ini membantu kami menyediakan aktiviti dan tips yang paling tepat untuk perkembangan mereka.",
  cta: "Jom Mula",
  note: "Hanya 5 minit.",
}

// Shared Likert-scale options for the 15 assessment questions.
const SCALE_OPTIONS = [
  "A. Tidak Pernah",
  "B. Kadang-kadang",
  "C. Kerap",
  "D. Sangat Kerap",
]

/**
 * `kind` drives how the answer area renders:
 *   age    — selection chips with a "Lain-lain" chip that reveals a text field
 *   text   — free-text input only (names)
 *   select — selection chips only (no free-text fallback)
 *   scale  — the shared 4-point Likert chips (assessment questions)
 */
type Question = {
  text: string
  kind: "age" | "text" | "select" | "scale"
  options?: string[]
  placeholder?: string
}

const QUESTIONS: Question[] = [
  /* ---- Demographics & Identity (Questions 1–5) ---- */
  {
    text: "Berapakah umur anak anda?",
    kind: "age",
    options: ["2 Tahun", "3 Tahun", "4 Tahun", "5 Tahun", "6 Tahun", "Lain-lain"],
  },
  {
    text: "Siapakah nama anak anda?",
    kind: "text",
    placeholder: "Masukkan nama anak anda...",
  },
  {
    text: "Siapakah nama anda?",
    kind: "text",
    placeholder: "Masukkan nama penuh anda...",
  },
  {
    text: "Apakah hubungan anda dengan anak tersebut?",
    kind: "select",
    options: ["Ibu bapa", "Datuk / Nenek", "Pengasuh", "Mak Cik / Pak Cik", "Saudara-mara"],
  },
  {
    text: "Berapakah umur anda?",
    kind: "select",
    options: ["21 - 30 tahun", "31 - 40 tahun", "41 - 50 tahun", "51 - 60 tahun", "61 - 70 tahun"],
  },
  /* ---- Speech & Communication Assessment (Questions 6–20) ---- */
  {
    text: "Adakah anak anda memberi respons seperti menggerakkan badan atau melihat anda apabila namanya dipanggil?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda mengenali suara yang sering didengar dengan mencari punca suara tersebut?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda menjadi senyap atau tersenyum apabila anda bercakap dengannya?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda melakukan aksi seperti melambai 'bye-bye', memberi salam 'hai', atau menunjukkan gaya meminta dukung?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda menunjukkan tanda menolak sesuatu dengan cara menggelengkan kepala?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda meminta sesuatu secara sengaja, contohnya memberikan bekas kepada anda untuk dibuka?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: 'Adakah anak anda boleh menjawab soalan "ya" atau "tidak", contohnya apabila ditanya "Adik nak makan biskut?"',
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda suka meniru bunyi haiwan, bunyi kereta, atau perkataan yang anda sebutkan?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda mula menggabungkan 2 perkataan untuk membina frasa mudah? (contohnya: 'nak susu', 'mama jom')?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: 'Adakah anak anda boleh memberi respons dengan betul kepada soalan seperti "apa?", "di mana?", dan "siapa?"',
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda mampu mendengar dan memahami cerita-cerita pendek yang dibacakan atau diceritakan?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: 'Adakah anak anda menggunakan 3 hingga 4 perkataan dalam satu ayat, contohnya "Mama jom taman"?',
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda boleh memberikan respons atau menjawab soalan berkaitan cerita pendek atau situasi yang dilihat/didengar?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: 'Adakah anak anda menggunakan kata hubung untuk membina ayat yang panjang dan kompleks (contoh: "saya rasa lapar, jadi saya makan banyak")?',
    kind: "scale",
    options: SCALE_OPTIONS,
  },
  {
    text: "Adakah anak anda menceritakan tentang emosi dan perasaan diri sendiri atau watak dalam sesuatu situasi yang berlaku?",
    kind: "scale",
    options: SCALE_OPTIONS,
  },
]

const TYPING_DELAY = 950 // ms the typing indicator shows before a question appears

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Phase = "intro" | "qa"
type Message =
  | { role: "ai"; text: string; qIndex: number }
  | { role: "user"; text: string }

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Chat({
  onComplete,
}: {
  onComplete: (answers: string[]) => void
}) {
  const [phase, setPhase] = useState<Phase>("intro")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentIndex, setCurrentIndex] = useState(0) // question awaiting an answer
  const [typing, setTyping] = useState(false)
  const [awaiting, setAwaiting] = useState(false) // true once a question is on screen & answerable
  const [input, setInput] = useState("")
  const [otherActive, setOtherActive] = useState(false) // age "Lain-lain" → manual entry

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const otherInputRef = useRef<HTMLInputElement | null>(null)
  const answered = messages.filter((m) => m.role === "user").length
  const progress = (answered / QUESTIONS.length) * 100
  const current = QUESTIONS[currentIndex]

  // Reveal a question with a brief "typing" indicator beforehand.
  function askQuestion(index: number) {
    setAwaiting(false)
    setTyping(true)
    setOtherActive(false) // collapse any open manual-entry field
    const id = setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        { role: "ai", text: QUESTIONS[index].text, qIndex: index },
      ])
      setCurrentIndex(index)
      setAwaiting(true)
    }, TYPING_DELAY)
    return id
  }

  // Kick off the first question when the conversation starts.
  useEffect(() => {
    if (phase !== "qa") return
    const id = askQuestion(0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, typing])

  function submitAnswer(answer: string) {
    const value = answer.trim()
    if (!value || !awaiting) return

    setMessages((m) => [...m, { role: "user", text: value }])
    setInput("")
    setAwaiting(false)

    const next = currentIndex + 1
    if (next < QUESTIONS.length) {
      askQuestion(next)
    } else {
      // Final answer submitted → hand the full ordered answer set to the
      // scoring engine in ProfilingResults (which owns the analysis screen).
      const answers = [
        ...messages.filter((m) => m.role === "user").map((m) => m.text),
        value,
      ]
      onComplete(answers)
    }
  }

  function handleInputSubmit(e: FormEvent) {
    e.preventDefault()
    submitAnswer(input)
  }

  /* ---------------------------- Intro screen ---------------------------- */
  if (phase === "intro") {
    return (
      <main className="flex min-h-screen flex-col justify-center px-7 py-12">
        <div
          className="animate-scale-in rounded-3xl glass-strong p-7 text-center"
          style={{ animationFillMode: "both" }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 animate-float items-center justify-center rounded-2xl glass shadow-glow-cyan">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-gradient">
            {INTRO.title}
          </h1>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
            {INTRO.description}
          </p>
          <Button
            size="lg"
            onClick={() => setPhase("qa")}
            className="shimmer-overlay mt-8 w-full animate-pulse-glow rounded-2xl text-base font-semibold"
          >
            {INTRO.cta}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">{INTRO.note}</p>
        </div>
      </main>
    )
  }

  /* ------------------------------ QA chat ------------------------------ */
  return (
    <main className="flex h-screen flex-col">
      {/* Progress header */}
      <header className="shrink-0 border-b border-border/60 bg-background/70 px-5 pb-3 pt-5 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg glass shadow-glow-cyan">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="font-medium tracking-tight">Profil Tutur</span>
          </div>
          <span className="tabular-nums text-muted-foreground">
            {answered}/{QUESTIONS.length}
          </span>
        </div>
        <Progress value={progress} />
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
        {current && current.kind !== "text" && (
          <div
            className={[
              "flex flex-wrap gap-2 transition-opacity duration-300",
              otherActive ? "mb-3" : "",
              awaiting ? "opacity-100" : "pointer-events-none opacity-40",
            ].join(" ")}
          >
            {current.options?.map((opt, i) => {
              // On the age question, "Lain-lain" opens a manual-entry field
              // instead of submitting straight away.
              const isOtherChip = current.kind === "age" && opt === "Lain-lain"
              const selected = isOtherChip && otherActive
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={!awaiting}
                  onClick={() => {
                    if (isOtherChip) {
                      setOtherActive(true)
                      setInput("")
                      setTimeout(() => otherInputRef.current?.focus(), 50)
                    } else {
                      submitAnswer(opt)
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
        {current && (current.kind === "text" || otherActive) && (
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
                  ? "Taip umur anak anda…"
                  : current.placeholder ?? "Taip jawapan anda…"
              }
              autoFocus={current.kind === "text"}
              className="h-12 flex-1 rounded-2xl glass px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:shadow-glow-cyan disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!awaiting || !input.trim()}
              className="h-12 w-12 shrink-0 rounded-2xl"
              aria-label="Hantar jawapan"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        )}
      </footer>
    </main>
  )
}
