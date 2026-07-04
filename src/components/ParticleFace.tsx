import { useEffect, useRef } from "react"

/* ========================================================================== *
 *  ParticleFace — a particle portrait of Maya (the AI).
 *
 *  Loads a portrait image (public/maya.png — already transparent, used as-is)
 *  and samples its opaque pixels into thousands of coloured particles. They fly
 *  in from scattered positions and "assemble" into the image, which then fades
 *  in crisp over the particles.
 *
 *  If the image is missing, it falls back to a procedural violet face so the
 *  app never breaks.
 * ========================================================================== */

interface Particle {
  nx: number // home position, normalised 0–1 in sample space
  ny: number
  bright: number
  phase: number
  sx: number // intro start position (canvas px); -1 until assigned
  sy: number
  color: string
}

/** Fallback: draw a stylised feminine face as an alpha mask. */
function drawFaceMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2
  const fy = 130
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.beginPath()
  ctx.moveTo(cx - 96, 170)
  ctx.bezierCurveTo(cx - 122, 8, cx + 122, 8, cx + 96, 170)
  ctx.bezierCurveTo(cx + 120, 252, cx + 70, 298, cx + 42, 300)
  ctx.lineTo(cx + 20, 232)
  ctx.bezierCurveTo(cx + 42, 150, cx - 42, 150, cx - 20, 232)
  ctx.lineTo(cx - 42, 300)
  ctx.bezierCurveTo(cx - 70, 298, cx - 120, 252, cx - 96, 170)
  ctx.closePath()
  ctx.fill()
  const g = ctx.createRadialGradient(cx, fy - 12, 8, cx, fy, 92)
  g.addColorStop(0, "rgba(255,255,255,0.98)")
  g.addColorStop(0.65, "rgba(255,255,255,0.88)")
  g.addColorStop(1, "rgba(255,255,255,0.5)")
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(cx, fy, 70, 90, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = "destination-out"
  for (const s of [-28, 28]) {
    ctx.fillStyle = "rgba(0,0,0,0.9)"
    ctx.beginPath()
    ctx.ellipse(cx + s, fy - 6, 17, 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = "source-over"
}

export default function ParticleFace({
  src = "/maya.png",
  className,
}: {
  src?: string
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const cv = canvas
    const c = ctx
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let disposed = false
    let particles: Particle[] = []
    let colored = false
    let SW = 0
    let SH = 0
    let size = Math.max(1, Math.round(dpr))
    // The original (already-transparent) image the particles resolve into.
    let revealImg: HTMLImageElement | null = null

    function pushSamples(
      step: number,
      keep: number,
      pick: (i: number) => { color: string; bright: number } | null
    ) {
      particles = []
      for (let y = 0; y < SH; y += step) {
        for (let x = 0; x < SW; x += step) {
          const got = pick((y * SW + x) * 4)
          if (!got) continue
          if (Math.random() > keep) continue
          particles.push({
            nx: x / SW,
            ny: y / SH,
            bright: got.bright,
            phase: Math.random() * Math.PI * 2,
            sx: -1,
            sy: -1,
            color: got.color,
          })
        }
      }
    }

    function buildFromImage(img: HTMLImageElement) {
      const aspect = img.width / img.height || 0.85
      SW = 184
      SH = Math.max(1, Math.round(SW / aspect))
      const off = document.createElement("canvas")
      off.width = SW
      off.height = SH
      const o = off.getContext("2d")
      if (!o) return buildProcedural()
      o.drawImage(img, 0, 0, SW, SH)
      const d = o.getImageData(0, 0, SW, SH).data
      // The image is already transparent — sample only its opaque pixels; do NOT
      // colour-key (that would punch holes in Maya's darker areas).
      pushSamples(2, 0.82, (i) => {
        const a = d[i + 3]
        if (a < 24) return null
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return { color: `rgb(${r},${g},${b})`, bright: 0.55 + lum * 0.45 }
      })
      colored = true
      size = Math.max(1, Math.round(dpr * 1.4))

      // Use the original image as-is for the crisp reveal — no keying.
      revealImg = img
    }

    function buildProcedural() {
      SW = 260
      SH = 300
      const off = document.createElement("canvas")
      off.width = SW
      off.height = SH
      const o = off.getContext("2d")
      if (!o) return
      drawFaceMask(o, SW, SH)
      const d = o.getImageData(0, 0, SW, SH).data
      pushSamples(3, 0.72, (i) => {
        const a = d[i + 3] / 255
        if (a < 0.18) return null
        const hue = 248 + Math.random() * 34
        const light = 64 + Math.random() * 20
        return { color: `hsl(${hue} 92% ${light}%)`, bright: Math.min(1, a) }
      })
      colored = false
      size = Math.max(1, Math.round(dpr))
    }

    let w = 0
    let h = 0
    function resize() {
      const rect = cv.getBoundingClientRect()
      w = rect.width
      h = rect.height
      cv.width = Math.max(1, Math.floor(w * dpr))
      cv.height = Math.max(1, Math.floor(h * dpr))
      for (const p of particles) p.sx = -1
    }
    const ro = new ResizeObserver(resize)

    let raf = 0
    let start = 0
    let started = false

    function ready() {
      if (disposed || started) return
      started = true
      resize()
      ro.observe(cv)
      raf = requestAnimationFrame(frame)
    }

    const ASSEMBLE = 2.2 // particles converge (s)
    const REVEAL = 0.7 // crossfade into the crisp photo (s)

    function frame(ts: number) {
      if (!start) start = ts
      const t = (ts - start) / 1000
      const intro = Math.min(t / ASSEMBLE, 1)
      const ease = 1 - Math.pow(1 - intro, 3)
      // How much of the final crisp photo is shown (0 → 1).
      const photo =
        colored && revealImg
          ? Math.max(0, Math.min(1, (t - ASSEMBLE) / REVEAL))
          : 0

      const faceH = cv.height * 0.98
      const faceW = faceH * (SW / SH)
      const ox = (cv.width - faceW) / 2
      const oy = (cv.height - faceH) / 2

      c.globalCompositeOperation = "source-over"
      c.clearRect(0, 0, cv.width, cv.height)

      // Particles — drawn until the crisp photo has fully taken over.
      if (photo < 1) {
        c.globalCompositeOperation = colored ? "source-over" : "lighter"
        for (const p of particles) {
          const hx = ox + p.nx * faceW
          const hy = oy + p.ny * faceH
          if (p.sx < 0) {
            p.sx = Math.random() * cv.width
            p.sy = Math.random() * cv.height
          }
          const x = p.sx + (hx - p.sx) * ease
          const y = p.sy + (hy - p.sy) * ease
          const twinkle = colored
            ? 0.92 + 0.08 * Math.sin(t * 1.3 + p.phase)
            : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + p.phase))
          c.globalAlpha = Math.min(1, p.bright * twinkle) * (0.08 + 0.92 * ease)
          c.fillStyle = p.color
          c.fillRect(x, y, size, size)
        }
      }

      // Crisp image fades in over the assembled particles → exact maya.png,
      // used as-is (its transparency is preserved, nothing is keyed out).
      if (photo > 0 && revealImg) {
        c.globalCompositeOperation = "source-over"
        c.globalAlpha = photo
        c.drawImage(revealImg, ox, oy, faceW, faceH)
        c.globalAlpha = 1
      }

      raf = requestAnimationFrame(frame)
    }

    const img = new Image()
    img.onload = () => {
      if (disposed) return
      try {
        buildFromImage(img)
      } catch {
        buildProcedural()
      }
      ready()
    }
    img.onerror = () => {
      if (disposed) return
      buildProcedural()
      ready()
    }
    img.src = src

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [src])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ pointerEvents: "none" }}
      aria-hidden
    />
  )
}
