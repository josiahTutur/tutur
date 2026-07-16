/* ──────────────────────────────────────────────────────────────────────────
 * Maya's audio briefing for the demo.
 *
 *   node scripts/gen-demo-voice.mjs [--force]
 *
 * Voices:
 *   ms  → ms-MY-YasminNeural   (the real product's voice)
 *   en  → en-SG-LunaNeural     (Singapore English — the closest regional accent
 *                               for a Malaysian parent. An American voice telling
 *                               a Malaysian mother how to talk to her child is a
 *                               small wrongness she would feel and not name.)
 *
 * Output: public/audio/demo/briefing-{ms,en}.mp3
 *
 * ── WHY THE SCRIPT NEVER SAYS THE CHILD'S NAME ────────────────────────────
 * Pre-generated audio cannot know she called him Adam. Splicing a name in would
 * mean per-family synthesis at runtime — which is the robotic browser voice we
 * are trying to avoid. So the script is written to not need one, and the
 * on-screen transcript matches the audio word for word, so she can follow along
 * rather than read something slightly different from what she is hearing.
 *
 * Requires edge-tts on PATH:  pip3 install edge-tts
 * ────────────────────────────────────────────────────────────────────────── */
import { execFileSync } from "node:child_process"
import { mkdirSync, existsSync } from "node:fs"

const OUT = "public/audio/demo"
const FORCE = process.argv.includes("--force")

/**
 * The briefing. This is the whole of Tutur's teaching for Day 1, spoken in about
 * forty seconds — and the point of it is that once she has heard it, she does not
 * need to look at the phone again.
 */
const SCRIPTS = {
  en: {
    voice: "en-SG-LunaNeural",
    rate: "-8%",
    text: `Today is simple.
Sit somewhere your child can see your face.
Say what they're doing, out loud, in short sentences. Not questions. Just words for what they can already see.
Then wait. Count to five in your head.
That silence will feel long. It isn't. It's where they get their turn.
And when they look at you, smile. Then follow them.
That's all. Put your phone down beside you now. I'll be here when you're done.`,
  },
  ms: {
    voice: "ms-MY-YasminNeural",
    rate: "-8%",
    text: `Hari ini mudah sahaja.
Duduk di tempat anak boleh nampak muka anda.
Sebut apa yang dia sedang buat. Kuat-kuat, ayat pendek. Bukan soalan — cuma perkataan untuk apa yang dia sudah nampak.
Kemudian tunggu. Kira lima dalam hati.
Senyap itu akan terasa lama. Sebenarnya tidak. Di situlah giliran dia.
Dan bila dia pandang anda — senyum. Kemudian ikut dia.
Itu sahaja. Letak telefon di sebelah anda sekarang. Saya tunggu di sini.`,
  },
}

mkdirSync(OUT, { recursive: true })

for (const [lang, s] of Object.entries(SCRIPTS)) {
  const file = `${OUT}/briefing-${lang}.mp3`
  if (existsSync(file) && !FORCE) {
    console.log(`• skipped ${file}`)
    continue
  }
  console.log(`• [${s.voice}] → ${file}`)
  execFileSync("edge-tts", [
    "--voice",
    s.voice,
    `--rate=${s.rate}`,
    "--text",
    s.text.replace(/\n/g, " "),
    "--write-media",
    file,
  ])
}

console.log("\nDone.")
