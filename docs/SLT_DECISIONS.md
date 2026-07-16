# Tutur · Questions for the SLT team

**Date:** July 2026
**For:** Tutur's two Speech-Language Therapists
**From:** Product / engineering
**Needed by:** before the 14-day pilot build is finalised

---

## Why we're asking

We built Modul 1 (Fasa Asas) exactly as the tracker document specifies: the daily
script, then the full tracker — the G1 parent indicator, five KP rows, CCS, Joint
Attention, new words, and routine adherence.

Parent feedback on the build is consistent and blunt: **it feels clinical, and it
feels like a daily test of their child.**

That matters more than it sounds, because of something the document itself says:

> *"Perubahan ibu bapa = leading indicator. Kemajuan anak = lagging indicator
> (mungkin nampak H7–H14)."*

If the child's change doesn't surface until Day 7–14, then **the first week is
pure faith.** A parent who abandons the app on Day 4 never reaches the point where
it works. Retention in the first fortnight is not a business concern competing with
the clinical goal — **it is a precondition for the clinical goal.** A tracker nobody
completes produces no data at all.

So we want to reduce the daily tracker, and we need your judgment on how.

---

## What a parent currently does, every day

**29 screens.** Two briefing screens, twelve script cards, a toy choice, **ten
tracker questions**, three reflection screens, one closing screen.

Of those, she *receives* 12 screens and *gives* 14. And on Day 1, an honest parent
answering the five KP rows will most likely tick **"Belum" five times in a row.**

That is the first impression the product makes. We think it is the wrong one, and
we don't think it is what you intended when you designed a worksheet for a
clinician to fill in at a desk.

---

## What we propose (and want you to challenge)

Cut the **daily** tracker from ten questions to **three**. Roughly 30 seconds.

### Q1 — The parent's technique (the day's G1 focus)

> *"Anda tunggu 5 saat tanpa cadang?"* → Belum / Kadang / Selalu

**Why:** it is the leading indicator, by your own document. It is also the only
variable we can coach — and it is what makes everything else interpretable. A "no"
on the child when the parent never actually waited five seconds is not a finding
about the child; it is a fidelity failure, and without Q1 we cannot tell those
apart.

### Q2 — One child behaviour: looks to the parent's face

> *"Berapa kali {anak} pandang muka anda semasa main?"* → 0 · 1–2 · 3 atau lebih

**Why we chose this one and not another:**

- It is the operational core of Joint Attention — which your document says is
  present *every* day: *"nadi komunikasi, tanpa JA semua kemahiran lain tidak
  bermakna."*
- It is a **count, not a grade.** "Three times" and "Belum" carry the same
  information and land completely differently on a parent. A count can go up.
- It gives us a **trajectory we can show back to her** — *"Hari 1: 0 kali. Hari
  ini: 3 kali."* We believe that single sentence is what keeps a family engaged
  through the flat first week.
- It **fires your own safety net.** Your referral rule is *"jika selepas 14 hari
  masih tiada pandangan mata → dapatkan penilaian SLT segera."* Fourteen days of
  "0 kali" is a hard, dated, defensible trigger. None of the other nine questions
  can do that.

### Q3 — Anything new, or one moment

> *"Ada apa-apa yang BARU hari ini — bunyi, isyarat, kata? Atau satu momen
> bermakna?"* → free text or a short voice note

**Why:** this is where the clinical detail actually lives. A parent writing *"hari
ini dia hulur Barbie kat saya"* has recorded a proto-imperative without anyone
having to ask a KP question. It also folds two of the current ten into one screen,
and it is the only question that gives her something back instead of taking.

---

## What we would STOP asking daily, and why

| Dropped from the daily tracker | Reason |
|---|---|
| **Rutin berjalan** (Penuh / Separuh / Tidak sempat) | We already record this automatically — the app knows whether the activity ran and for how long. Asking is pure burden for data we hold. |
| **The other four KP rows** | Per-KP daily grading is what produces the "report card" feeling. We believe Q2 + Q3 capture the same emergence, with a fraction of the cost. |
| **CCS, daily** | CCS is a *staging* instrument. A child's stage does not change between Tuesday and Wednesday. Asking daily produces fourteen identical answers and a parent who feels examined. |
| **JA ladder, daily** | Q2 tracks the operational core of JA every day. The full five-rung ladder becomes a checkpoint, not an exam. |

---

## The decisions we need from you

### 1. Is "looks to your face" the right single daily child variable?

If you would rather we tracked **vocalisation** or **gesture** as the one daily
child measure, tell us — it is a clinical call and it changes what we build.

Our reasoning: gaze/check-in is the earliest-moving pre-verbal behaviour, it is
present in every day's activity regardless of routine, and it is the behaviour your
own red-flag list keys on. But you may disagree.

---

### 2. When should CCS be measured?

**Our proposal: Day 1 and Day 14 only. Not Day 7.**

Here is our concern about Day 7, and we would like you to tell us if it is wrong.

Your document says the child's change is a lagging indicator and *"mungkin nampak
H7–H14."* So at Day 7 we are, by your own model, **expecting no change yet.** If we
ask a parent to re-stage her child at Day 7, the most likely result is a reading
identical to Day 1 — which tells her, in a formal-looking screen, that a week of
daily effort produced nothing.

We think that is the single most likely moment for a family to quit, and we would
be building it ourselves.

**Instead we would use Day 7 to show the trajectory, not take a new measurement:**

> *"Minggu ini: anda tunggu 5 saat pada 5 daripada 6 hari. Adam pandang muka anda
> 11 kali — Hari 1, sekali sahaja."*

If you want a re-measure at the mid-point, we would suggest the **JA ladder** (it
moves faster and finer than CCS), framed as *"lihat berapa jauh dia dah sampai."*

**Do you accept CCS at Day 1 + Day 14 only, with JA at Day 7?**

---

### 3. ⚠ There is no baseline CCS anywhere in the product. What should establish it?

This is a gap we found and cannot close without you.

Onboarding asks the five screening questions and **never establishes a CCS.** Two
things break as a result:

- **We cannot claim any change at Day 14**, because we never measured Day 0.
- **Every day's script has four CCS prompt tiers** (CCS1, CCS2, CCS3, CCS4–5) — and
  because we don't know the child's stage, we currently show a parent *all four* and
  let her guess which to use. The entire `ccs_prompts` ladder assumes we know the
  CCS. We don't.

**Questions:**

- Should CCS be established during **onboarding** (before Day 1), or **on Day 1
  after the first activity** (when the parent has just watched her child play and
  has something to answer from)?
- Can it be derived from the screening answers we already collect, or must it be
  asked directly?
- **How would you word it for a parent?** Our current draft avoids the codes
  entirely and frames it as a service to her rather than an assessment of him:

  > *"Supaya Maya boleh pilih ayat yang betul untuk Adam —
  >  · Dia belum beri isyarat; saya yang bercerita
  >  · Dia mula beri isyarat bila saya tunggu
  >  · Dia boleh pilih antara dua
  >  · Dia mula guna kata / gabung idea
  >  · Dia pimpin perbualan"*

  Is that clinically sound as a CCS1–CCS5 self-report? If not, please rewrite it.

---

### 4. Does dropping per-KP daily grading cost you anything you need at Day 14?

Day 14 routes the family: continue to Modul 2, repeat H8–H10, focus H11–H12, or
seek a formal SLT assessment. Your document defines that routing in terms of G1 /
G2 / G3 and KP1+KP2.

**If that routing decision needs KP-level daily data, we need to know now** — because
the whole 14 days feeds it, and a three-question tracker cannot reconstruct it after
the fact.

Our reading is that the Day-14 checklist can be answered *at* Day 14 (it is a
review, not a sum of daily rows), plus Q2's trajectory and Q3's captured milestones.
Please confirm or correct.

---

## Smaller items also waiting on you

These are already flagged in the code and are blocking sign-off:

1. **`KADANG_IS_FLAG`.** In screening, does an answer of **"Kadang-kadang"** count
   as a red flag? We currently default to **no** (only "Jarang / Tidak pernah"
   flags). This changes which families get the SLT recommendation.

2. **The skill explanations.** The day configs *name* the techniques — Self Talk,
   Parallel Talk, Withhold & Wait, Tunggu (Auditory Closure), Beri Pilihan, Fikiran
   Yang Sama, Ambil Giliran, Recasting, Follow the Child — but nothing anywhere
   *defines* them. A parent tapping "Withhold & Wait" needs a sentence telling her
   what it means and one thing to do tonight. **We drafted three of them. They are
   our words, not yours, and a parent will read them as instruction.** Please write
   (or approve) all nine.

3. **The tone words.** The scripts carry tone tags — *Bercerita, Berlagu, Santai,
   Perlahan, Lembut, Melebih-lebih, Terkejut, Ceria, Mengajak*. Only "naratif" came
   from your document; **we invented the rest.** Please approve or replace.

4. **Days 8–13 have no "Kemahiran hari ini."** From Day 8 the document switches to
   *"Fokus ibu bapa"* and stops listing the day's techniques. The app shows a
   parent her three skills each day, and for six of the fourteen days we have
   nothing to show. What should appear?

5. **The FAQ answers.** We wrote ten draft answers for Maya's Smart F&Q — including
   *"Kenapa saya perlu tunggu 5 saat?"*, *"Bila saya patut jumpa SLT?"* and
   *"Saya rasa saya gagal sebagai ibu bapa."* **These are our words.** A frightened
   parent will read them as clinical advice. Please review before pilot.

---

## The trade we are asking you to accept

We lose per-KP resolution. We will not be able to say *"KP4 imitation emerged on
Day 6."*

We think that is worth it, because **a ten-question tracker at 40% completion is
worth less than a three-question tracker at 90%** — and right now we have evidence
for neither number. Fidelity (Q1), plus the most predictive child variable as a
trajectory (Q2), plus qualitative milestone capture (Q3), plus adherence and time
recorded automatically, is a legitimate pilot instrument.

Fourteen abandoned trackers are not.

**If you disagree, we will build the full ten.** But we would rather know now, from
you, than discover it in the drop-off data.
