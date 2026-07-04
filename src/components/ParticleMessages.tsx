import { useEffect, useRef } from "react"

/* ========================================================================== *
 *  ParticleMessages — shows lines of text one at a time, each ASSEMBLING from
 *  scattered particles and DISPERSING back into particles before the next line.
 *
 *  Only one line is visible at a time, in a fixed slot. After the last line it
 *  holds and calls onComplete (e.g. to reveal a CTA).
 * ========================================================================== */

type TextParticle = {
  hx: number // home (text) position, device px
  hy: number
  ix: number // scatter-in start
  iy: number
  ang: number // disperse direction (radians)
  spd: number // disperse speed
  fade: number // per-particle fade-out rate (staggers the vanish)
  phase: number
  color: string
}

const IN = 0.5 // assemble (s)
const HOLD = 1.7 // read (s)
const OUT = 0.85 // disperse like smoke (s)

export default function ParticleMessages({
  lines,
  start,
  onComplete,
  className,
}: {
  lines: string[]
  start: boolean
  onComplete?: () => void
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startRef = useRef(start)
  startRef.current = start
  const doneRef = useRef<(() => void) | undefined>(onComplete)
  doneRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const cv = canvas
    const c = ctx
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let cancelled = false
    let raf = 0
    let particles: TextParticle[] = []
    let index = 0
    let phase: "wait" | "in" | "hold" | "out" | "idle" = "wait"
    let phaseStart = 0
    // Crisp copy for the readable "hold" phase (particles only animate in/out).
    let lineRows: string[] = []
    let linePx = 0
    let lineColor = "rgba(38,21,92,0.95)"
    const font = (px: number) =>
      `600 ${px}px 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`

    function resize() {
      const r = cv.getBoundingClientRect()
      cv.width = Math.max(1, Math.floor(r.width * dpr))
      cv.height = Math.max(1, Math.floor(r.height * dpr))
    }
    resize()

    function wrap(o: CanvasRenderingContext2D, text: string, maxW: number) {
      const words = text.split(" ")
      const out: string[] = []
      let cur = ""
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word
        if (o.measureText(test).width > maxW && cur) {
          out.push(cur)
          cur = word
        } else {
          cur = test
        }
      }
      if (cur) out.push(cur)
      return out
    }

    function buildLine(i: number) {
      particles = []
      const text = lines[i]
      if (!text) return
      const W = cv.width
      const H = cv.height
      const off = document.createElement("canvas")
      off.width = W
      off.height = H
      const o = off.getContext("2d")
      if (!o) return
      o.textAlign = "center"
      o.textBaseline = "middle"

      // Fit the font: shrink until the wrapped block fits the slot.
      const maxW = W * 0.92
      let px = Math.min(H * 0.46, 30 * dpr)
      o.font = font(px)
      let rows = wrap(o, text, maxW)
      while (rows.length * px * 1.25 > H * 0.92 && px > 11 * dpr) {
        px -= 2 * dpr
        o.font = font(px)
        rows = wrap(o, text, maxW)
      }

      o.fillStyle = "#fff"
      const lineH = px * 1.25
      let y = H / 2 - (rows.length * lineH) / 2 + lineH / 2
      for (const row of rows) {
        o.fillText(row, W / 2, y)
        y += lineH
      }

      const data = o.getImageData(0, 0, W, H).data
      const step = Math.max(2, Math.round(1.4 * dpr))
      const last = i === lines.length - 1

      // Remember the crisp layout so the "hold" phase can render solid text.
      lineRows = rows
      linePx = px
      // Tutur Violet for the story; the punchline line goes a shade deeper.
      lineColor = last ? "#5215C9" : "#6A2FE8"
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          if (data[(yy * W + xx) * 4 + 3] < 80) continue
          particles.push({
            hx: xx,
            hy: yy,
            ix: Math.random() * W,
            iy: Math.random() * H,
            // Each particle flies off at its own angle (biased upward) & speed.
            ang: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7,
            spd: 0.4 + Math.random() * 0.9,
            fade: 0.85 + Math.random() * 1.4,
            phase: Math.random() * Math.PI * 2,
            // Purple throughout — Tutur Violet, with the punchline a shade deeper.
            color: last ? "#5215C9" : "#6A2FE8",
          })
        }
      }
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (phase !== "wait") buildLine(index)
    })
    ro.observe(cv)

    function draw(progress: number, mode: "in" | "hold" | "out", t: number) {
      const sz = Math.max(1, Math.round(dpr))
      const W = cv.width
      const H = cv.height
      c.clearRect(0, 0, W, H)

      // While holding, draw the line as crisp, solid text — fully readable.
      if (mode === "hold") {
        c.globalAlpha = 1
        c.textAlign = "center"
        c.textBaseline = "middle"
        c.font = font(linePx)
        c.fillStyle = lineColor
        const lineH = linePx * 1.25
        let ty = H / 2 - (lineRows.length * lineH) / 2 + lineH / 2
        for (const row of lineRows) {
          c.fillText(row, W / 2, ty)
          ty += lineH
        }
        return
      }

      for (const p of particles) {
        let x: number
        let y: number
        let alpha: number
        if (mode === "in") {
          x = p.ix + (p.hx - p.ix) * progress
          y = p.iy + (p.hy - p.iy) * progress
          alpha = progress
        } else if (mode === "out") {
          // Smoke/burst: every particle flies off at its own angle & speed,
          // curling as it goes and fading at its own rate — no shape remains.
          const e = progress
          const ePos = 1 - Math.pow(1 - e, 2) // burst out fast, then ease
          const dist = p.spd * Math.max(W, H) * 0.7 * ePos
          const curl = Math.sin(t * 5 + p.phase) * 5 * dpr * e
          x = p.hx + Math.cos(p.ang) * dist + Math.cos(p.ang + 1.5708) * curl
          y = p.hy + Math.sin(p.ang) * dist + Math.sin(p.ang + 1.5708) * curl
          alpha = Math.max(0, 1 - e * p.fade)
        } else {
          x = p.hx
          y = p.hy
          alpha = 1
        }
        c.globalAlpha = alpha
        c.fillStyle = p.color
        c.fillRect(x, y, sz, sz)
      }
      c.globalAlpha = 1
    }

    function frame(ts: number) {
      if (cancelled) return
      const now = ts / 1000

      if (phase === "wait") {
        c.clearRect(0, 0, cv.width, cv.height)
        if (startRef.current) {
          index = 0
          buildLine(0)
          phase = "in"
          phaseStart = now
        }
        raf = requestAnimationFrame(frame)
        return
      }

      const elapsed = now - phaseStart
      if (phase === "in") {
        const p = Math.min(elapsed / IN, 1)
        draw(1 - Math.pow(1 - p, 3), "in", now)
        if (p >= 1) {
          phase = "hold"
          phaseStart = now
        }
      } else if (phase === "hold") {
        draw(1, "hold", now)
        if (elapsed >= HOLD) {
          if (index >= lines.length - 1) {
            phase = "idle"
            doneRef.current?.()
          } else {
            phase = "out"
            phaseStart = now
          }
        }
      } else if (phase === "out") {
        const p = Math.min(elapsed / OUT, 1)
        draw(p, "out", now)
        if (p >= 1) {
          index += 1
          buildLine(index)
          phase = "in"
          phaseStart = now
        }
      } else {
        draw(1, "hold", now) // idle — keep the final line
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [lines])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ pointerEvents: "none" }}
      aria-hidden
    />
  )
}
