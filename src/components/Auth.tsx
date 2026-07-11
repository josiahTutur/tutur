import { Fragment, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLang } from "@/lib/i18n"
import { MAINTENANCE } from "@/lib/config"
import tuturWordmark from "@/assets/brand/tutur-wordmark-trim.png"
import tuturSymbol from "@/assets/brand/tutur-symbol-trim.png"
import BrandPanel from "@/components/BrandPanel"

/* Brand-token style helper (white surface + violet accent, per the DS). */
const INPUT_CLS =
  "w-full rounded-[14px] border-[1.5px] border-[color:var(--border-subtle)] bg-[color:var(--surface-sunken)] px-4 py-3 text-base text-[color:var(--text-strong)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--color-brand)] focus:[box-shadow:var(--ring-focus)]"

const STR = {
  ms: {
    invalidEmail: "Sila masukkan alamat e-mel yang sah.",
    pwTooShort: "Kata laluan mesti sekurang-kurangnya 6 aksara.",
    wrongCredentials: "E-mel atau kata laluan salah. Sila cuba lagi.",
    loginFailed:
      "Kami tidak dapat log masuk anda. Jika anda belum mempunyai akaun Tutur, sila daftar.",
    signUpCta: "Daftar Akaun Baharu",
    alreadyRegistered: "E-mel ini sudah didaftar. Sila log masuk.",
    signUpFailed: "Gagal mendaftar. Sila cuba lagi.",
    magicLinkFailed: "Gagal menghantar pautan. Sila cuba lagi.",
    checkEmailHeading: "Semak e-mel anda",
    confirmSentPrefix: "Kami telah hantar pautan pengesahan ke ",
    magicSentPrefix: "Pautan log masuk telah dihantar ke ",
    confirmSentSuffix: " Klik pautan itu untuk sahkan akaun anda.",
    magicSentSuffix: " Klik pautan itu untuk teruskan.",
    back: "← Kembali",
    loginHeading: "Log masuk ke Tutur",
    signupHeading: "Daftar akaun Tutur",
    loginSubtitle: "Masukkan e-mel dan kata laluan anda untuk teruskan.",
    signupSubtitle: "Cipta akaun dengan e-mel dan kata laluan anda.",
    emailLabel: "Alamat e-mel",
    emailPlaceholder: "nama@contoh.com",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Sekurang-kurangnya 6 aksara",
    hidePassword: "Sembunyikan kata laluan",
    showPassword: "Tunjuk kata laluan",
    loggingIn: "Log masuk…",
    signingUp: "Mendaftar…",
    logIn: "Log Masuk",
    signUp: "Daftar Akaun",
    noAccount: "Belum ada akaun? ",
    hasAccount: "Sudah ada akaun? ",
    signUpHere: "Daftar di sini",
    logInHere: "Log masuk",
    or: "atau",
    continueGoogle: "Teruskan dengan Google",
    googleFailed: "Gagal log masuk dengan Google. Sila cuba lagi.",
    magicLinkButton: "Log masuk dengan pautan e-mel",
    terms:
      "Dengan meneruskan, anda bersetuju dengan Terma Perkhidmatan dan Dasar Privasi Tutur.",
  },
  en: {
    invalidEmail: "Please enter a valid email address.",
    pwTooShort: "Password must be at least 6 characters.",
    wrongCredentials: "Incorrect email or password. Please try again.",
    loginFailed:
      "We couldn't log you in. If you don't have a Tutur account yet, please sign up.",
    signUpCta: "Create an Account",
    alreadyRegistered: "This email is already registered. Please log in.",
    signUpFailed: "Sign-up failed. Please try again.",
    magicLinkFailed: "Couldn't send the link. Please try again.",
    checkEmailHeading: "Check your email",
    confirmSentPrefix: "We've sent a confirmation link to ",
    magicSentPrefix: "A login link has been sent to ",
    confirmSentSuffix: " Click the link to confirm your account.",
    magicSentSuffix: " Click the link to continue.",
    back: "← Back",
    loginHeading: "Log in to Tutur",
    signupHeading: "Create your account",
    loginSubtitle: "Enter your email and password to continue.",
    signupSubtitle: "with your email and password.",
    emailLabel: "Email address",
    emailPlaceholder: "name@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 6 characters",
    hidePassword: "Hide password",
    showPassword: "Show password",
    loggingIn: "Logging in…",
    signingUp: "Signing up…",
    logIn: "Log In",
    signUp: "Sign Up",
    noAccount: "Don't have an account yet? ",
    hasAccount: "Already have an account? ",
    signUpHere: "Sign up here",
    logInHere: "Log in",
    or: "or",
    continueGoogle: "Continue with Google",
    googleFailed: "Couldn't sign in with Google. Please try again.",
    magicLinkButton: "Log in with an email link",
    terms:
      "By continuing, you agree to Tutur's Terms of Service and Privacy Policy.",
  },
} as const

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

export default function Auth({
  onBack,
  initialMode = "login",
  maintenance = MAINTENANCE,
  oauthError = false,
}: {
  onBack?: () => void
  /** Which form to open on first render — "signup" from the CTA, "login" from Sign In. */
  initialMode?: Mode
  /** Runtime maintenance flag — forces login-only (falls back to env constant). */
  maintenance?: boolean
  /** A prior Google sign-in bounced back with an error (e.g. not registered). */
  oauthError?: boolean
}) {
  const { lang } = useLang()
  const s = STR[lang]
  // Maintenance pauses new sign-ups — force the login form regardless of entry.
  const [mode, setMode] = useState<Mode>(maintenance ? "login" : initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    oauthError ? s.loginFailed : null
  )
  // When a login attempt fails, surface a "Sign Up" CTA (they may have no account).
  const [suggestSignup, setSuggestSignup] = useState(oauthError)
  // "check your email" state (signup email confirmation)
  const [confirmSent, setConfirmSent] = useState(false)

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isPwValid = password.length >= 6
  const canSubmit = isEmailValid && isPwValid

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEmailValid) {
      setError(s.invalidEmail)
      return
    }
    if (!isPwValid) {
      setError(s.pwTooShort)
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
      if (err) {
        // Supabase returns the same error for wrong password OR no such account,
        // so guide them to sign up as well.
        setError(s.loginFailed)
        setSuggestSignup(true)
      }
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
            ? s.alreadyRegistered
            : s.signUpFailed
        )
        return
      }
      // No session means Supabase requires email confirmation first.
      if (!data.session) setConfirmSent(true)
    }
  }

  async function handleGoogle() {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    // On success the browser redirects to Google; only errors return here.
    if (err) setError(s.googleFailed)
  }

  /* ----------------------- "check your email" screen ---------------------- */
  if (confirmSent) {
    return (
      <div className="flex min-h-screen" style={{ background: "var(--surface-app)" }}>
        <BrandPanel />
        <main
          className="relative flex min-h-screen flex-1 flex-col px-7 py-8 lg:px-12"
          style={{ color: "var(--text-body)" }}
        >
          <nav className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirmSent(false)
                setError(null)
              }}
              aria-label={s.back.replace(/^←\s*/, "")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                background: "var(--color-brand-subtle)",
                color: "var(--violet-700)",
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src={tuturSymbol}
                alt=""
                className="h-6 w-auto select-none"
                draggable={false}
              />
              <img
                src={tuturWordmark}
                alt="Tutur"
                className="h-5 w-auto select-none"
                draggable={false}
              />
            </div>
          </nav>

          <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-start pt-8 lg:justify-center lg:pt-0">
            <div
              className="mb-8 animate-fade-up text-center"
              style={{ animationFillMode: "both" }}
            >
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-brand-subtle)" }}
              >
                <MailCheck
                  className="h-6 w-6"
                  style={{ color: "var(--color-brand)" }}
                />
              </div>
              <h1
                className="text-2xl font-bold tracking-tight text-[color:var(--text-strong)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.checkEmailHeading}
              </h1>
            </div>
            <div
              className="animate-scale-in space-y-4 rounded-[28px] border p-6 text-center"
              style={{
                animationFillMode: "both",
                background: "var(--surface-card)",
                borderColor: "var(--border-subtle)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <p className="text-sm text-[color:var(--text-body)]">
                {s.confirmSentPrefix}
                <span className="font-semibold text-[color:var(--text-strong)]">
                  {email}
                </span>
                .{s.confirmSentSuffix}
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  /* ----------------------------- main form -------------------------------- */
  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface-app)" }}>
      <BrandPanel />
      <main
        className="relative flex min-h-screen flex-1 flex-col px-7 py-8 lg:px-12"
        style={{ color: "var(--text-body)" }}
      >
        {/* Soft violet calm so the white side never feels clinical */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 40% at 50% 20%, var(--violet-50), transparent 72%)",
          }}
        />

        {/* Borderless top nav — back button + brand mark (mobile only) */}
        <nav className="relative flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={s.back.replace(/^←\s*/, "")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
              style={{
                background: "var(--color-brand-subtle)",
                color: "var(--violet-700)",
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </nav>

        <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-start pt-8 lg:justify-center lg:pt-0">
        {/* Header */}
        <div
          className="mb-6 animate-fade-up text-center"
          style={{ animationFillMode: "both" }}
        >
          {/* The word "Tutur" in the heading is rendered as the logo lockup. */}
          <h1
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xl font-bold tracking-tight text-[color:var(--text-strong)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {(mode === "login" ? s.loginHeading : s.signupHeading)
              .split("Tutur")
              .map((part, i, arr) => (
                <Fragment key={i}>
                  {part.trim() && <span>{part.trim()}</span>}
                  {i < arr.length - 1 && (
                    <span className="inline-flex -translate-y-[0.05em] items-center gap-1">
                      <img
                        src={tuturSymbol}
                        alt=""
                        className="h-[0.82em] w-auto select-none"
                        draggable={false}
                      />
                      <img
                        src={tuturWordmark}
                        alt="Tutur"
                        className="h-[0.82em] w-auto select-none"
                        draggable={false}
                      />
                    </span>
                  )}
                </Fragment>
              ))}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[color:var(--text-body)]">
            {mode === "login" ? s.loginSubtitle : s.signupSubtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-scale-in space-y-4 rounded-[28px] border p-6"
          style={{
            animationFillMode: "both",
            background: "var(--surface-card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* Google — the fast, primary path */}
          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] py-3 text-sm font-semibold transition-transform active:scale-[0.99]"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-default)",
              color: "var(--text-strong)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <GoogleIcon className="h-5 w-5" />
            {s.continueGoogle}
          </button>

          <div className="flex items-center gap-3">
            <span
              className="h-px flex-1"
              style={{ background: "var(--border-subtle)" }}
            />
            <span className="text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">
              {s.or}
            </span>
            <span
              className="h-px flex-1"
              style={{ background: "var(--border-subtle)" }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
              {s.emailLabel}
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={s.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLS}
              style={{ fontFamily: "var(--font-body)" }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
              {s.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={s.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLS} pr-11`}
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? s.hidePassword : s.showPassword}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-strong)]"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="group flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
            style={{
              fontFamily: "var(--font-display)",
              background: "var(--color-brand)",
              color: "var(--color-on-brand)",
              boxShadow: "var(--shadow-brand)",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === "login" ? s.loggingIn : s.signingUp}
              </>
            ) : (
              <>
                {mode === "login" ? s.logIn : s.signUp}
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Sign-up CTA — shown after a failed login (they may have no account) */}
        {suggestSignup && mode === "login" && !maintenance && (
          <button
            type="button"
            onClick={() => {
              setMode("signup")
              setError(null)
              setSuggestSignup(false)
            }}
            className="mt-3 w-full rounded-[14px] border-[1.5px] py-3 text-sm font-bold transition-transform active:scale-[0.99]"
            style={{
              borderColor: "var(--color-brand)",
              color: "var(--color-brand)",
              background: "var(--surface-card)",
            }}
          >
            {s.signUpCta}
          </button>
        )}

        {/* Switch between login / signup — hidden while sign-ups are paused */}
        {!maintenance && (
          <div className="mt-4 text-center text-sm text-[color:var(--text-body)]">
            {mode === "login" ? s.noAccount : s.hasAccount}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError(null)
                setSuggestSignup(false)
              }}
              className="font-semibold text-[color:var(--color-brand)] underline-offset-4 hover:underline"
            >
              {mode === "login" ? s.signUpHere : s.logInHere}
            </button>
          </div>
        )}

        <p className="mx-auto mt-8 max-w-xs animate-fade-in text-center text-xs text-[color:var(--text-faint)]">
          {s.terms}
        </p>
      </div>
      </main>
    </div>
  )
}

/** Official Google "G" mark (4-colour), for the sign-in button. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
