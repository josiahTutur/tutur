import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { saveFeedback } from "@/lib/db"
import { Check, Heart, Loader2, Send } from "lucide-react"

/* ========================================================================== *
 *  FeedbackView — Borang Maklum Balas Pengguna Tutur.
 *
 *  A data-driven survey (3 sections) saved to Supabase as one JSON row. Scales,
 *  single/multi choice, and open-text are all rendered from the QUESTIONS data
 *  so the survey can change without touching the rendering logic.
 * ========================================================================== */

const CORAL = "12 100% 64%"
const TEAL = "172 66% 50%"

// The three 5-point scales used across the form.
const AGREE = [
  "Sangat Tidak Setuju",
  "Tidak Setuju",
  "Neutral",
  "Setuju",
  "Sangat Setuju",
]
const SATISFY = [
  "Sangat Tidak Puas Hati",
  "Tidak Puas Hati",
  "Neutral",
  "Puas Hati",
  "Sangat Puas Hati",
]
const RECOMMEND = [
  "Sangat Tidak Mungkin",
  "Tidak Mungkin",
  "Tidak Pasti",
  "Mungkin",
  "Sangat Mungkin",
]

type Question = {
  id: string
  no: number
  text: string
  type: "scale" | "single" | "multi" | "text"
  scale?: string[]
  options?: string[]
  other?: boolean // include a "Lain-lain" free-text option (multi/single)
  followUp?: string // an open-text prompt shown under the choice
  long?: boolean // textarea (vs input) for "text" questions
}

type Section = { key: string; title: string; questions: Question[] }

const SECTIONS: Section[] = [
  {
    key: "A",
    title: "Bahagian A: Pengalaman Menggunakan Tutur",
    questions: [
      {
        id: "q1",
        no: 1,
        text: "Secara keseluruhan, sejauh manakah anda berpuas hati menggunakan Tutur?",
        type: "scale",
        scale: SATISFY,
        followUp: "Apakah sebab utama anda memberikan skor tersebut?",
      },
      {
        id: "q2",
        no: 2,
        text: "Sejauh manakah anda akan mencadangkan Tutur kepada ibu bapa atau penjaga lain?",
        type: "scale",
        scale: RECOMMEND,
        followUp: "Apakah sebab utama anda memberikan skor tersebut?",
      },
      {
        id: "q3",
        no: 3,
        text: "Saya bercadang untuk terus menggunakan Tutur selepas tempoh percubaan ini.",
        type: "scale",
        scale: AGREE,
        followUp:
          "Apakah SATU perkara yang anda ingin ubah, tambah atau perbaiki dalam Tutur?",
      },
      {
        id: "q4",
        no: 4,
        text: "Tutur membantu saya menjalankan aktiviti atau latihan komunikasi bersama anak saya.",
        type: "scale",
        scale: AGREE,
        followUp:
          "Jika ya, boleh kongsikan pengalaman atau perubahan yang anda perhatikan?",
      },
      {
        id: "q5",
        no: 5,
        text: "Aktiviti harian dalam Tutur mudah disesuaikan dengan rutin harian keluarga saya (contohnya semasa makan, mandi, bermain atau membaca).",
        type: "scale",
        scale: AGREE,
        followUp: "Jika tidak, apakah cabaran yang anda hadapi?",
      },
      {
        id: "q6",
        no: 6,
        text: "Selepas menggunakan Tutur, saya berasa lebih yakin untuk membantu perkembangan komunikasi anak saya.",
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q7",
        no: 7,
        text: "Saya berasa disokong dan digalakkan oleh Tutur, dan bukannya dihakimi.",
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q8",
        no: 8,
        text: "Mudah untuk memahami apa yang perlu dilakukan dan cara menggunakan aplikasi Tutur.",
        type: "scale",
        scale: AGREE,
        followUp: "Bahagian manakah yang paling mengelirukan atau sukar difahami?",
      },
      {
        id: "q9",
        no: 9,
        text: "Maya (Pembantu AI Tutur) membantu saya dengan jelas, mesra dan mudah difahami.",
        type: "scale",
        scale: AGREE,
        followUp: "Apakah yang anda suka atau kurang suka tentang Maya AI?",
      },
      {
        id: "q10",
        no: 10,
        text: "Saya memahami dan percaya bahawa latihan kecil yang dilakukan secara konsisten dapat membantu perkembangan komunikasi anak.",
        type: "scale",
        scale: AGREE,
        followUp: "Mengapa anda berpendapat demikian?",
      },
      {
        id: "q11",
        no: 11,
        text: "Bahasa, contoh situasi dan perkataan dalam Papan AAC sesuai dengan kehidupan harian saya dan anak saya.",
        type: "scale",
        scale: AGREE,
        followUp: "Jika tidak, apakah yang boleh diperbaiki?",
      },
      {
        id: "q12",
        no: 12,
        text: "Pada pendapat anda, penggunaan Papan AAC dalam aplikasi Tutur adalah berkesan untuk membantu komunikasi anak.",
        type: "scale",
        scale: AGREE,
      },
      {
        id: "q13",
        no: 13,
        text: "Jika dibandingkan dengan peranti AAC fizikal (hardware AAC), yang manakah anda lebih gemari?",
        type: "single",
        options: [
          "Papan AAC dalam aplikasi Tutur",
          "Peranti AAC fizikal (hardware AAC)",
          "Kedua-duanya sama membantu",
          "Tidak pasti",
        ],
        followUp: "Mengapa anda memilih jawapan tersebut?",
      },
    ],
  },
  {
    key: "B",
    title: "Bahagian B: Pengalaman Sebelum Menggunakan Tutur",
    questions: [
      {
        id: "q14",
        no: 14,
        text: "Sebelum ini, pernahkah anda menggunakan aplikasi lain untuk membantu perkembangan anak?",
        type: "single",
        options: ["Ya", "Tidak"],
        followUp: "Jika ya, apakah aplikasi tersebut?",
      },
      {
        id: "q15",
        no: 15,
        text: "Jika anda pernah menggunakan aplikasi lain, apakah yang menyebabkan anda berhenti menggunakannya?",
        type: "text",
        long: true,
      },
      {
        id: "q16",
        no: 16,
        text: "Selain aplikasi mudah alih, apakah medium yang paling anda selesa gunakan untuk mendapatkan panduan membantu anak? (Boleh pilih lebih daripada satu)",
        type: "multi",
        options: [
          "WhatsApp / Telegram",
          "Video pendek",
          "Podcast",
          "Facebook Group / Komuniti",
          "Bengkel atau kelas fizikal",
          "Sesi bersama ahli terapi",
          "Buku atau artikel",
          "Laman web",
        ],
        other: true,
      },
    ],
  },
  {
    key: "C",
    title: "Bahagian C: Penggunaan dan Cadangan",
    questions: [
      {
        id: "q17",
        no: 17,
        text: "Sepanjang tempoh percubaan, berapa kerap anda menggunakan Tutur?",
        type: "single",
        options: [
          "Setiap hari",
          "4–6 kali seminggu",
          "2–3 kali seminggu",
          "Sekali seminggu",
          "Kurang daripada sekali seminggu",
        ],
      },
      {
        id: "q18",
        no: 18,
        text: "Pada pendapat anda, siapakah yang paling sesuai menggunakan Tutur? (Boleh pilih lebih daripada satu)",
        type: "multi",
        options: [
          "Ibu bapa",
          "Datuk / Nenek",
          "Pengasuh",
          "Guru Pendidikan Khas",
          "Guru Prasekolah / Tadika",
          "Ahli Terapi Pertuturan Bahasa",
          "Semua di atas",
        ],
        other: true,
      },
      {
        id: "q19",
        no: 19,
        text: "Jika anda boleh menggambarkan Tutur dengan satu perkataan atau satu ayat, apakah yang anda akan katakan?",
        type: "text",
      },
      {
        id: "q20",
        no: 20,
        text: "Adakah anda mempunyai sebarang cadangan lain untuk membantu kami menambah baik Tutur?",
        type: "text",
        long: true,
      },
    ],
  },
]

const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions)

export default function FeedbackView() {
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
      setError("Gagal menghantar maklum balas. Sila cuba lagi.")
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
          <h2 className="mt-5 text-xl font-bold tracking-tight">Terima kasih! 💛</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Maklum balas anda telah dihantar. Setiap pandangan anda membantu kami
            menjadikan Tutur lebih baik untuk anda dan anak anda.
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
            Borang Maklum Balas Pengguna Tutur
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Terima kasih kerana mencuba Tutur. Maklum balas anda amat penting
            untuk membantu kami menambah baik pengalaman dan memastikan Tutur
            benar-benar membantu menyokong perkembangan komunikasi anak.
          </p>
        </header>

        {SECTIONS.map((section) => (
          <section key={section.key} className="space-y-5">
            <h3
              className="rounded-2xl px-4 py-2.5 text-sm font-bold"
              style={{ background: `hsl(${CORAL} / 0.12)`, color: `hsl(${CORAL})` }}
            >
              {section.title}
            </h3>

            {section.questions.map((q) => (
              <div key={q.id} className="rounded-3xl glass-strong p-5">
                <p className="text-sm font-semibold leading-relaxed">
                  <span style={{ color: `hsl(${CORAL})` }}>{q.no}.</span> {q.text}
                </p>

                <div className="mt-3.5 space-y-2">
                  {/* Scale + single choice — selectable rows */}
                  {(q.type === "scale" || q.type === "single") &&
                    (q.scale ?? q.options ?? []).map((opt) => {
                      const selected = res[q.id] === opt
                      return (
                        <OptionRow
                          key={opt}
                          label={opt}
                          selected={selected}
                          shape="radio"
                          onClick={() => setVal(q.id, opt)}
                        />
                      )
                    })}

                  {/* Multi choice — checkboxes */}
                  {q.type === "multi" &&
                    (q.options ?? []).map((opt) => {
                      const cur = Array.isArray(res[q.id])
                        ? (res[q.id] as string[])
                        : []
                      return (
                        <OptionRow
                          key={opt}
                          label={opt}
                          selected={cur.includes(opt)}
                          shape="check"
                          onClick={() => toggleMulti(q.id, opt)}
                        />
                      )
                    })}

                  {/* "Lain-lain" free text for choice questions */}
                  {q.other && (
                    <input
                      type="text"
                      value={(res[`${q.id}_other`] as string) ?? ""}
                      onChange={(e) => setVal(`${q.id}_other`, e.target.value)}
                      placeholder="Lain-lain…"
                      className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
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
                        placeholder="Jawapan anda…"
                        className="w-full resize-none rounded-2xl bg-white/[0.04] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.25)` }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={(res[q.id] as string) ?? ""}
                        onChange={(e) => setVal(q.id, e.target.value)}
                        placeholder="Jawapan anda…"
                        className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.25)` }}
                      />
                    ))}

                  {/* Open-text follow-up under a choice question */}
                  {q.followUp && (
                    <div className="pt-1">
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        {q.followUp}
                      </p>
                      <textarea
                        rows={2}
                        value={(res[`${q.id}_text`] as string) ?? ""}
                        onChange={(e) => setVal(`${q.id}_text`, e.target.value)}
                        placeholder="Pilihan (boleh dikosongkan)…"
                        className="w-full resize-none rounded-2xl bg-white/[0.04] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 outline-none focus:ring-2 focus:ring-ring"
                        style={{ boxShadow: `inset 0 0 0 1px hsl(${TEAL} / 0.2)` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
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
              Menghantar…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Hantar Maklum Balas
            </>
          )}
        </button>
        <p className="pb-2 text-center text-xs text-muted-foreground">
          {answered}/{ALL_QUESTIONS.length} soalan dijawab · sekurang-kurangnya
          soalan 1 diperlukan
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
          ? "bg-white/[0.06] text-foreground"
          : "border-white/10 text-foreground/80 hover:border-white/20 hover:bg-white/[0.03]"
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
          selected ? "border-transparent" : "border-white/30"
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
