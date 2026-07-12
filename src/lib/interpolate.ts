/* ========================================================================== *
 *  Maya's variable interpolation.
 *
 *  Day content is authored with placeholders so one script serves every family:
 *    {anak}      → the child's nickname          (A2)
 *    {panggilan} → what the child calls the parent — Ibu / Ayah / Nenek… (A5)
 *    {mainan}    → the toy the child chose on Day 1 (C5)
 *
 *  Every string a parent sees passes through here. An unresolved placeholder is
 *  a content bug, not a display bug — `missingVars` surfaces them so the
 *  content validator can fail the build rather than shipping "Hai {anak}!".
 * ========================================================================== */

export interface Vars {
  anak: string
  panggilan: string
  mainan?: string
}

const TOKEN = /\{(anak|panggilan|mainan)\}/g

/** Replace every {token} in `text`. Unknown values are left as-is (see below). */
export function interpolate(text: string, vars: Vars): string {
  return text.replace(TOKEN, (whole, key: keyof Vars) => {
    const v = vars[key]
    // Leave the raw token in place when we genuinely don't have a value yet
    // (e.g. {mainan} before Day 1 is answered). Silently substituting "" would
    // produce sentences like "Esok kita guna  lagi" — worse than a visible bug.
    return v ?? whole
  })
}

/** Placeholders in `text` that `vars` can't resolve. Empty = safe to render. */
export function missingVars(text: string, vars: Vars): string[] {
  const missing = new Set<string>()
  for (const m of text.matchAll(TOKEN)) {
    const key = m[1] as keyof Vars
    if (vars[key] == null) missing.add(m[1])
  }
  return [...missing]
}
