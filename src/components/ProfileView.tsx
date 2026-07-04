import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { useLang } from "@/lib/i18n"
import {
  AlertTriangle,
  Check,
  Heart,
  Loader2,
  LogOut,
  Trash2,
  User,
  X,
} from "lucide-react"

const STR = {
  ms: {
    profileFallback: "Profil Anda",
    guardianFallback: "Penjaga",
    childOf: (name: string) => ` · ibu/bapa kepada ${name}`,
    childSection: "Maklumat Anak",
    childName: "Nama Anak",
    childNamePlaceholder: "cth. Adam",
    childAge: "Umur Anak",
    childAgePlaceholder: "cth. 4 tahun",
    guardianSection: "Maklumat Penjaga",
    guardianName: "Nama Penjaga",
    guardianNamePlaceholder: "cth. Siti",
    relationship: "Hubungan",
    relationshipPlaceholder: "cth. Ibu, Bapa, Penjaga",
    guardianAge: "Umur Penjaga",
    guardianAgePlaceholder: "cth. 32 tahun",
    email: "E-mel",
    emailPlaceholder: "cth. nama@emel.com",
    profileSaved: "Profil disimpan",
    saveProfile: "Simpan Profil",
    signOut: "Log Keluar",
    // Danger zone — delete account
    dangerZone: "Zon Bahaya",
    deleteAccount: "Padam Akaun",
    deleteDialogAria: "Padam akaun",
    deleteWarnTitle: "Padam akaun anda?",
    deleteWarnBody:
      "Tindakan ini kekal dan tidak boleh dibatalkan. Maklumat peribadi anda dan anak anda akan dipadam.",
    deleteWord: "PADAM",
    deletePrompt: (word: string) => `Untuk mengesahkan, taip “${word}” di bawah.`,
    deleteTypePlaceholder: "Taip PADAM",
    deleteConfirm: "Padam Akaun Saya",
    deleting: "Memadam…",
    deleteError: "Gagal memadam akaun. Sila cuba lagi.",
    cancel: "Batal",
    byeTitle: "Kami sedih melihat anda pergi 💜",
    byeBody:
      "Akaun anda telah dipadam. Terima kasih kerana membenarkan Tutur menjadi sebahagian daripada perjalanan keluarga anda. Pintu kami sentiasa terbuka jika anda ingin kembali. Jaga diri, ya.",
    byeCta: "Kembali ke Laman Utama",
  },
  en: {
    profileFallback: "Your Profile",
    guardianFallback: "Guardian",
    childOf: (name: string) => ` · parent of ${name}`,
    childSection: "Child Information",
    childName: "Child's Name",
    childNamePlaceholder: "e.g. Adam",
    childAge: "Child's Age",
    childAgePlaceholder: "e.g. 4 years old",
    guardianSection: "Guardian Information",
    guardianName: "Guardian's Name",
    guardianNamePlaceholder: "e.g. Siti",
    relationship: "Relationship",
    relationshipPlaceholder: "e.g. Mother, Father, Guardian",
    guardianAge: "Guardian's Age",
    guardianAgePlaceholder: "e.g. 32 years old",
    email: "Email",
    emailPlaceholder: "e.g. name@email.com",
    profileSaved: "Profile saved",
    saveProfile: "Save Profile",
    signOut: "Sign Out",
    dangerZone: "Danger Zone",
    deleteAccount: "Delete Account",
    deleteDialogAria: "Delete account",
    deleteWarnTitle: "Delete your account?",
    deleteWarnBody:
      "This action is permanent and cannot be undone. Your and your child's personal details will be erased.",
    deleteWord: "DELETE",
    deletePrompt: (word: string) => `To confirm, type “${word}” below.`,
    deleteTypePlaceholder: "Type DELETE",
    deleteConfirm: "Delete My Account",
    deleting: "Deleting…",
    deleteError: "Couldn't delete the account. Please try again.",
    cancel: "Cancel",
    byeTitle: "We're sad to see you go 💜",
    byeBody:
      "Your account has been deleted. Thank you for letting Tutur be part of your family's journey. Our door is always open if you'd like to come back. Take care of each other.",
    byeCta: "Back to Home",
  },
} as const

/* ========================================================================== *
 *  ProfileView — child & guardian profile, reached from the nav profile chip.
 *
 *  Editable form over the whole `Profile` (except the communication stage,
 *  which lives in Tetapan since it drives activity recommendations). Sign out
 *  sits at the bottom, clearly separated from the editable fields.
 * ========================================================================== */

const CORAL = "259 80% 55%"

/** Blank profile used when the parent reaches the hub without onboarding data. */
const EMPTY_PROFILE: Profile = {
  childName: "",
  childAge: "",
  guardianName: "",
  relationship: "",
  guardianAge: "",
  stage: 1,
  email: "",
  profiledAt: "",
}

export default function ProfileView({
  profile,
  onSave,
  onSignOut,
  onDeleteAccount,
}: {
  profile?: Profile
  /** Persists the edited profile (stage is carried over untouched). */
  onSave: (profile: Profile) => void
  /** Clears the session and returns to the start of the flow. */
  onSignOut: () => void
  /** Deletes the account in the backend. Resolves true on success. */
  onDeleteAccount?: () => Promise<boolean>
}) {
  const { lang } = useLang()
  const s = STR[lang]
  const [form, setForm] = useState<Profile>(profile ?? EMPTY_PROFILE)
  const [saved, setSaved] = useState(false)

  // Account deletion — gated behind a typed-word confirmation dialog, then a
  // gentle goodbye screen before the session is cleared.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    onSave(form)
    setSaved(true)
  }

  // Goodbye screen — shown after a successful deletion; the CTA clears the
  // session and returns to the start.
  if (deleted) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div
          className="mx-auto max-w-sm animate-fade-up text-center"
          style={{ animationFillMode: "both" }}
        >
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: `hsl(${CORAL} / 0.14)` }}
          >
            <Heart className="h-8 w-8" style={{ color: `hsl(${CORAL})` }} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{s.byeTitle}</h2>
          <p className="mx-auto mt-3 text-sm leading-relaxed text-muted-foreground">
            {s.byeBody}
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-7 w-full rounded-2xl py-3.5 text-sm font-semibold text-background transition-all active:scale-[0.99]"
            style={{ background: `hsl(${CORAL})` }}
          >
            {s.byeCta}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-2xl space-y-7">
        {/* Avatar header */}
        <div className="flex items-center gap-4">
          <div
            className="relative h-16 w-16 shrink-0 rounded-2xl p-[2px]"
            style={{
              background: `linear-gradient(135deg, hsl(${CORAL}), hsl(259 80% 68%))`,
              boxShadow: `0 0 22px -4px hsl(${CORAL} / 0.6)`,
            }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-2xl bg-background">
              <User className="h-7 w-7 text-foreground/90" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">
              {form.guardianName || s.profileFallback}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {form.relationship || s.guardianFallback}
              {form.childName ? s.childOf(form.childName) : ""}
            </p>
          </div>
        </div>

        {/* Child information */}
        <Section title={s.childSection}>
          <Field label={s.childName}>
            <Input
              className="glass"
              value={form.childName}
              onChange={(e) => set("childName", e.target.value)}
              placeholder={s.childNamePlaceholder}
            />
          </Field>
          <Field label={s.childAge}>
            <Input
              className="glass"
              value={form.childAge}
              onChange={(e) => set("childAge", e.target.value)}
              placeholder={s.childAgePlaceholder}
            />
          </Field>
        </Section>

        {/* Guardian information */}
        <Section title={s.guardianSection}>
          <Field label={s.guardianName}>
            <Input
              className="glass"
              value={form.guardianName}
              onChange={(e) => set("guardianName", e.target.value)}
              placeholder={s.guardianNamePlaceholder}
            />
          </Field>
          <Field label={s.relationship}>
            <Input
              className="glass"
              value={form.relationship}
              onChange={(e) => set("relationship", e.target.value)}
              placeholder={s.relationshipPlaceholder}
            />
          </Field>
          <Field label={s.guardianAge}>
            <Input
              className="glass"
              value={form.guardianAge}
              onChange={(e) => set("guardianAge", e.target.value)}
              placeholder={s.guardianAgePlaceholder}
            />
          </Field>
          <Field label={s.email}>
            <Input
              className="glass"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder={s.emailPlaceholder}
            />
          </Field>
        </Section>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-background transition-all active:scale-[0.99]"
          style={{
            background: `hsl(${CORAL})`,
            boxShadow: `0 0 24px -6px hsl(${CORAL} / 0.7)`,
          }}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} />
              {s.profileSaved}
            </>
          ) : (
            s.saveProfile
          )}
        </button>

        {/* Danger zone — permanent account deletion (above sign out) */}
        {onDeleteAccount && (
          <div className="mt-1 space-y-3 rounded-3xl border border-destructive/30 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {s.dangerZone}
            </h3>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-destructive transition-all active:scale-[0.99] hover:bg-destructive/10"
              style={{ boxShadow: "inset 0 0 0 1px hsl(var(--destructive) / 0.4)" }}
            >
              <Trash2 className="h-4 w-4" />
              {s.deleteAccount}
            </button>
          </div>
        )}

        {/* Sign out */}
        <div>
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99]",
              "glass text-foreground hover:bg-foreground/5"
            )}
          >
            <LogOut className="h-4 w-4" />
            {s.signOut}
          </button>
        </div>
      </div>
    </div>

    {deleteOpen && onDeleteAccount && (
      <DeleteAccountDialog
        s={s}
        onDelete={onDeleteAccount}
        onDeleted={() => {
          setDeleteOpen(false)
          setDeleted(true)
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Delete-account confirmation dialog                                        */
/*                                                                            */
/*  Two gates before anything is deleted: the parent must type the exact      */
/*  confirmation word AND press the destructive confirm button.               */
/* -------------------------------------------------------------------------- */

function DeleteAccountDialog({
  s,
  onDelete,
  onDeleted,
  onCancel,
}: {
  s: (typeof STR)[keyof typeof STR]
  onDelete: () => Promise<boolean>
  onDeleted: () => void
  onCancel: () => void
}) {
  const [text, setText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)

  const matches = text.trim().toUpperCase() === s.deleteWord

  async function confirm() {
    if (!matches || deleting) return
    setDeleting(true)
    setError(false)
    const ok = await onDelete()
    if (ok) {
      onDeleted()
    } else {
      setDeleting(false)
      setError(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={deleting ? undefined : onCancel}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={s.deleteDialogAria}
        className="relative w-full max-w-md animate-fade-up rounded-3xl border border-foreground/10 bg-background/95 p-6 backdrop-blur-2xl"
        style={{ animationFillMode: "both" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--destructive) / 0.14)" }}
            >
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </span>
            <h2 className="text-base font-bold tracking-tight">
              {s.deleteWarnTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            aria-label={s.cancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {s.deleteWarnBody}
        </p>

        <p className="mt-4 text-sm font-medium text-foreground">
          {s.deletePrompt(s.deleteWord)}
        </p>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={s.deleteTypePlaceholder}
          autoFocus
          autoCapitalize="characters"
          disabled={deleting}
          className="mt-2 glass"
        />

        {error && (
          <p className="mt-2 text-xs font-medium text-destructive">
            {s.deleteError}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-2xl py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.99] glass hover:bg-foreground/5 disabled:opacity-40"
          >
            {s.cancel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!matches || deleting}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
            style={{ background: "hsl(var(--destructive))" }}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {s.deleting}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {s.deleteConfirm}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-3xl glass-strong p-5">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
