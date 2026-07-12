import { type DayConfig } from "@/lib/dayConfig"

/**
 * HARI 1 · Masa Bermain Bebas — Kenal Pasti Minat
 *
 * Source: JO 110726 Tutur_14days_Revised_Draft_v2.pdf, H1.
 * The toy {anak} picks today becomes the context for D2–D14 (`records_interest`).
 */
const day01 = {
  "kind": "activity",
  "day_number": 1,
  "week": 1,
  "title": "Masa Bermain Bebas",
  "subtitle": "Kenal Pasti Minat",
  "routine": "main",
  "goal_tag": "G1",
  "emphasis": ["receptif", "ekspresif"],

  "pyramid_thread": ["connection", "joint_attention"],
  "kp_active": ["KP1", "KP2", "KP4", "KP7"],
  "shared_enjoyment": "Senyum besar dan buat muka terkejut bila {anak} pilih!",

  "sub_goal": "Kenal pasti MINAT {anak} sebagai konteks aktiviti 14 hari",
  "skills_today": ["Self Talk", "Parallel Talk", "Withhold & Wait"],
  "focus_skill": "Withhold & Wait",
  "arahan": "Letak 3 pilihan mainan depan {anak}: [A] Anak patung/Barbie · [B] Masak-masak · [C] Lego/Blok. Duduk sama aras. TUNGGU. Perhatikan mana {anak} pilih — itu konteks minggu ini. Jangan cadangkan apa-apa.",
  "focus_line": "Withhold & Wait 5 saat tanpa suggest, biar {anak} pilih sendiri",

  "ccs_prompts": [
    {
      "ccs": "CCS1",
      "technique": "Self Talk + Parallel Talk",
      "line": "\"{panggilan} ambil Barbie. Barbie cantik.\" [naratif, 2–3 kali]"
    },
    {
      "ccs": "CCS2",
      "technique": "Withhold & Wait",
      "line": "\"Nak Barbie?\" [tunggu 5s, hulur tapi tahan]"
    },
    {
      "ccs": "CCS3",
      "technique": "Beri Pilihan",
      "line": "\"Baju MERAH… ke… BIRU?\" [tunjuk dua]"
    },
    {
      "ccs": "CCS4_5",
      "technique": "Expand + Extend",
      "line": "\"Barbie nak pergi mana? {anak} rasa?\""
    }
  ],

  "prep_items": [
    {
      "item_id": "tiga_mainan",
      "name": "3 mainan berbeza (cth: anak patung, masak-masak, Lego)",
      "always_available": false,
      "advance_notice_days": 1,
      "substitutable": true,
      "substitute_script": "Apa-apa 3 mainan berlainan jenis pun boleh — yang penting {anak} boleh buat pilihan sebenar."
    }
  ],

  "learn_content": {
    "video_id": "vid_d1_kenal_minat_v1",
    "storyboard_ids": ["sb_d1_1", "sb_d1_2", "sb_d1_3", "sb_d1_4"],
    "script_mode_note": null
  },

  "activity_phases": [
    {
      "phase": "persediaan",
      "lines": [
        { "text": "{panggilan} letak tiga mainan", "tone_tags": ["santai", "perlahan"], "audio_id": "a_d1_01" },
        { "text": "{panggilan} duduk sini", "tone_tags": ["santai"], "audio_id": "a_d1_02" },
        {
          "text": "{anak}, pilih ye",
          "tone_tags": ["ceria", "jemput"],
          "audio_id": "a_d1_03",
          "timer_seconds": 5,
          "timer_label": "Tunggu… biar {anak} pilih sendiri"
        }
      ]
    },
    {
      "phase": "semasa",
      "lines": [
        { "text": "(Perhatikan mainan yang {anak} pilih — ikut dia)", "tone_tags": ["perhati"] }
      ],
      "interest_lines": {
        "barbie": [
          { "text": "{panggilan} ambil Barbie", "tone_tags": ["naratif"], "audio_id": "a_d1_b1" },
          { "text": "Barbie cantik!", "tone_tags": ["ceria"], "audio_id": "a_d1_b2" },
          { "text": "Barbie jalan, jalan", "tone_tags": ["berirama"], "audio_id": "a_d1_b3" },
          { "text": "Sikat rambut… siap!", "tone_tags": ["santai"], "audio_id": "a_d1_b4" },
          { "text": "Barbie tidur. Shhh", "tone_tags": ["lembut"], "audio_id": "a_d1_b5" }
        ],
        "masak_masak": [
          { "text": "{panggilan} ambil periuk", "tone_tags": ["naratif"], "audio_id": "a_d1_m1" },
          { "text": "Periuk kecik", "tone_tags": ["santai"], "audio_id": "a_d1_m2" },
          { "text": "Kita masak!", "tone_tags": ["ceria"], "audio_id": "a_d1_m3" },
          { "text": "Kacau, kacau", "tone_tags": ["berirama"], "audio_id": "a_d1_m4" },
          { "text": "Nyum, sedap!", "tone_tags": ["lebih-lebih"], "audio_id": "a_d1_m5" }
        ],
        "lego": [
          { "text": "{panggilan} ambil Lego", "tone_tags": ["naratif"], "audio_id": "a_d1_l1" },
          { "text": "Lego merah, besar", "tone_tags": ["santai"], "audio_id": "a_d1_l2" },
          { "text": "Susun… satu, dua", "tone_tags": ["berirama"], "audio_id": "a_d1_l3" },
          { "text": "Tinggi! Tinggi lagi", "tone_tags": ["ceria"], "audio_id": "a_d1_l4" },
          { "text": "Uh oh, jatuh!", "tone_tags": ["terkejut"], "audio_id": "a_d1_l5" }
        ]
      }
    },
    {
      "phase": "selesai",
      "lines": [
        { "text": "Dah habis main", "tone_tags": ["lembut"], "audio_id": "a_d1_s1" },
        { "text": "Letak mainan", "tone_tags": ["santai"], "audio_id": "a_d1_s2" },
        { "text": "Masuk dalam kotak", "tone_tags": ["santai"], "audio_id": "a_d1_s3" },
        { "text": "Bye-bye mainan", "tone_tags": ["lambai"], "audio_id": "a_d1_s4" }
      ]
    }
  ],

  "situational_branches": [
    {
      "trigger": "{anak} pegang mainan",
      "responses": [
        "Barbie: \"{anak} pegang Barbie\"",
        "Masak-masak: \"{anak} ambil sudu\"",
        "Lego: \"{anak} pilih Lego merah\""
      ],
      "note": "Label terus benda yang dia pegang."
    },
    {
      "trigger": "{anak} gerakkan mainan",
      "responses": [
        "Barbie: \"Barbie jalan, jalan!\"",
        "Masak-masak: \"{anak} kacau nasi\"",
        "Lego: \"{anak} susun. Satu, dua, tiga!\""
      ]
    },
    {
      "trigger": "{anak} pandang anda",
      "responses": ["(senyum, tunggu 3 saat)", "\"{panggilan} pun main\"", "\"Best kan!\""]
    },
    {
      "trigger": "Mainan jatuh",
      "responses": ["\"Oh! Jatuh!\"", "\"Lego jatuh semua\""]
    }
  ],

  "child_signals": [
    {
      "category": "KP1",
      "label": "Pandangan Mata (KP1) · Masa Bermain",
      "signals": [
        "{anak} pandang muka anda sebelum/selepas capai mainan = social gaze",
        "{anak} senyum bila anda senyum = social referencing",
        "{anak} cari muka anda bila mainan jatuh = rujukan sosial"
      ]
    },
    {
      "category": "KP2",
      "label": "Joint Attention (KP2) · Kenal Pasti Minat",
      "signals": [
        "{anak} pandang mainan + pandang anda = berkongsi minat (proto-declarative awal)",
        "{anak} ikut pandangan anda ke mainan = following gaze"
      ]
    },
    {
      "category": "KP4",
      "label": "Meniru (KP4) · Tiru Aksi Main",
      "signals": [],
      "ccs_signals": {
        "CCS1": "{anak} tiru cara anda pegang mainan",
        "CCS2": "{anak} tiru bunyi anda buat (brmm, nyum)",
        "CCS3": "{anak} tiru cara main (kacau, susun, hulur)"
      }
    },
    {
      "category": "KP7",
      "label": "Bermain (KP7) · Kualiti Main",
      "signals": [
        "{anak} kekal main satu mainan >30 saat = sustained attention",
        "{anak} buat aksi berulang = functional play",
        "{anak} guna objek cara yang betul = symbolic emerging"
      ]
    },
    {
      "category": "NIAT_KOMUNIKASI",
      "label": "Niat Komunikasi",
      "signals": [
        "{anak} hulur mainan kepada anda = proto-imperative",
        "{anak} tunjuk + pandang anda = berkongsi minat (proto-declarative) [CATAT]"
      ]
    }
  ],

  "ja_descriptors": {
    "JA1": "{anak} duduk dekat anda semasa pilih mainan",
    "JA2": "{anak} pandang muka anda sekali-sekala semasa main",
    "JA3": "{anak} perasan bila anda pegang / sentuh mainan",
    "JA4": "{anak} ikut pandangan anda ke mainan lain",
    "JA5": "{anak} hulur mainan kepada anda / pandang + senyum untuk ajak main bersama"
  },

  "tpd": {
    "tunggu": "Mainan mana {anak} pandang PERTAMA — itu minat sebenar",
    "perhati": "{anak} pandang anda berapa kali dalam 10 minit?",
    "dengar": "Kira 5 saat. {anak} lead, anda ikut."
  },

  "records_interest": true,

  "observation_questions": [
    {
      "question_id": "d1_g1",
      "role": "parent_indicator",
      "text": "Dan anda — berjaya tunggu 5 saat TANPA mencadangkan mainan?",
      "scale": "bmk"
    },
    {
      "question_id": "d1_kp1",
      "role": "child_observation",
      "category": "KP1",
      "text": "{anak} pandang muka anda semasa main? (sekurang-kurangnya 3 kali)",
      "scale": "bmk"
    },
    {
      "question_id": "d1_kp2",
      "role": "child_observation",
      "category": "KP2",
      "text": "{anak} pandang mainan, KEMUDIAN pandang anda — macam nak kongsi?",
      "scale": "bmk",
      "milestone_on_positive": "proto_declarative_awal"
    },
    {
      "question_id": "d1_kp4",
      "role": "child_observation",
      "category": "KP4",
      "text": "{anak} tiru bunyi atau aksi anda dalam main? (cth: \"nyum\", kacau periuk)",
      "scale": "bmk"
    },
    {
      "question_id": "d1_kp7",
      "role": "child_observation",
      "category": "KP7",
      "text": "{anak} kekal dengan SATU mainan lebih 30 saat?",
      "scale": "bmk"
    },
    {
      "question_id": "d1_niat",
      "role": "child_observation",
      "category": "NIAT_KOMUNIKASI",
      "text": "{anak} hulur mainan kepada anda?",
      "scale": "bmk",
      "milestone_on_positive": "proto_imperative"
    }
  ],

  "counts": [],

  "milestones": [
    { "milestone_id": "proto_declarative_awal", "label": "Kongsi minat pertama (pandang mainan → pandang anda)" },
    { "milestone_id": "proto_imperative", "label": "Hulur mainan pertama (minta)" }
  ],

  "aac": {
    "suitability": "tidak",
    "note": "Fokus minat — perhatikan, bukan mengajar simbol."
  },

  "tomorrow_preview": "Esok: kita guna mainan yang {anak} pilih — {anak} yang pilih, jadi dia akan lebih fokus."
} satisfies DayConfig

export default day01
