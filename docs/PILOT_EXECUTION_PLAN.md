# TUTUR Pilot — Execution Plan

Maps `TUTUR_Pilot_Build_Spec_v1.md` + `TUTUR_Pilot_Maya_Screen_Scripts_v2.md` onto the
**current codebase** (as of `02800f4`), and sequences the work.

> **How to use this doc.** Section 2 is the keep/adapt/retire verdict per existing screen —
> override any row you disagree with before Phase 1 starts. Section 3 lists conflicts that
> must be resolved *before* code, because they poison naming everywhere. Section 6 is the
> build sequence. Tick the checkboxes as you go.

---

## 1. The honest verdict

**This is a re-architecture, not a re-skin.** The spec describes a different product shape
than what is built:

| | Current app | Spec |
|---|---|---|
| **Organising principle** | Child is assessed into a **stage (1–5)**; content is served **per-stage** | Child is **screened** (flag/no-flag); content is served **per-day (1–14)** |
| **Content unit** | 6 activities, browsable in any order | 14 fixed days, sequential unlock |
| **The player** | AAC word board (tap tiles, 15s min) | 3-phase script cards + withhold timers |
| **After the activity** | 1 free-text note | 10 structured observation screens + 3 reflection screens |
| **Progress** | Fake (hardcoded array) | Real day-sessions, KP trajectories, milestones |
| **Instrumentation** | None | ~30 event types (§6) |

The **shell** survives (auth, i18n, design system, settings, admin, nav). The **core loop**
does not. Roughly:

- **~35% reusable as-is** — auth, DS tokens, i18n, nav shell, admin, settings scaffolding
- **~25% adaptable** — dashboard, calendar, settings, profile, celebration
- **~40% net-new or rebuild** — screening, consent, tour, day player, tracker, recaps, events

Budget accordingly. This is not a week of work.

---

## 2. Screen-by-screen verdict

Override anything here before Phase 1.

### Keep as-is
| File | Why |
|---|---|
| [`Auth.tsx`](../src/components/Auth.tsx) | Supabase auth + OAuth + maintenance gate. Spec doesn't change auth. |
| [`Intro.tsx`](../src/components/Intro.tsx) | Pre-auth landing. Spec starts at A1 *after* sign-up. |
| [`BrandPanel.tsx`](../src/components/BrandPanel.tsx), [`ParticleFace.tsx`](../src/components/ParticleFace.tsx), [`ParticleMessages.tsx`](../src/components/ParticleMessages.tsx) | Brand/Maya identity. Reuse Maya's face in the new bubbles. |
| [`src/tutur-ds/`](../src/tutur-ds/) | Design tokens. **This is your visual spec** — the script doc has no visuals. |
| [`i18n.tsx`](../src/lib/i18n.tsx) | `Loc<T>` pattern + `ms` default. Extend, don't replace. |
| [`AccountDeleted.tsx`](../src/components/AccountDeleted.tsx), [`JoinChild.tsx`](../src/components/JoinChild.tsx) | Unaffected. |
| [`ui/*`](../src/components/ui/) | shadcn primitives. |

### Adapt
| File | Change |
|---|---|
| [`DashboardHub.tsx`](../src/components/DashboardHub.tsx) (2187 ln) | Keep the nav-rail shell + `ViewLayer` cross-fade. **Replace the nav set**: spec needs DASH · ITEMS · PROG · HELP · SET. Retire `ai` / `aac` / `analysis` tabs (see §3.4). Today Card becomes the primary CTA. Add the variant-B SLT banner. |
| [`ProgressCalendar.tsx`](../src/components/ProgressCalendar.tsx) | Keep the grid + `DayStatus` union. **Rewire to real `day_session` rows.** Add `day_number` vs `calendar_date` distinction (spec §2.2 — a missed calendar day does *not* skip content). |
| [`SettingsView.tsx`](../src/components/SettingsView.tsx) (1729 ln) | Keep language / password / notifications / invite sections. **Remove** Stage, Goals, Routines dialogs (§3.3). **Add** reminder-time bucket, mode preference, consent management, export + delete data (spec §3.5). |
| [`ProfileView.tsx`](../src/components/ProfileView.tsx) | Keep. Fields shift to A2–A6 (nickname, age bucket, relationship, parent age bucket). |
| [`ActivityLibrary.tsx`](../src/components/ActivityLibrary.tsx) (1403 ln) | **Harvest, don't keep.** Salvage: the completion/celebration animation, the reflection field, `ActivityRecord`, the quit-confirm dialog. The AAC board player is replaced by the C2–C4 script player. |
| [`Chat.tsx`](../src/components/Chat.tsx) | **Harvest the tap-to-answer question UI + `TypingBubble`** — that *is* Maya's bubble system, and it's exactly what A1–A14 and C5–C14 need. Retire the 20-question profiling content. |
| [`WawasanView.tsx`](../src/components/WawasanView.tsx) / [`UsersView.tsx`](../src/components/UsersView.tsx) | Keep for admin. Later: point at the new pilot metrics (§6.2). In-browser aggregation won't scale, but is fine at pilot cohort size. |
| [`FeedbackView.tsx`](../src/components/FeedbackView.tsx) + [`survey.ts`](../src/lib/survey.ts) | Keep. **`survey.ts`'s `Question` type is the best precedent in the repo** for the day-config observation questions — same `single`/`multi`/`scale`/`other` shape. Copy the pattern. |

### Retire / park
| File | Why |
|---|---|
| [`StageIntro.tsx`](../src/components/StageIntro.tsx) (555 ln) | Teaches the 5-stage model. Spec has no staging. |
| [`ProfilingResults.tsx`](../src/components/ProfilingResults.tsx) (517 ln) | Scores 15 Likert items → stage. Replaced by A13 variant A/B/C. |
| [`GoalSelection.tsx`](../src/components/GoalSelection.tsx) | Goal is fixed (G1) in the pilot. |
| [`RoutineSelection.tsx`](../src/components/RoutineSelection.tsx) | Routine comes from day config (`"routine": "mandi"`). |
| [`ActivitySelection.tsx`](../src/components/ActivitySelection.tsx) | Days 1–14 are fixed; nothing to curate. |
| [`AnalysisView.tsx`](../src/components/AnalysisView.tsx) (579 ln) | Reads fake data. Replaced by PROG. Already coming-soon-gated, so zero user impact. |
| [`Dashboard.tsx`](../src/components/Dashboard.tsx) | Already dead code — imported nowhere. **Delete now.** |
| [`Welcome.tsx`](../src/components/Welcome.tsx) | Story pages + first 5 Qs. Superseded by A1–A6. Keep the story pages if you still want the founding-member pitch. |

> **Don't delete these in Phase 1.** Move them to `src/components/_parked/` and drop them from
> the `View` union. You lose nothing, and post-pilot Module 2 may want the stage model back.

---

## 2b. DECISIONS TAKEN (2026-07-12)

| # | Decision | Chosen | Consequence |
|---|---|---|---|
| 1 | **AAC board** | **Hidden for the pilot** | Park the `aac` nav tab. Drop `aacWords` from the day loop. Keeps the completion metric clean. Code moves to `_parked/`, not deleted. |
| 2 | **Identity vault** | **Separate Postgres `vault` schema** | One migration, own RLS, no admin SELECT. Names / contact / free-text / voice live here; clinical store keys on opaque UUIDs. |
| 3 | **Reminders** | **PWA push + install prompt** | Service worker + Notification API. **Accept the iOS ceiling**: reminders only fire for families who add to home screen. Build an install prompt into onboarding and *measure install rate* — it directly caps the §6.2 completion numbers. |
| 4 | **Stage model** | **20-question profiling HIDDEN. CCS survives as a per-day observation.** | The one-time *profiling → stage* instrument is dead. But **CCS1–CCS5 is load-bearing in the actual content** (see §2c). `StageIntro`, `ProfilingResults`, `Chat` profiling → `_parked/`, hidden but **not deleted**. |
| 5 | **Naming** (§3.1) | **`JA1–JA5` (joint attention) · `CCS1–CCS5` (communication stage)** | Ratified. Delete the duplicate CCS vocabulary in `stages.ts`. Do the rename in Phase 1. |
| 6 | **Design** | **Follow existing design elements** — buttons, cards, spacing from the current app + `src/tutur-ds/`. | No new visual language. Visual design revisited post-pilot. |
| 7 | **Existing dashboard** | **Keep it running on fake data during the rebuild.** | Don't rip out `ActivityLibrary` / `progress.ts` mock in Phase 1. The current dashboard must keep demoing activities until the new day-player replaces it. Park old screens only when their replacement ships. |

> **On #4 — do not delete.** The parked profiling still compiles and can be re-enabled. Note for
> when you revisit: `T4` and `T5` stage content is **byte-identical in all 6 activities**, so only
> 4 real levels were ever authored. Any revival should fix that first.

---

## 2c. CONTENT SOURCE OF TRUTH — and a conflict

**Source:** `JO 110726 Tutur_14days_Revised_Draft_v2.pdf` — contains **Days 1–14 complete** (H1–H14).
Day 7 and Day 14 are recaps, matching spec §2.1. This is the authoritative content, not the spec's
§4 example.

### CCS is NOT flat — correcting an earlier claim
Every day carries **4 CCS-graded prompt tiers** (CCS1 · CCS2 · CCS3 · CCS4–5 merged). Example, Day 1:

| Tier | Technique | Line |
|---|---|---|
| CCS1 | Self Talk + Parallel Talk | "Ibu ambil Barbie. Barbie cantik." [naratif, 2–3 kali] |
| CCS2 | Withhold & Wait | "Nak Barbie?" [tunggu 5s, hulur tapi tahan] |
| CCS3 | Beri Pilihan | "Baju MERAH… ke… BIRU?" [tunjuk dua] |
| CCS4–5 | Expand + Extend | "Barbie nak pergi mana? Adik rasa?" |

**But this is cheap, not a 5× content explosion:**
- The main script (Persediaan → Semasa → Selesai) is **flat** — one per day
- CCS adds **4 short lines** per day, not 4 full scripts
- Day 1 / 13 / 14 vary by **toy interest** (Barbie / Masak-masak / Lego), not by CCS

### 🔴 CONFLICT — is CCS asked or derived?
| Source | Behaviour |
|---|---|
| Maya script v2, C12 note | *"CCS is NOT asked directly — Maya **derives** it server-side. Asking parents to self-rate CCS is too clinical."* |
| Build spec §5.11 | **Derived** server-side |
| **This PDF's daily tracker** | **Asked** — `CCS anak: [_] CCS1 … [_] CCS5` checkbox |

**Default: follow the spec (derive).** The PDF is the paper instrument; the app spec is the later,
considered design. **SLT to confirm** — it changes whether C12 has one question or two.

### Other content facts the schema must carry
- **KP1–KP8** (8 pre-speech skills). A day's 5 tracker rows **may repeat a KP code**
  (e.g. Day 4 has KP6 twice, Day 5 has KP3 twice) — key rows by `question_id`, not `kp_code`.
- **JA1–JA5 descriptors are per-day** — the ladder is re-worded for each day's routine.
- **Counts** exist: Day 5 (check-in tally), Day 11 (minta with-JA vs without-JA), Day 13 (check-in tally).
- **`AAC hari ini`** is present on every day → **store the field, render nothing** (§2b#1).
- **TPD** (Tunggu · Perhati · Dengar) coaching notes per day.
- Content is **Malay-only** in the source. Per spec §1.3, English appears only in SLT export —
  so day-config text is `string`, not `Loc`.

> **On #3 — instrument the install.** Add `pwa_install_prompted` / `pwa_installed` /
> `notification_permission{granted}` to the §6.1 event taxonomy. If install rate is low, you need
> to know *before* you interpret a low completion rate as disinterest.

---

## 3. Conflicts to resolve BEFORE writing code

> §3.2, §3.3, §3.4 are now **RESOLVED** — see §2b. §3.1 is still open and blocks Phase 1.

These are not opinions — they are collisions that will produce silent bugs if left.

### 3.1 🔴 `T1–T5` means three different things
| Where | Meaning |
|---|---|
| [`activities.ts:16`](../src/lib/activities.ts#L16) `StageCode` | Child **communication stage** (CCS 1–5) |
| Spec `ja_level` | **Joint-attention ladder** per day (C12) |
| Spec `ccs_derived` | 1–5, server-computed |
| [`stages.ts`](../src/lib/stages.ts) `STAGES_BY_LANG` | The *same* CCS 1–5, **second vocabulary** (Peneroka/Isyarat/…) |

**Decision required.** Proposal: `JA1–JA5` for joint attention, `CCS1–CCS5` for communication
stage, delete one of the two CCS vocabularies. Do this rename *first* — it touches everything.

### 3.2 🔴 Identity vault separation (spec §3.1)
The spec mandates two stores: an access-restricted **identity vault** (names, contact,
free-text, voice) and a **clinical store** keyed by opaque UUIDs. Today everything is in
`profiles`/`children` in one schema.

Options: (a) separate Postgres **schema** `vault` with its own RLS and no admin SELECT —
cheapest, meets the spirit; (b) separate database — strongest, most work; (c) column-level
only — does not meet the spec.

**This is a legal-adjacent decision (§8 item 7). Decide before the data layer is built** —
retrofitting a vault split after 14 days of live data is painful.

### 3.3 🟡 The stage model disappears
Screening (A7–A12) is a **flag instrument**, not a staging instrument. It cannot produce a
stage. So per-stage content (`Activity.stages[]`, `StageContent`) has no input in the pilot.

Confirm you accept this. It retires a lot of existing content work, and `SettingsView`'s
stage-change dialog, `StageIntro`, `ProfilingResults` all fall out of it.

### 3.4 🟡 AAC is out of scope (spec §1.2) but is built
Spec: *"AAC layer (cards, symbols, AAC demo videos). Store the A12 diagnosis answer; render nothing."*
You have a full AAC board (`aac` nav tab, `AacBoard()`, per-activity `aacWords`, audio assets).

**Decision:** hide the AAC tab for the pilot (recommended — it's a confound for the completion
metric), or keep it as a non-instrumented extra.

### 3.5 🟡 `Activity.day` is decorative
`day: 1..6` exists but nothing selects by it — `DashboardHub` serves `pool.slice(0, 3)`, the
same 3 activities forever. There is **no `programme_start_date`** anywhere. The entire
day-1-of-14 concept is net-new.

---

## 4. Blocking decisions (owner → needed by)

Spec §8 items, plus engineering ones the spec doesn't cover:

| # | Decision | Owner | Blocks |
|---|---|---|---|
| 1 | "Kadang-kadang" flag threshold (A7–A11) | SLT | Phase 3 |
| 2 | CCS derivation rules from KP + JA | SLT | Phase 8 |
| 3 | Maya clinical phrasing sign-off | SLT | Phase 3 |
| 7 | PDPA review + retention periods | Legal | **Phase 2** |
| — | ~~Vault architecture~~ | — | ✅ separate schema (§2b) |
| — | **T1–T5 naming** (§3.1) | Eng | **Phase 1** — still open |
| — | ~~Reminder channel~~ | — | ✅ PWA push (§2b) |
| — | ~~AAC hide or keep~~ | — | ✅ hidden (§2b) |
| — | ~~Stage model~~ | — | ✅ flat per-day (§2b) |
| 8 | Video scope (3 modes D1–D3) | Content | Phase 5 |
| 10 | Cohort size / recruitment | Product | Phase 9 |

Items 1, 2, 3 can be **stubbed with defaults** and swapped later — they don't block the build,
only the launch. Items marked **bold** genuinely block.

---

## 5. Risks I'd flag now

1. **🔴 Reminders have an accepted iOS ceiling.** Decision §2b#3 is PWA push. This means daily
   notifications **only fire for families who add the app to their home screen** — on iOS Safari
   there is no other path. Reminders are load-bearing for a daily-habit pilot, so:
   - Build the install prompt into onboarding (after A14 / before the tour is a good slot).
   - **Instrument it**: `pwa_install_prompted`, `pwa_installed`, `notification_permission{granted}`.
   - Report §6.2 completion **segmented by installed vs not**. If install rate is low, a low
     completion rate is a *delivery* failure, not a *motivation* failure — and you must be able
     to tell those apart, or the pilot's primary question is unanswerable.
   - Fallback worth costing: if install rate < ~50% at D3, have a WhatsApp/email nudge ready.

2. **🟠 Voice notes (C17)** need `MediaRecorder` + a Supabase Storage bucket + a retention/consent
   story. Not hard, but net-new and touches the vault decision.

3. **🟠 Video/gambar assets** are a content dependency, not an engineering one. Spec says full
   3 modes for **D1–D3 only**, with `"akan datang"` fallback to skrip. Build the fallback path
   first so missing assets never block.

4. **🟠 `activity_completions` has no co-parent UPDATE policy.** A co-parent can insert but not
   edit. Carry this bug forward into `day_session` at your peril.

5. **🟡 Migrations are hand-run SQL** ("Run once in Supabase → SQL Editor"). No `config.toml`,
   no CI, no `db push`. With ~8 new tables coming, adopt the Supabase CLI now or you *will*
   drift between local and live.

---

## 6. Build sequence

### Phase 0 — Freeze (no code)
- [x] ~~§3.2 vault~~ → separate schema · ~~§3.3 stage~~ → flat per-day · ~~§3.4 AAC~~ → hidden · ~~reminder channel~~ → PWA
- [ ] **Resolve §3.1 (T1–T5 naming)** — the last blocker on Phase 1
- [ ] Kick off §8 item 7 (PDPA / Legal) — it blocks Phase 2
- [ ] Confirm the keep/adapt/retire table in §2

### Phase 1 — Foundations
- [ ] `git checkout -b pilot`
- [ ] Delete dead [`Dashboard.tsx`](../src/components/Dashboard.tsx)
- [ ] **Create `src/components/_parked/`** and move, dropping each from the `View` union in
      [`App.tsx`](../src/App.tsx#L70): `StageIntro`, `ProfilingResults`, `Chat` (profiling),
      `GoalSelection`, `RoutineSelection`, `ActivitySelection`, `AnalysisView`, `Welcome`.
      **Hidden, still compiling, not deleted** (§2b#4).
- [ ] **Hide the `aac` nav tab** in [`DashboardHub.tsx`](../src/components/DashboardHub.tsx#L112) (§2b#1)
- [ ] Execute the T1–T5 rename (§3.1) across `activities.ts`, `stages.ts`, `SettingsView`, `ActivityLibrary`
- [x] **`src/lib/dayConfig.ts`** — schema for the spec §4 config, reconciled with the real content
      PDF: `DayConfig` · `RecapConfig` · `CcsPrompt` · `ObservationQuestion` · `ChildSignalGroup` ·
      `PrepItem` · `ActivityPhase` · `TpdNote` · `CountDef` · `MilestoneDef`.
      Uses the ratified `JA1–JA5` / `CCS1–CCS5` naming.
- [x] **`src/content/days/day-01.ts`** — H1 extracted from the PDF, **type-checked** (verified: a bad
      KP code or a missing JA level fails `npm run lint`).
- [x] **`src/content/days/index.ts`** — registry + `isRecap()` / `isActivity()` narrowing.
- [ ] **Days 2–14** (+ recap-07, recap-14) extracted from the PDF into the same shape.
- [ ] **`scripts/validate-content.ts`** — RUNTIME checks the type system can't do: every
      `audio_id`/`video_id`/`storyboard_id` resolves to a real asset, ≤6 observation questions/day,
      `milestone_on_positive` ids exist in that day's `milestones[]`. Wire into `npm run lint`.
- [ ] Adopt Supabase CLI (§5.5)

> **Content files are `.ts`, not `.json` — deliberately.** A JSON import widens string literals
> (`"activity"` → `string`), so it can only be made to fit the schema with an `as` cast, which
> silently disables every check. The `.ts` files are plain object literals ending in
> `satisfies DayConfig`; the only difference from JSON is one wrapper line, and in exchange a
> malformed day cannot reach a parent.

### Phase 2 — Data layer
- [ ] Migration `0011_pilot_schema.sql` — `screening_baseline`, `toy_inventory`, `day_session`,
      `tracker_record`, `milestone_event`, `word_bank_entry`, `support_trigger`
- [ ] Migration `0012_consent.sql` — 4 consent flags (§3.5), append-only consent log
- [ ] Migration `0013_event_log.sql` — `event_log(family_id, child_id, event, props jsonb, ts)`
- [ ] Migration `0014_vault.sql` — **separate `vault` schema** (§2b#2). Own RLS. **No admin SELECT.**
      Move/land here: `parent_name`, `child_nickname`, contact, all `other_text` values,
      reflection free-text, voice URLs, consent signature records. Clinical store keys on
      `family_id`/`child_id` UUIDs only.
- [ ] RLS for every new table. **Include the co-parent UPDATE policy** (§5.4).
- [ ] Add `children.programme_start_date` + `current_day_number` (§3.5)
- [ ] **`src/lib/events.ts`** — `logEvent(name, props)`, buffered, fire-and-forget. Do this
      *before* the screens, so every screen can instrument as it is built.
- [ ] Extend [`db.ts`](../src/lib/db.ts) with the new read/write functions
- [ ] **Rewrite [`progress.ts`](../src/lib/progress.ts)** against real `day_session` rows — delete the hardcoded array

### Phase 3 — Onboarding (A1–A14 + CONSENT)
- [ ] `src/components/onboarding/` — one component per screen, driven by a **step array**, not 14 bespoke files
- [ ] Reuse Chat's bubble + tap-to-answer UI; enforce the spec's rules (1 question/screen, max 5 choices, "Lain-lain" reveals a text box, **fixed clinical scales get no Lain-lain**)
- [ ] A3 age gate → skip A11 if <12 bulan (§5.2)
- [ ] A13 variant A/B/C routing (§5.1)
- [ ] **CONSENT screen** — 4 toggles, `consent_research` defaults **OFF**
- [ ] A14 confidence 1–5 → `confidence_d0`
- [ ] **PWA install prompt** (§5.1) — after A14, before the tour. Request notification permission here.
- [ ] Instrument: `onboarding_screen_viewed`, `onboarding_abandoned{screen_id}`,
      `pwa_install_prompted`, `pwa_installed`, `notification_permission{granted}`

### Phase 4 — Dashboard + Tour + Items
- [ ] Rework `DashboardHub` nav to DASH · ITEMS · PROG · HELP · SET
- [ ] Today Card as primary CTA; day locked/done states
- [ ] **T1–T4 coach-marks** (net-new — no tour system exists). T3 is the interactive toy picker.
- [ ] **Toy gate** (§5.3): ≥3 distinct toys before Day 1 can start; same picker component reachable from C1 if the tour was skipped
- [ ] **ITEMS** — Senarai barang, checked/unchecked/amber (due ≤ `advance_notice_days`)
- [ ] Variant-B SLT banner (dismissable, re-shown after weekly re-screen)

### Phase 5 — Day player (C1–C4)
- [ ] **C1 Today Card** — mode switcher (skrip/gambar/video, default video, last-used remembered), first-time Maya bubble, prep warning, substitute script
- [ ] **C2–C4** — generic 3-phase player driven **entirely by day config**. Line cards, swipe to advance, `Tandai momen`, situational-branch drawer.
- [ ] **Timers** (§5.7): auto-start 1s after card advance; on completion flip to "Tunggu isyarat" until swipe; **log requested vs actual elapsed** (this is a fidelity metric)
- [ ] Instrument the full `activity_*` / `timer_*` / `mode_*` event set

### Phase 6 — Tracker (C5–C18)
- [ ] **C5–C14** — 10 observation screens from day config. One question per screen, auto-advance on tap, progress dots.
- [ ] `milestone_on_positive` → auto-create `milestone_event` on first Muncul/Konsisten
- [ ] C5 (D1) writes `{mainan}` → drives `interest_variants` for D2–D14 (§5.4)
- [ ] **C15–C17** reflection; C16 `Perlukan bantuan` → support branch → `support_trigger`
- [ ] **C18** celebration — reuse the existing confetti; reminder-time ask (first day only)
- [ ] **Auto-save every answered screen** (§5.8); resume at first unanswered question
- [ ] Instrument `obs_screen_answered` / **`obs_abandoned{question_id}`** — this is the pilot's
      primary instrumentation. Target: tracker under 90s.

### Phase 7 — Progress (PROG)
- [ ] Parent lane **before** child lane (framing rule §1.3)
- [ ] Child lane: week-1 empty state, self-comparison only ("vs Hari 1") — **never age norms**
- [ ] Bank Kata, milestone timeline
- [ ] Streaks (§5.6): `separuh` keeps the streak; one auto "pelindung streak" per week
- [ ] Rewire `ProgressCalendar` to `day_number` vs `calendar_date`

### Phase 8 — Recaps + export
- [ ] **RECAP7** — week carousel + one activity (reuses C2–C4) + confidence + weekly re-screen
- [ ] **RECAP14** — + before/after (D1 vs D14) + routing recommendation + SLT export
- [ ] **D14 routing (§5.9)** — display-only. Show ONE primary recommendation; **log all satisfied conditions**. Frame repeats as plans, not failure.
- [ ] CCS derivation (§5.11) — server-side; **store inputs so rules can be recomputed retroactively**
- [ ] **SLT report PDF** (§7) — stands in for the clinic dashboard
- [ ] Clinic-link data contract + `consent_clinic_share`. Reflections shared **only** via the opt-in sub-toggle (default OFF).

### Phase 9 — Pilot readiness
- [ ] **Service worker + PWA manifest + push** shipped (§5.1); daily notification at the chosen
      time bucket, copy = today's routine + prep line (§5.5)
- [ ] Escalation nudges: unchecked prep item with `advance_notice_days` = n → Maya nudge on C18
      from n days before first use until checked (§5.5)
- [ ] **Segment §6.2 metrics by PWA-installed** — otherwise a delivery failure reads as disinterest
- [ ] **Walk all 14 days end-to-end** with a seeded account. Every day. No shortcuts.
- [ ] Verify every §6.1 event fires with correct props
- [ ] Verify the §6.2 metrics are computable from real rows
- [ ] Admin: point Wawasan at pilot metrics
- [ ] Data export + deletion paths work (§3.5)
- [ ] PDPA sign-off

---

## 7. Definition of done

The pilot is buildable-complete when, for a seeded family, you can:

1. Sign up → complete A1–A14 → consent → tour → land on DASH with 3 toys confirmed
2. Complete Day 1: C1 → C2–C4 (timers logged) → C5–C14 → C15–C17 → C18 → back to DASH
3. See Day 2 unlocked, Day 3 locked
4. Miss a calendar day and confirm the **content day does not skip**
5. Reach D7 → RECAP7 → re-screen → banner re-evaluates
6. Reach D14 → RECAP14 → routing recommendation → export the SLT PDF
7. Query `event_log` and reproduce every §6.2 metric
8. Revoke consent and confirm clinic access is cut immediately

---

## 8. Still open

1. **§3.1 — the T1–T5 naming collision.** Blocks Phase 1. Proposal: `JA1–JA5` (joint attention),
   `CCS1–CCS5` (communication stage), delete the duplicate CCS vocabulary in `stages.ts`.
2. **§8 item 7 — PDPA / Legal.** Blocks Phase 2. Start it now; it has the longest lead time.
3. **Visual designs.** `TUTUR_Pilot_Maya_Screen_Scripts_v2.md` is copy + logic, **not layout**.
   If Figma frames exist, export them as **PNG** into `docs/design/` — otherwise the visual
   treatment is inferred from [`src/tutur-ds/`](../src/tutur-ds/) and the current components.
4. **Which §2 rows to override** — the "some parts I'll reuse" bits.

## 9. Content team can start now

Nothing above blocks content authoring. The critical path for the pilot is almost certainly
**14 day-configs + assets**, not code. Hand the content team spec §4 and have them start on
`day-01.json` immediately — engineering will validate against it in Phase 1.

Asset budget (per §8 item 8): full 3 modes (skrip + gambar + video) for **D1–D3 only**;
D4–D14 skrip + per-technique video. Missing assets must degrade to `"akan datang"` → skrip,
never a blocked day.
