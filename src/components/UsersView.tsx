import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"
import {
  deleteGuardian,
  loadAdminData,
  reactivateGuardian,
  type AdminData,
} from "@/lib/db"
import {
  Avatar,
  DeletedBadge,
  GuardianDetail,
  buildGuardianIndex,
  guardianName,
  type GuardianEntry,
} from "@/components/WawasanView"

/* ========================================================================== *
 *  UsersView — admin-only guardian management (its own top-level nav tab).
 *
 *  Full-bleed responsive card grid of every registered guardian + search, with
 *  a master-detail layout: on wide screens the grid stays on the left and the
 *  selected profile opens in a panel on the right. Deleted accounts are badged
 *  and can be reactivated. Reuses the guardian components from WawasanView.
 * ========================================================================== */

const CORAL = "259 80% 55%"
const TEAL = "180 68% 34%"
const PURPLE = "247 74% 63%"

export default function UsersView() {
  const t = useT()
  const w = t.wawasan
  const [data, setData] = useState<AdminData | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [reactivating, setReactivating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  useEffect(() => {
    loadAdminData().then(setData)
  }, [])

  const guardians = useMemo(
    () => (data ? buildGuardianIndex(data) : []),
    [data]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return guardians
    return guardians.filter((g) => {
      const name = guardianName(g.profile, "").toLowerCase()
      const email = (g.profile.email ?? "").toLowerCase()
      const child = (g.child?.name ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || child.includes(q)
    })
  }, [guardians, query])

  const selected = guardians.find((g) => g.profile.id === selectedId) ?? null

  async function handleReactivate() {
    if (!selected || reactivating) return
    setReactivating(true)
    const ok = await reactivateGuardian(selected.profile.id)
    if (ok) setData(await loadAdminData())
    setReactivating(false)
  }

  async function handleDelete() {
    if (!selected || deleting) return
    setDeleting(true)
    setDeleteError(false)
    const res = await deleteGuardian(selected.profile.id)
    if (res.ok) {
      setDeleteOpen(false)
      setSelectedId(null)
      setData(await loadAdminData())
    } else {
      setDeleteError(true)
    }
    setDeleting(false)
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="flex h-full flex-col gap-4 px-4 py-5 md:px-8 lg:flex-row lg:gap-6">
        {/* Grid of guardian cards. Hidden on phones once one is selected. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            selected ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Header + search */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">
              {w.guardiansTitle} ({filtered.length})
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={w.searchUsers}
                className="h-10 w-full rounded-2xl bg-foreground/[0.04] pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-24">
            {filtered.length === 0 ? (
              <p className="mt-10 text-center text-sm text-muted-foreground">
                {w.noResults}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((g) => (
                  <GuardianCard
                    key={g.profile.id}
                    entry={g}
                    selected={selectedId === g.profile.id}
                    onClick={() => setSelectedId(g.profile.id)}
                    w={w}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel — a column on wide screens, full page on phones. */}
        {selected ? (
          <div className="min-h-0 overflow-y-auto pb-24 lg:w-[380px] lg:shrink-0 xl:w-[440px]">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {w.guardiansTitle}
            </button>

            {selected.profile.deleted_at && (
              <button
                type="button"
                onClick={handleReactivate}
                disabled={reactivating}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-background transition-all active:scale-[0.99] disabled:opacity-50"
                style={{ background: `hsl(${TEAL})` }}
              >
                {reactivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {w.reactivate}
              </button>
            )}

            <GuardianDetail entry={selected} />

            {/* Permanent delete — not offered for admin accounts */}
            {selected.profile.role !== "admin" && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(false)
                  setDeleteOpen(true)
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-[0.99]"
                style={{ boxShadow: "inset 0 0 0 1px hsl(var(--destructive) / 0.4)" }}
              >
                <Trash2 className="h-4 w-4" />
                {w.deletePermanently}
              </button>
            )}
          </div>
        ) : (
          <div className="hidden items-center justify-center rounded-3xl border border-dashed border-foreground/15 text-sm text-muted-foreground lg:flex lg:w-[380px] lg:shrink-0 xl:w-[440px]">
            {w.tapHintUsers}
          </div>
        )}
      </div>

      {/* Permanent-delete confirmation */}
      {deleteOpen && selected && (
        <DeleteConfirm
          name={guardianName(selected.profile, w.guardianFallback)}
          w={w}
          cancelLabel={t.common.cancel}
          deleting={deleting}
          error={deleteError}
          onCancel={() => {
            if (!deleting) setDeleteOpen(false)
          }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Permanent-delete confirmation dialog                                       */
/* -------------------------------------------------------------------------- */

function DeleteConfirm({
  name,
  w,
  cancelLabel,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  name: string
  w: ReturnType<typeof useT>["wawasan"]
  cancelLabel: string
  deleting: boolean
  error: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm animate-fade-up rounded-3xl border border-foreground/10 bg-background/95 p-6 backdrop-blur-2xl"
        style={{ animationFillMode: "both" }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "hsl(var(--destructive) / 0.14)" }}
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </span>
          <h2 className="text-base font-bold tracking-tight">{w.deleteTitle}</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {w.deleteBody(name)}
        </p>
        {error && (
          <p className="mt-2 text-xs font-medium text-destructive">
            {w.deleteError}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-background transition-all active:scale-[0.99] disabled:opacity-40"
            style={{ background: "hsl(var(--destructive))" }}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 shrink-0" />
            )}
            {w.deleteConfirmBtn}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="w-full rounded-2xl py-3 text-sm font-semibold text-foreground glass transition-all hover:bg-foreground/5 active:scale-[0.99] disabled:opacity-40"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Guardian card — avatar, name, sub-line + the three engagement mini-stats. */
/* -------------------------------------------------------------------------- */

function GuardianCard({
  entry: g,
  selected,
  onClick,
  w,
}: {
  entry: GuardianEntry
  selected: boolean
  onClick: () => void
  w: ReturnType<typeof useT>["wawasan"]
}) {
  const name = guardianName(g.profile, w.guardianFallback)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-2xl glass-strong p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99]"
      style={
        selected
          ? {
              boxShadow: `inset 0 0 0 1.5px hsl(${CORAL}), 0 12px 28px -12px rgba(0,0,0,0.22)`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold font-display">{name}</p>
            {g.profile.deleted_at && <DeletedBadge label={w.deleted} />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {g.profile.relationship?.trim() || w.guardianDefault}
            {g.child?.name ? ` · ${w.child}: ${g.child.name}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <CardStat value={g.activityCount} label={w.miniActivities} hue={PURPLE} />
        <CardStat value={g.minutes} label={w.miniMinutes} hue={PURPLE} />
        <CardStat value={g.feedbackCount} label={w.miniFeedback} hue={CORAL} />
      </div>
    </button>
  )
}

function CardStat({
  value,
  label,
  hue,
}: {
  value: number
  label: string
  hue: string
}) {
  return (
    <div className="rounded-xl bg-[hsl(259_80%_55%/0.08)] px-2 py-2 text-center">
      <p
        className="text-base font-bold tabular-nums"
        style={{ color: `hsl(${hue})` }}
      >
        {value}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
