/* ──────────────────────────────────────────────────────────────────────────
 * Generate Malay voice clips for the DAILY-ACTIVITY Papan AAC words.
 *
 *   node scripts/gen-activity-aac.mjs          # generate any missing clips
 *   node scripts/gen-activity-aac.mjs --force  # re-generate all
 *
 * Voices (Malaysian Malay, edge-tts):
 *   • female → ms-MY-YasminNeural  (warm, female)
 *   • male   → ms-MY-OsmanNeural   (calm, male)
 *
 * Output: public/audio/activities/aac/<voice>/<slug>.mp3
 *         (voice = "female" | "male"; slug = lowercased label, spaces → hyphens)
 *
 * This is SEPARATE from public/audio/aac (the main 48-word board) — untouched.
 * Requires edge-tts on PATH:  pip3 install edge-tts
 * ────────────────────────────────────────────────────────────────────────── */
import { execFileSync } from "node:child_process"
import { mkdirSync, existsSync, readFileSync } from "node:fs"

const VOICES = {
  female: "ms-MY-YasminNeural",
  male: "ms-MY-OsmanNeural",
}
const OUT = "public/audio/activities/aac"
const FORCE = process.argv.includes("--force")

// Pull every aacWords label straight from the activity catalogue.
const src = readFileSync("src/lib/activities.ts", "utf8")
const labels = new Set()
for (const block of src.matchAll(/aacWords:\s*\[([\s\S]*?)\]/g)) {
  for (const l of block[1].matchAll(/label:\s*"([^"]+)"/g)) labels.add(l[1])
}

const slug = (s) => s.toLowerCase().trim().replace(/\s+/g, "-")

let made = 0
let skipped = 0
for (const [key, voice] of Object.entries(VOICES)) {
  const dir = `${OUT}/${key}`
  mkdirSync(dir, { recursive: true })
  for (const label of labels) {
    const file = `${dir}/${slug(label)}.mp3`
    if (existsSync(file) && !FORCE) {
      skipped++
      continue
    }
    process.stdout.write(`• [${key}] ${label}  →  ${file}\n`)
    execFileSync("edge-tts", [
      "--voice",
      voice,
      "--text",
      label,
      "--write-media",
      file,
    ])
    made++
  }
}

console.log(
  `\nDone — ${made} generated, ${skipped} skipped ` +
    `(${labels.size} words × ${Object.keys(VOICES).length} voices).`
)
