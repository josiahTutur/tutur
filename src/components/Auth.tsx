import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/**
 * Email + password auth (with a magic-link fallback).
 *
 *  • Log Masuk  → signInWithPassword (instant, no email)
 *  • Daftar     → signUp (instant if "Confirm email" is off in Supabase,
 *                 otherwise a one-time confirmation email)
 *  • Pautan e-mel → passwordless magic link, for anyone who prefers it
 *
 * On success Supabase emits SIGNED_IN and App.tsx routes the user in.
 */
type Mode = "login" | "signup"

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // "check your email" states
  const [confirmSent, setConfirmSent] = useState(false) // signup needs confirm
  const [magicSent, setMagicSent] = useState(false) // magic link sent

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isPwValid = password.length >= 6
  const canSubmit = isEmailValid && isPwValid

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEmailValid) {
      setError("Sila masukkan alamat e-mel yang sah.")
      return
    }
    if (!isPwValid) {
      setError("Kata laluan mesti sekurang-kurangnya 6 aksara.")
      return
    }
    setError(null)
    setLoading(true)

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setLoading(false)
      if (err) setError("E-mel atau kata laluan salah. Sila cuba lagi.")
      // success → App routes in via onAuthStateChange
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
      })
      setLoading(false)
      if (err) {
        setError(
          /registered|already/i.test(err.message)
            ? "E-mel ini sudah didaftar. Sila log masuk."
            : "Gagal mendaftar. Sila cuba lagi."
        )
        return
      }
      // No session means Supabase requires email confirmation first.
      if (!data.session) setConfirmSent(true)
    }
  }

  async function handleMagicLink() {
    if (!isEmailValid) {
      setError("Sila masukkan alamat e-mel yang sah.")
      return
    }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (err) {
      setError("Gagal menghantar pautan. Sila cuba lagi.")
      return
    }
    setMagicSent(true)
  }

  /* ----------------------- "check your email" screen ---------------------- */
  if (confirmSent || magicSent) {
    return (
      <main className="relative flex min-h-screen flex-col justify-center px-7 py-12">
        <div
          className="mb-8 animate-fade-up text-center"
          style={{ animationFillMode: "both" }}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-strong shadow-glow-cyan">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient">
            Semak e-mel anda
          </h1>
        </div>
        <div
          className="animate-scale-in space-y-4 rounded-3xl glass-strong p-6 text-center"
          style={{ animationFillMode: "both" }}
        >
          <p className="text-sm text-muted-foreground">
            {confirmSent
              ? "Kami telah hantar pautan pengesahan ke "
              : "Pautan log masuk telah dihantar ke "}
            <span className="font-medium text-foreground">{email}</span>.
            {confirmSent
              ? " Klik pautan itu untuk sahkan akaun anda."
              : " Klik pautan itu untuk teruskan."}
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmSent(false)
              setMagicSent(false)
              setError(null)
            }}
            className="mx-auto block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Kembali
          </button>
        </div>
      </main>
    )
  }

  /* ----------------------------- main form -------------------------------- */
  return (
    <main className="relative flex min-h-screen flex-col justify-center px-7 py-12">
      {/* Header */}
      <div
        className="mb-8 animate-fade-up text-center"
        style={{ animationFillMode: "both" }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-strong shadow-glow-cyan">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gradient">
          {mode === "login" ? "Log masuk ke Tutur" : "Daftar akaun Tutur"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {mode === "login"
            ? "Masukkan e-mel dan kata laluan anda untuk teruskan."
            : "Cipta akaun dengan e-mel dan kata laluan anda."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="animate-scale-in space-y-4 rounded-3xl glass-strong p-6"
        style={{ animationFillMode: "both" }}
      >
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Alamat e-mel
          </label>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@contoh.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Kata laluan
          </label>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Sekurang-kurangnya 6 aksara"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass pr-11 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Sembunyikan kata laluan" : "Tunjuk kata laluan"}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          size="lg"
          disabled={loading || !canSubmit}
          className="group w-full rounded-2xl"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              {mode === "login" ? "Log masuk…" : "Mendaftar…"}
            </>
          ) : (
            <>
              {mode === "login" ? "Log Masuk" : "Daftar Akaun"}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Switch between login / signup */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "login" ? "Belum ada akaun? " : "Sudah ada akaun? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login")
            setError(null)
          }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {mode === "login" ? "Daftar di sini" : "Log masuk"}
        </button>
      </div>

      {/* Magic-link fallback */}
      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          atau
        </span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={loading || !isEmailValid}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl glass py-3 text-sm font-medium text-foreground/90 transition-all hover:bg-white/[0.08] disabled:opacity-40"
      >
        <Mail className="h-4 w-4" />
        Log masuk dengan pautan e-mel
      </button>

      <p className="mx-auto mt-8 max-w-xs animate-fade-in text-center text-xs text-muted-foreground/70">
        Dengan meneruskan, anda bersetuju dengan Terma Perkhidmatan dan Dasar
        Privasi Tutur.
      </p>
    </main>
  )
}
