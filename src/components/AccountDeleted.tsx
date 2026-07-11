import { Heart } from "lucide-react"
import { useT } from "@/lib/i18n"

/* ========================================================================== *
 *  AccountDeleted — the farewell shown after a guardian deletes their account.
 *
 *  A bare full-screen message: no nav, no button, nothing else. Rendered at the
 *  App level (outside the dashboard) so it takes over the whole viewport.
 * ========================================================================== */

export default function AccountDeleted() {
  const t = useT()
  const d = t.deletedAccount
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--surface-app)" }}
    >
      <div
        className="mx-auto max-w-sm animate-fade-up text-center"
        style={{ animationFillMode: "both" }}
      >
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "hsl(259 80% 55% / 0.14)" }}
        >
          <Heart className="h-8 w-8" style={{ color: "hsl(259 80% 55%)" }} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">{d.title}</h1>
        <p className="mx-auto mt-3 text-sm leading-relaxed text-muted-foreground">
          {d.body}
        </p>
      </div>
    </main>
  )
}
