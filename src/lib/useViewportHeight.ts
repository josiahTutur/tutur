/* ========================================================================== *
 *  useViewportHeight — the real, usable height of the screen, in a CSS var.
 *
 *  WHY THIS EXISTS
 *
 *  `100vh` is a lie on mobile. It measures the viewport as if the browser chrome
 *  were hidden, so the bottom of a 100vh page sits *behind* Safari's toolbar —
 *  which is exactly why a CTA can end up unreachable without scrolling.
 *
 *  The CSS units help but don't finish the job:
 *    · 100vh  — largest viewport (chrome hidden). Overflows. Never use it here.
 *    · 100dvh — dynamic; tracks the chrome, but that means it RESIZES mid-use
 *               and the layout visibly jumps.
 *    · 100svh — smallest viewport (chrome shown). Always fits, never jumps.
 *               This is our floor.
 *
 *  None of them shrink for the ON-SCREEN KEYBOARD, and that is the case that
 *  actually breaks onboarding: two screens ask the parent to type, and both the
 *  input and its CTA sit at the bottom of the layout. Keyboard opens → they're
 *  behind it. On iOS the layout viewport doesn't change at all, so no CSS unit
 *  can save you.
 *
 *  `visualViewport` is the only thing that knows the keyboard is there. We read
 *  it, publish it as `--app-h`, and the layout sizes itself off that — so when
 *  the keyboard opens, the whole screen reflows ABOVE it and the input stays put.
 *
 *  Fallback chain: --app-h  →  100svh  →  100vh (ancient browsers).
 * ========================================================================== */

import { useEffect } from "react"

export function useViewportHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport

    const apply = () => {
      // visualViewport.height EXCLUDES the on-screen keyboard; innerHeight does not.
      const h = vv?.height ?? window.innerHeight
      document.documentElement.style.setProperty("--app-h", `${Math.round(h)}px`)
    }

    apply()

    if (vv) {
      vv.addEventListener("resize", apply)
      // iOS shifts the visual viewport rather than resizing it when the keyboard
      // opens, so scroll events matter as much as resize ones.
      vv.addEventListener("scroll", apply)
    }
    window.addEventListener("resize", apply)
    window.addEventListener("orientationchange", apply)

    return () => {
      if (vv) {
        vv.removeEventListener("resize", apply)
        vv.removeEventListener("scroll", apply)
      }
      window.removeEventListener("resize", apply)
      window.removeEventListener("orientationchange", apply)
      document.documentElement.style.removeProperty("--app-h")
    }
  }, [])
}

/**
 * The height every full-screen onboarding surface should use.
 * Falls back gracefully if the hook hasn't run or the API is missing.
 */
export const APP_HEIGHT = "var(--app-h, 100svh)"
