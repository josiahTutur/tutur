/* ========================================================================== *
 *  useEngagedSeconds — the clock behind "masa bersama anak".
 *
 *  ── WHY NOT JUST `ended_at - started_at` ──────────────────────────────────
 *  Because that is wall-clock, and wall-clock lies. A parent opens the player,
 *  the baby cries, the phone goes face-down on the counter for forty minutes.
 *  Wall-clock would then tell her she spent forty-three minutes with her child.
 *
 *  That number would be a lie told to a parent about her own parenting — which
 *  is precisely the kind of number this app cannot afford to print. So the clock
 *  only runs while the player is open AND the tab is actually in front of her.
 *  It stops when she switches apps, locks the phone, or backgrounds the tab.
 *
 *  It still can't tell "watching the screen" from "watching the child", and it
 *  never will. But it will not credit a pocket.
 *
 *  ── WHY IT HEARTBEATS ─────────────────────────────────────────────────────
 *  "The end" is not a reliable event on mobile: tabs get killed, phones die,
 *  browsers evict. Writing the total once, at the end, means a parent who ran
 *  the whole activity and then closed the tab gets credited with nothing. So we
 *  push the running total up every few seconds and lose, at worst, one tick.
 * ========================================================================== */

import { useEffect, useRef } from "react"

/** How often the running total is pushed to the backend. */
const HEARTBEAT_MS = 15_000

export function useEngagedSeconds({
  onHeartbeat,
  onEnd,
}: {
  /** Called every ~15s with the elapsed engaged seconds. */
  onHeartbeat?: (seconds: number) => void
  /** Called once on unmount with the final count. */
  onEnd?: (seconds: number) => void
}) {
  // Refs, not state: this ticks every second and nothing renders off it. Putting
  // it in state would re-render the whole player once a second for no reason.
  const seconds = useRef(0)

  // Read through refs so re-created callbacks don't tear down the interval and
  // restart the clock from zero.
  const cbs = useRef({ onHeartbeat, onEnd })
  cbs.current = { onHeartbeat, onEnd }

  useEffect(() => {
    let sinceBeat = 0

    const id = window.setInterval(() => {
      // The whole point: a hidden tab does not count.
      if (document.visibilityState !== "visible") return
      seconds.current += 1
      sinceBeat += 1
      if (sinceBeat * 1000 >= HEARTBEAT_MS) {
        sinceBeat = 0
        cbs.current.onHeartbeat?.(seconds.current)
      }
    }, 1000)

    // Backgrounding the tab is the most likely way this session ends — on mobile
    // the tab may never be resumed and unmount may never run. Flush on the way out.
    const flush = () => {
      if (document.visibilityState === "hidden") cbs.current.onHeartbeat?.(seconds.current)
    }
    document.addEventListener("visibilitychange", flush)

    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", flush)
      cbs.current.onEnd?.(seconds.current)
    }
  }, [])

  return seconds
}
