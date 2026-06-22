import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react"

type Step = "email" | "otp"

const OTP_LENGTH = 6

export default function Auth({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const otpComplete = otp.every((d) => d !== "")

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEmailValid) {
      setError("Sila masukkan alamat e-mel yang sah.")
      return
    }
    setError(null)
    setLoading(true)
    // Simulate sending the verification code.
    setTimeout(() => {
      setLoading(false)
      setStep("otp")
      // Focus the first OTP cell once it has rendered.
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
    }, 1100)
  }

  function handleOtpChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "")
    setError(null)

    // Support pasting the whole code at once.
    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split("")
      const next = Array(OTP_LENGTH).fill("")
      digits.forEach((d, i) => (next[i] = d))
      setOtp(next)
      const focusIndex = Math.min(digits.length, OTP_LENGTH - 1)
      inputsRef.current[focusIndex]?.focus()
      return
    }

    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handleOtpSubmit(e: FormEvent) {
    e.preventDefault()
    if (!otpComplete) return
    setError(null)
    setLoading(true)
    // Simulate verifying the OTP. Any complete 6-digit code succeeds.
    setTimeout(() => {
      setLoading(false)
      onVerified()
    }, 1100)
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-center px-7 py-12">
      {/* Header */}
      <div className="mb-10 animate-fade-up text-center" style={{ animationFillMode: "both" }}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-strong shadow-glow-cyan">
          {step === "email" ? (
            <Mail className="h-6 w-6 text-primary" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gradient">
          {step === "email" ? "Selamat datang ke Tutur" : "Sahkan e-mel anda"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {step === "email"
            ? "Masukkan e-mel anda untuk bermula. Kami akan hantar kod pengesahan."
            : "Kod pengesahan telah dihantar ke e-mel anda"}
        </p>
      </div>

      {/* STEP 1 — Email */}
      {step === "email" && (
        <form
          onSubmit={handleEmailSubmit}
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={loading || !isEmailValid}
            className="group w-full rounded-2xl"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Menghantar kod…
              </>
            ) : (
              <>
                Teruskan
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* STEP 2 — OTP */}
      {step === "otp" && (
        <form
          onSubmit={handleOtpSubmit}
          className="animate-scale-in space-y-5 rounded-3xl glass-strong p-6"
          style={{ animationFillMode: "both" }}
        >
          <p className="text-center text-sm text-muted-foreground">
            Dihantar ke{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>

          <div className="flex justify-center gap-2.5">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-14 w-11 rounded-xl glass text-center text-xl font-semibold text-foreground outline-none transition-all focus:border-primary/60 focus:shadow-glow-cyan focus:ring-2 focus:ring-ring"
                aria-label={`Digit kod ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={loading || !otpComplete}
            className="group w-full rounded-2xl"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Mengesahkan…
              </>
            ) : (
              <>
                Sahkan & Teruskan
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <span>Tak terima kod?</span>
            <button
              type="button"
              onClick={() => {
                setOtp(Array(OTP_LENGTH).fill(""))
                inputsRef.current[0]?.focus()
              }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Hantar semula
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("email")
              setError(null)
            }}
            className="mx-auto block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Tukar e-mel
          </button>
        </form>
      )}

      <p className="mx-auto mt-8 max-w-xs animate-fade-in text-center text-xs text-muted-foreground/70">
        Dengan meneruskan, anda bersetuju dengan Terma Perkhidmatan dan Dasar
        Privasi Tutur.
      </p>
    </main>
  )
}
