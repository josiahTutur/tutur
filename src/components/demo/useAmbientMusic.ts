/* ========================================================================== *
 *  useAmbientMusic — the music under the montage.
 *
 *  ── WHAT THIS IS ─────────────────────────────────────────────────────────
 *  A music box. A short, warm melody over I–V–vi–IV — the progression under half
 *  the songs anyone has ever cried to — played on a bell tone with a long decay,
 *  a soft pad underneath, and a bass note on each chord.
 *
 *  The first attempt was a drone: four sine tones holding a suspended chord. It
 *  was atmospheric and it was not music. A montage of a child's first two weeks
 *  does not want atmosphere, it wants a TUNE — something with a shape you could
 *  hum afterwards, because the thing being remembered is worth a melody.
 *
 *  ── WHY IT IS SYNTHESISED AND NOT A FILE ─────────────────────────────────
 *  I have not gone and taken a track from anywhere. Stock music needs a licence
 *  you buy, and anything lifted would follow this demo into a parent's hands and
 *  an investor's inbox.
 *
 *  ⚠ AND FOR THE REAL FILM, YOU SHOULD LICENCE ONE. A composed piece played by a
 *    human will always beat an oscillator, and this is the closing scene of your
 *    pitch. Epidemic Sound / Artlist / Musicbed are ~$15/month and will have a
 *    hundred tracks better than this one. When you have it:
 *
 *        drop it at  public/audio/demo/montage.mp3
 *        set TRACK   below
 *
 *    The fade-in, fade-out and cleanup already work for both paths.
 *
 *  ── AND WHY IT IS QUIET ───────────────────────────────────────────────────
 *  She may be watching at 10pm with a sleeping child in the next room. Music that
 *  announces itself is music that gets muted, and a muted montage is a silent one.
 * ========================================================================== */

import { useEffect, useRef } from "react"

/** Set to a path (e.g. "/audio/demo/montage.mp3") to use a real track instead. */
const TRACK: string | null = null

const VOLUME = 0.13
const FADE_IN = 1.6
const FADE_OUT = 2.2

/* -------------------------------------------------------------------------- */
/*  The music                                                                  */
/* -------------------------------------------------------------------------- */

const N: Record<string, number> = {
  F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25,
}

/** One bar per slide. The montage holds each slide 3.4s — so does each chord. */
const BAR = 3.4

/**
 * I – V – vi – IV.  C · G · Am · F.
 *
 * The most-loved four chords in popular music, and not by accident: the vi is
 * where it aches and the IV is where it resolves without quite landing — which is
 * exactly what a mother looking back at two weeks feels.
 */
const CHORDS = [
  { bass: N.C3, pad: [N.C4, N.E4, N.G4] },
  { bass: N.G2, pad: [N.B4 / 2, N.D4, N.G4] },
  { bass: N.A2, pad: [N.C4, N.E4, N.A4] },
  { bass: N.F2, pad: [N.C4, N.F4, N.A4] },
]

/**
 * The melody. Beat = BAR/4, so it breathes rather than marches.
 *
 * It rises across the first three bars and comes home on the fourth — a shape you
 * could hum back after one hearing, which is the whole job.
 */
const MELODY: [bar: number, beat: number, note: number][] = [
  // C — the question
  [0, 0, N.G4], [0, 1.5, N.A4], [0, 2.5, N.G4], [0, 3.5, N.E4],
  // G — held, breathing
  [1, 0, N.D4], [1, 1.5, N.E4], [1, 2.5, N.D4],
  // Am — the ache. Highest note of the piece lands here.
  [2, 0, N.E4], [2, 1, N.G4], [2, 2, N.A4], [2, 3, N.C5],
  // F — home, but softly
  [3, 0, N.A4], [3, 1.5, N.G4], [3, 2.5, N.F4],
  // …and again, an octave of light higher, as the memories build
  [4, 0, N.C5], [4, 1.5, N.D5], [4, 2.5, N.C5], [4, 3.5, N.G4],
  [5, 0, N.B4], [5, 1.5, N.D5], [5, 2.5, N.B4],
  [6, 0, N.C5], [6, 1, N.E5], [6, 2, N.D5], [6, 3, N.C5],
  [7, 0, N.A4], [7, 1.5, N.G4], [7, 2.5, N.F4], [7, 3.5, N.E4],
]

const BARS = 8

export function useAmbientMusic(active: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!active) return

    /* ── A real, licensed track, if one has been dropped in ─────────────── */
    if (TRACK) {
      const el = new Audio(TRACK)
      el.loop = true
      el.volume = 0
      audioRef.current = el
      void el.play().catch(() => {})

      let v = 0
      const id = window.setInterval(() => {
        v = Math.min(0.5, v + 0.012)
        el.volume = v
        if (v >= 0.5) window.clearInterval(id)
      }, 60)

      return () => {
        window.clearInterval(id)
        let out = el.volume
        const fade = window.setInterval(() => {
          out = Math.max(0, out - 0.02)
          el.volume = out
          if (out <= 0) {
            el.pause()
            window.clearInterval(fade)
          }
        }, 40)
      }
    }

    /* ── Otherwise: play it ─────────────────────────────────────────────── */
    let ctx: AudioContext
    try {
      ctx = new AudioContext()
    } catch {
      return // no Web Audio — the montage plays silent, which is fine
    }

    const t0 = ctx.currentTime + 0.08

    const master = ctx.createGain()
    master.gain.setValueAtTime(0, t0)
    master.gain.linearRampToValueAtTime(VOLUME, t0 + FADE_IN)

    // Rolls the glassiness off the oscillators. Without it they sound like a
    // hold-music synth; with it they sound like something struck.
    const warmth = ctx.createBiquadFilter()
    warmth.type = "lowpass"
    warmth.frequency.setValueAtTime(2600, t0)
    warmth.Q.setValueAtTime(0.5, t0)

    // A long, quiet tail. This is what makes a bare oscillator sound like a ROOM
    // rather than a signal generator — and it is most of the difference between
    // "music" and "a computer making a noise".
    const wet = ctx.createGain()
    wet.gain.setValueAtTime(0.3, t0)
    const reverb = ctx.createConvolver()
    reverb.buffer = impulse(ctx, 2.6, 2.4)

    master.connect(warmth)
    warmth.connect(ctx.destination)
    warmth.connect(wet)
    wet.connect(reverb)
    reverb.connect(ctx.destination)

    /** A struck bell: instant attack, long exponential decay. A music box. */
    const strike = (freq: number, at: number, gain = 0.5, decay = 2.4) => {
      const osc = ctx.createOscillator()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, at)

      // A second voice, barely detuned, an octave up and very quiet — this is the
      // shimmer that makes it read as a bell rather than a beep.
      const shimmer = ctx.createOscillator()
      shimmer.type = "sine"
      shimmer.frequency.setValueAtTime(freq * 2.004, at)
      const shimmerGain = ctx.createGain()
      shimmerGain.gain.setValueAtTime(gain * 0.14, at)
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, at + decay * 0.5)

      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, at)
      env.gain.exponentialRampToValueAtTime(gain, at + 0.012)
      env.gain.exponentialRampToValueAtTime(0.0001, at + decay)

      osc.connect(env)
      shimmer.connect(shimmerGain)
      shimmerGain.connect(env)
      env.connect(master)

      osc.start(at)
      shimmer.start(at)
      osc.stop(at + decay + 0.1)
      shimmer.stop(at + decay + 0.1)
    }

    /** The pad: chord tones, slow in, slow out. Felt, not heard. */
    const pad = (freq: number, at: number, dur: number) => {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, at)

      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, at)
      env.gain.linearRampToValueAtTime(0.08, at + dur * 0.35)
      env.gain.linearRampToValueAtTime(0.0001, at + dur)

      osc.connect(env)
      env.connect(master)
      osc.start(at)
      osc.stop(at + dur + 0.1)
    }

    for (let bar = 0; bar < BARS; bar++) {
      const at = t0 + bar * BAR
      const chord = CHORDS[bar % CHORDS.length]

      strike(chord.bass, at, 0.34, 3.4) // the root, low and soft
      chord.pad.forEach((f) => pad(f, at, BAR * 1.05))
    }

    const beat = BAR / 4
    for (const [bar, b, note] of MELODY) {
      strike(note, t0 + bar * BAR + b * beat, 0.5, 2.6)
    }

    return () => {
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + FADE_OUT)
      window.setTimeout(() => void ctx.close().catch(() => {}), (FADE_OUT + 0.4) * 1000)
    }
  }, [active])
}

/** A decaying-noise impulse response — a cheap, convincing room. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}
