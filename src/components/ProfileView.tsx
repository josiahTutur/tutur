import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { Check, LogOut, User } from "lucide-react"

/* ========================================================================== *
 *  ProfileView — child & guardian profile, reached from the nav profile chip.
 *
 *  Editable form over the whole `Profile` (except the communication stage,
 *  which lives in Tetapan since it drives activity recommendations). Sign out
 *  sits at the bottom, clearly separated from the editable fields.
 * ========================================================================== */

const CORAL = "12 100% 64%"

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
}: {
  profile?: Profile
  /** Persists the edited profile (stage is carried over untouched). */
  onSave: (profile: Profile) => void
  /** Clears the session and returns to the start of the flow. */
  onSignOut: () => void
}) {
  const [form, setForm] = useState<Profile>(profile ?? EMPTY_PROFILE)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    onSave(form)
    setSaved(true)
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pt-6">
      <div className="mx-auto max-w-2xl space-y-7">
        {/* Avatar header */}
        <div className="flex items-center gap-4">
          <div
            className="relative h-16 w-16 shrink-0 rounded-2xl p-[2px]"
            style={{
              background: `linear-gradient(135deg, hsl(${CORAL}), hsl(25 95% 58%))`,
              boxShadow: `0 0 22px -4px hsl(${CORAL} / 0.6)`,
            }}
          >
            <span className="flex h-full w-full items-center justify-center rounded-2xl bg-background">
              <User className="h-7 w-7 text-foreground/90" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">
              {form.guardianName || "Profil Anda"}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {form.relationship || "Penjaga"}
              {form.childName ? ` · ibu/bapa kepada ${form.childName}` : ""}
            </p>
          </div>
        </div>

        {/* Child information */}
        <Section title="Maklumat Anak">
          <Field label="Nama Anak">
            <Input
              className="glass"
              value={form.childName}
              onChange={(e) => set("childName", e.target.value)}
              placeholder="cth. Adam"
            />
          </Field>
          <Field label="Umur Anak">
            <Input
              className="glass"
              value={form.childAge}
              onChange={(e) => set("childAge", e.target.value)}
              placeholder="cth. 4 tahun"
            />
          </Field>
        </Section>

        {/* Guardian information */}
        <Section title="Maklumat Penjaga">
          <Field label="Nama Penjaga">
            <Input
              className="glass"
              value={form.guardianName}
              onChange={(e) => set("guardianName", e.target.value)}
              placeholder="cth. Siti"
            />
          </Field>
          <Field label="Hubungan">
            <Input
              className="glass"
              value={form.relationship}
              onChange={(e) => set("relationship", e.target.value)}
              placeholder="cth. Ibu, Bapa, Penjaga"
            />
          </Field>
          <Field label="Umur Penjaga">
            <Input
              className="glass"
              value={form.guardianAge}
              onChange={(e) => set("guardianAge", e.target.value)}
              placeholder="cth. 32 tahun"
            />
          </Field>
          <Field label="E-mel">
            <Input
              className="glass"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="cth. nama@emel.com"
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
              Profil disimpan
            </>
          ) : (
            "Simpan Profil"
          )}
        </button>

        {/* Sign out — separated from the editable fields */}
        <div className="border-t border-border/60 pt-6">
          <button
            type="button"
            onClick={onSignOut}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99]",
              "text-destructive hover:bg-destructive/10"
            )}
            style={{ boxShadow: "inset 0 0 0 1px hsl(var(--destructive) / 0.4)" }}
          >
            <LogOut className="h-4 w-4" />
            Log Keluar
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
