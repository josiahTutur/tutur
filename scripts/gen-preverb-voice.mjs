/* ──────────────────────────────────────────────────────────────────────────
 * Generate Malay voice clips for the PREVERB day scripts (CCS prompts).
 *
 *   node scripts/gen-preverb-voice.mjs          # generate any missing clips
 *   node scripts/gen-preverb-voice.mjs --force  # re-generate all
 *
 * Voice: ms-MY-YasminNeural — the same warm Malaysian-Malay voice the AAC board
 * uses. The browser's own speechSynthesis was the fallback, and on a phone with
 * no Malay voice installed it reads Malay with an English accent, which is worse
 * than useless on a screen whose entire purpose is to model TONE.
 *
 * Output: public/audio/preverb/<hash>.mp3
 *         plus src/content/preverb/voice-manifest.json  (raw line → file)
 *
 * ── WHY THE CLIPS ARE GENERIC, AND THE SCREEN IS NOT ──────────────────────
 * The lines carry {panggilan} / {anak} tokens. Pre-generated audio cannot know
 * the child is called Adam, so the clip voices the SLT document's own generic
 * wording — "Ibu ambil Barbie", "Adik rasa?" — which is how the PDF actually
 * reads. The parent READS her personalised line and HEARS the generic one.
 *
 * That is a demonstration of TONE, not a read-aloud of her sentence, and the
 * button says so. Voicing a child's real name would need per-family synthesis at
 * runtime, which is the browser voice we are replacing.
 *
 * Requires edge-tts on PATH:  pip3 install edge-tts
 * ────────────────────────────────────────────────────────────────────────── */
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"

const VOICE = "ms-MY-YasminNeural"
const OUT = "public/audio/preverb"
const MANIFEST = "src/content/preverb/voice-manifest.json"
const FORCE = process.argv.includes("--force")

/** Generic stand-ins — the SLT document's own words. Keep in sync with the PDF. */
const GENERIC = { panggilan: "Ibu", anak: "Adik", mainan: "mainan" }

/**
 * Strip stage directions. MUST stay in step with `spokenPart()` in src/lib/speak.ts
 * — if they drift, the manifest keys stop matching and every clip silently misses.
 */
const spokenPart = (line) =>
  line
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/["“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const resolve = (line) =>
  line.replace(/\{(\w+)\}/g, (m, k) => GENERIC[k] ?? m)

/** Stable filename. Content-addressed: edit a line, get a new clip, no stale audio. */
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12)

// ── Pull every CCS line out of the day configs ────────────────────────────
const dir = "src/content/preverb"
const dayFiles = readdirSync(dir).filter((f) => /^day-\d+\.ts$/.test(f))

const lines = new Set()
for (const f of dayFiles) {
  const src = readFileSync(`${dir}/${f}`, "utf8")
  const block = src.match(/"ccs_prompts":\s*\[([\s\S]*?)\n  \]/)
  if (!block) continue
  for (const m of block[1].matchAll(/"line":\s*"((?:[^"\\]|\\.)*)"/g)) {
    // Un-escape the TS string literal (the lines contain \" around the speech).
    const raw = JSON.parse(`"${m[1]}"`)
    lines.add(raw)
  }
}

if (lines.size === 0) {
  console.error("No ccs_prompts lines found — did the config shape change?")
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const manifest = {}
let made = 0
let skipped = 0

for (const raw of lines) {
  const text = spokenPart(resolve(raw))
  if (!text) continue

  const file = `${hash(raw)}.mp3`
  const path = `${OUT}/${file}`
  manifest[raw] = file

  if (existsSync(path) && !FORCE) {
    skipped++
    continue
  }
  process.stdout.write(`• ${text}\n    → ${path}\n`)
  execFileSync("edge-tts", [
    "--voice",
    VOICE,
    // Slower, because the pauses ARE the technique. A brisk read of
    // "Barbie… jalan… jalan" teaches the opposite of what the line is for.
    "--rate=-15%",
    "--text",
    text,
    "--write-media",
    path,
  ])
  made++
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n")

console.log(
  `\nDone — ${made} generated, ${skipped} skipped, ${Object.keys(manifest).length} in manifest.`
)
