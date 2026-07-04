import { useState } from "react"
import { ArrowLeft, ArrowRight, Users } from "lucide-react"
import { useT } from "@/lib/i18n"
import { acceptChildInvite } from "@/lib/db"

/* ========================================================================== *
 *  JoinChild — a co-parent redeems an invite code to join an existing child.
 *
 *  Reached from the Welcome sector ("Have an invite code?"), so the second
 *  parent joins BEFORE creating their own child — landing directly on the shared
 *  record with no orphan. On success the app reloads and resumes on the hub.
 * ========================================================================== */

export default function JoinChild({
  onBack,
  onJoined,
  initialCode,
}: {
  onBack: () => void
  /** Called after a successful join — App reloads onto the shared child. */
  onJoined: () => void
  /** Pre-filled from a shared invite link (?code=…). */
  initialCode?: string
}) {
  const t = useT()
  const j = t.join
  const [code, setCode] = useState(initialCode ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function submit() {
    const c = code.trim()
    if (!c || loading) return
    setLoading(true)
    setError(false)
    const res = await acceptChildInvite(c)
    if (res.ok) onJoined()
    else {
      setLoading(false)
      setError(true)
    }
  }

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 40% at 50% -5%, hsl(var(--primary) / 0.10), transparent 70%)",
        }}
      />

      <header className="relative mx-auto flex w-full max-w-2xl items-center px-6 pt-6 lg:pt-10">
        <button
          type="button"
          onClick={onBack}
          aria-label={j.back}
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-all"
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="relative flex flex-1 items-center px-6 py-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-primary"
            style={{ background: "hsl(var(--primary) / 0.12)" }}
          >
            <Users className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {j.title}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            {j.subtitle}
          </p>

          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={j.placeholder}
            autoCapitalize="characters"
            autoFocus
            className="mt-6 w-full rounded-2xl border-[1.5px] border-border bg-muted px-4 py-3.5 text-center font-mono text-base tracking-[0.2em] text-foreground outline-none transition placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary focus:[box-shadow:var(--ring-focus)]"
          />
          {error && (
            <p className="mt-2 text-sm font-medium text-destructive">
              {j.error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!code.trim() || loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full py-4 font-display text-base font-bold text-primary-foreground shadow-glow-cyan transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{ background: "hsl(var(--primary))", letterSpacing: "-0.01em" }}
          >
            {loading ? (
              j.joining
            ) : (
              <>
                {j.cta}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
