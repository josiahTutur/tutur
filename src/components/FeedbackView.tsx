import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { saveFeedback } from "@/lib/db"
import { SECTIONS, ALL_QUESTIONS } from "@/lib/survey"
import { useLang, pick } from "@/lib/i18n"
import { Check, Heart, Loader2, Send } from "lucide-react"

const STR = {
  ms: {
    heading: "Borang Maklum Balas Pengguna Tutur",
    intro:
      "Terima kasih kerana mencuba Tutur. Maklum balas anda amat penting untuk membantu kami menambah baik pengalaman dan memastikan Tutur benar-benar membantu menyokong perkembangan komunikasi anak.",
    submit: "Hantar Maklum Balas",
    submitting: "Menghantar…",
    error: "Gagal menghantar maklum balas. Sila cuba lagi.",
    thankYou: "Terima kasih! 💛",
    thankYouBody:
      "Maklum balas anda telah dihantar. Setiap pandangan anda membantu kami menjadikan Tutur lebih baik untuk anda dan anak anda.",
    answerPlaceholder: "Jawapan anda…",
    otherPlaceholder: "Lain-lain…",
    optionalPlaceholder: "Pilihan (boleh dikosongkan)…",
    progressAnswered: "soalan dijawab",
    progressRequirement: "sekurang-kurangnya soalan 1 diperlukan",
  },
  en: {
    heading: "Tutur User Feedback Form",
    intro:
      "Thank you for trying Tutur. Your feedback matters a great deal — it helps us improve the experience and make sure Tutur truly supports your child's communication development.",
    submit: "Send Feedback",
    submitting: "Sending…",
    error: "Failed to send feedback. Please try again.",
    thankYou: "Thank you! 💛",
    thankYouBody:
      "Your feedback has been sent. Every bit of your input helps us make Tutur better for you and your child.",
    answerPlaceholder: "Your answer…",
    otherPlaceholder: "Other…",
    optionalPlaceholder: "Optional (may be left blank)…",
    progressAnswered: "questions answered",
    progressRequirement: "at least question 1 is required",
  },
} as const

/* ========================================================================== *
 *  FeedbackView — Borang Maklum Balas Pengguna Tutur.
 *
 *  A data-driven survey (3 sections) saved to Supabase as one JSON row. Scales,
 *  single/multi choice, and open-text are all rendered from the shared SECTIONS
 *  data (see src/lib/survey.ts) so the survey can change without touching the
 *  rendering logic — and the admin Wawasan dashboard reads the same definition.
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"

export default function FeedbackView() {
  const { lang } = useLang()
  const s = STR[lang]
  const [res, setRes] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setVal(id: string, value: string | string[]) {
    setRes((p) => ({ ...p, [id]: value }))
  }
  function toggleMulti(id: string, opt: string) {
    setRes((p) => {
      const cur = Array.isArray(p[id]) ? (p[id] as string[]) : []
      return {
        ...p,
        [id]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt],
      }
    })
  }

  // How many of the 20 main questions have an answer (drives the progress bar).
  const answered = useMemo(
    () =>
      ALL_QUESTIONS.filter((q) => {
        const v = res[q.id]
        return Array.isArray(v) ? v.length > 0 : !!v
      }).length,
    [res]
  )
  const canSubmit = !!res["q1"] && !submitting

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const ok = await saveFeedback(res)
    setSubmitting(false)
    if (!ok) {
      setError(s.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div
          className="max-w-sm animate-fade-up rounded-3xl glass-strong p-8 text-center"
          style={{ animationFillMode: "both" }}
        >
          <span
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: `hsl(${TEAL} / 0.18)`,
              boxShadow: `0 0 36px -6px hsl(${TEAL} / 0.6)`,
            }}
          >
            <Heart className="h-7 w-7" style={{ color: `hsl(${TEAL})` }} />
          </span>
          <h2 className="mt-5 text-xl font-bold tracking-tight">{s.thankYou}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {s.thankYouBody}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Intro */}
        <header>
          <h2 className="text-lg font-bold tracking-tight">
            {s.heading}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {s.intro}
          </p>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.key} className="space-y-5">
            <h3
              className="rounded-2xl px-4 py-2.5 text-sm font-bold"
              style={{ background: `hsl(${CORAL} / 0.12)`, color: `hsl(${CORAL})` }}
            >
              {pick(section.title, lang)}
            </h3>

            {section.questions.map((q) => {
              // Options: display in the current language, but STORE the canonical
              // Bahasa Malaysia value so analytics aggregate consistently.
              const optsLoc = q.scale ?? q.options
              const display = optsLoc ? pick(optsLoc, lang) : []
              const canonical = optsLoc ? optsLoc.ms : []
              return (
              <div key={q.id} className="rounded-3xl glass-strong p-5">
                <p className="text-sm font-semibold leading-relaxed">
                  <span style={{ color: `hsl(${CORAL})` }}>{q.no}.</span>{" "}
                  {pick(q.text, lang)}
                </p>

                <div className="mt-3.5 space-y-2">
                  {/* Scale + single choice — selectable rows */}
                  {(q.type === "scale" || q.type === "single") &&
                    display.map((label, i) => {
                      const value = canonical[i]
                      return (
                        <OptionRow
                          key={value}
                          label={label}
                          selected={res[q.id] === value}
                          shape="radio"
                          onClick={() => setVal(q.id, value)}
                        />
                      )
                    })}

                  {/* Multi choice — checkboxes */}
                  {q.type === "multi" &&
                    display.map((label, i) => {
                      const value = canonical[i]
                      const cur = Array.isArray(res[q.id])
                        ? (res[q.id] as string[])
                        : []
                      return (
                        <OptionRow
                          key={value}
                          label={label}
                          selected={cur.includes(value)}
                          shape="check"
                          onClick={() => toggleMulti(q.id, value)}
                        />
                      )
                    })}

                  {/* "Lain-lain" free text for choice questions */}
                  {q.other && (
                    <input
                      type="text"
                      value={(res[`${q.id}_other`] as string) ?? ""}
                      onChange={(e) => setVal(`${q.id}_other`, e.target.value)}
                      placeholder={s.otherPlaceholder}
                      className="w-full rounded-2xl bg-[hsl(252_32%_97%)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                      style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.25)` }}
                    />
                  )}

                  {/* Standalone open-text question */}
                  {q.type === "text" &&
                    (q.long ? (
                      <textarea
                        rows={3}
                        value={(res[q.id] as string) ?? ""}
                        onChange={(e) => setVal(q.id, e.target.value)}
                        placeholder={s.answerPlaceholder}
                        className="w-full resize-none rounded-2xl bg-[hsl(252_32%_97%)] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.25)` }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={(res[q.id] as string) ?? ""}
                        onChange={(e) => setVal(q.id, e.target.value)}
                        placeholder={s.answerPlaceholder}
                        className="w-full rounded-2xl bg-[hsl(252_32%_97%)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.25)` }}
                      />
                    ))}

                  {/* Open-text follow-up under a choice question */}
                  {q.followUp && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        {pick(q.followUp, lang)}
                      </p>
                      <textarea
                        rows={2}
                        value={(res[`${q.id}_text`] as string) ?? ""}
                        onChange={(e) => setVal(`${q.id}_text`, e.target.value)}
                        placeholder={s.optionalPlaceholder}
                        className="w-full resize-none rounded-2xl bg-[hsl(252_32%_97%)] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.2)` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </section>
        ))}

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-background transition-all active:scale-[0.99] disabled:opacity-40"
          style={{
            background: `hsl(${CORAL})`,
            boxShadow: `0 8px 24px -8px hsl(${CORAL} / 0.7)`,
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {s.submitting}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {s.submit}
            </>
          )}
        </button>
        <p className="pb-2 text-center text-xs text-muted-foreground">
          {answered}/{ALL_QUESTIONS.length} {s.progressAnswered} ·{" "}
          {s.progressRequirement}
        </p>
      </div>
    </div>
  )
}

/** A selectable row — radio (single/scale) or checkbox (multi). */
function OptionRow({
  label,
  selected,
  shape,
  onClick,
}: {
  label: string
  selected: boolean
  shape: "radio" | "check"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all",
        selected
          ? "bg-[hsl(259_80%_55%/0.10)] text-foreground"
          : "border-foreground/10 text-foreground/80 hover:border-foreground/10 hover:bg-foreground/5"
      )}
      style={
        selected
          ? {
              borderColor: `hsl(${CORAL} / 0.7)`,
              boxShadow: `inset 0 0 0 1px hsl(${CORAL} / 0.4)`,
            }
          : undefined
      }
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border transition-all",
          shape === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-transparent" : "border-foreground/20"
        )}
        style={selected ? { background: `hsl(${CORAL})` } : undefined}
        aria-hidden
      >
        {selected && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
}
