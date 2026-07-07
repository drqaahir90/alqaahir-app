# QCAP · Bulk Import Formats

Reference for content authors and administrators using the
**Admin → Bulk Import** tool.

> ⚠️ **Backward compatibility guarantee.** These formats are frozen. Fields
> may be *added* to the schema in future releases, but existing fields will
> not be renamed or removed. Files exported today will import cleanly for
> the foreseeable future.

---

## Table of contents

1. [How bulk import works](#how-bulk-import-works)
2. [JSON — universal format](#json--universal-format)
3. [MCQs — JSON](#mcqs--json)
4. [MCQs — CSV](#mcqs--csv)
5. [Case Studies — JSON](#case-studies--json)
6. [OPD Cases — JSON](#opd-cases--json)
7. [Health Education Articles — JSON](#health-education-articles--json)
8. [Validation rules](#validation-rules)
9. [Idempotency & duplicates](#idempotency--duplicates)
10. [Rollback](#rollback)

---

## How bulk import works

1. Open **`/admin/import`**.
2. Choose the **content type** (MCQs / Case Studies / OPD Cases / Articles).
3. Click **Template** to insert a starter payload, then edit inline; OR
4. Upload a `.json`, `.csv`, or `.txt` file.
5. Click **Validate** — you'll see three counters:
   - **Ready** ✅ — records that will be imported
   - **Duplicates** 🟡 — IDs that already exist (silently skipped)
   - **Errors** 🔴 — validation failures listed with row numbers
6. Click **Commit import** to write the valid records to Firestore.
7. Immediately after commit, a **Rollback** button appears — one click
   reverses the entire batch.

Every import produces an entry in the **Audit Log**
(`action: "import.<collectionName>"` with `meta.count`).

---

## JSON — universal format

**All four content types** accept JSON. The file must be either:

- A **single object** (imports one record), OR
- An **array of objects** (imports multiple records)

Each object must contain a unique `id` string. If your file omits `id`,
the parser generates one automatically.

```json
[
  { "id": "mcq_1", /* … */ },
  { "id": "mcq_2", /* … */ }
]
```

Localized text is always the three-language object:

```json
{ "en": "English text", "ar": "النص العربي", "so": "Qoraalka Soomaali" }
```

Missing AR/SO fall back to EN at display time. **Never leave EN blank.**

---

## MCQs — JSON

```json
[
  {
    "id": "mcq_2025_cardio_001",
    "question": {
      "en": "A 55-year-old man presents with crushing chest pain radiating to the left arm for 30 minutes. ECG shows ST elevation in II, III, aVF. What is the most likely diagnosis?",
      "ar": "رجل عمره 55 عاماً يعاني من ألم صدري ضاغط ينتشر للذراع اليسرى منذ 30 دقيقة…",
      "so": "Nin 55 jir ah oo qaba xanuun laabta ah oo gaadhaya gacanta bidix 30 daqiiqo…"
    },
    "options": [
      { "id": "a", "text": { "en": "Anterior STEMI",  "ar": "احتشاء أمامي",  "so": "Anterior STEMI" } },
      { "id": "b", "text": { "en": "Inferior STEMI",  "ar": "احتشاء سفلي",   "so": "Inferior STEMI" } },
      { "id": "c", "text": { "en": "Pericarditis",    "ar": "التهاب التامور", "so": "Pericarditis" } },
      { "id": "d", "text": { "en": "Pulmonary embolism", "ar": "انصمام رئوي", "so": "Pulmonary embolism" } }
    ],
    "correctOptionId": "b",
    "explanation": {
      "en": "ST elevation in II, III, aVF is characteristic of an inferior STEMI, typically involving the RCA.",
      "ar": "ارتفاع ST في II و III و aVF علامة مميزة لاحتشاء عضلة القلب السفلي، وغالباً ما يتضمن الشريان التاجي الأيمن.",
      "so": "ST kor u kaca II, III, aVF waa calaamad muhiim ah oo Inferior STEMI, oo caadi ahaan la xiriirta RCA."
    },
    "difficulty": "medium",
    "subjectId": "cardio",
    "timerSeconds": 60,
    "reference": "Braunwald's Heart Disease, 12th edition",
    "tags": ["ecg", "acs"],
    "imageUrl": "https://cdn.example.com/mcq/inferior-stemi.png",
    "createdAt": 1730000000000
  }
]
```

### Required fields
`id`, `question`, `options[]` (≥ 2), `correctOptionId`, `explanation`,
`difficulty`, `subjectId`.

### Optional fields
`tags[]`, `reference`, `imageUrl`, `timerSeconds` (default 45),
`createdAt` (defaults to now), `createdBy`.

---

## MCQs — CSV

CSV is supported **only for MCQs** — Case Studies, OPD Cases, and Articles
must use JSON because of their nested structure.

### Header row (exact spelling)

```
id,questionEn,questionAr,questionSo,optA,optB,optC,optD,correctOptionId,explanationEn,explanationAr,explanationSo,difficulty,subjectId
```

### Example

```csv
id,questionEn,questionAr,questionSo,optA,optB,optC,optD,correctOptionId,explanationEn,explanationAr,explanationSo,difficulty,subjectId
mcq_1,"A 55-year-old man presents with…","رجل عمره 55 عاماً…","Nin 55 jir ah…","Anterior STEMI","Inferior STEMI","Pericarditis","Pulmonary embolism",b,"ST elevation in II, III, aVF…","ارتفاع ST في II و III و aVF…","ST kor u kaca II, III, aVF…",medium,cardio
mcq_2,"First-line treatment for CAP…","العلاج المفضل…","Daaweynta koowaad…","Amoxicillin","Vancomycin","Ceftriaxone","Meropenem",a,"IDSA recommends amoxicillin…","توصي IDSA…","IDSA waxay ku talisay…",easy,resp
```

### CSV rules

- **Quote every field** with double quotes `"…"`.
- **Escape** an internal double quote by doubling it: `""`.
- **Options a/b/c/d** are always four columns; leave any of them empty to
  create a 2- or 3-choice question, but ensure `correctOptionId` still points
  to a filled option.
- `correctOptionId` must be lowercase (`a`, `b`, `c`, or `d`).
- `difficulty` must be `easy`, `medium`, or `hard`.
- `subjectId` must match an existing subject (see the **Specialties** list in
  `src/data/seed.ts` — e.g. `cardio`, `resp`, `neuro`, `gastro`, `endo`, `peds`,
  `id`, `surg`, `em`, `im`, `nephro`, `ortho`, `neurosurg`, `urology`, `ent`,
  `ophth`, `derm`, `psych`, `obgyn`, `midwife`, `nursing`, `icu`, `anesth`,
  `radio`, `pharm`, `family`, `commh`, `onco`, `hema`, `rheum`).

### CSV limitations

- No support for multi-line questions or explanations — use JSON for those.
- No support for images (`imageUrl`) — use JSON.
- Arabic/Somali columns fall back to English if omitted.

---

## Case Studies — JSON

Multi-step clinical scenarios with per-step MCQ checkpoints.

```json
[
  {
    "id": "case_2025_cardio_stemi",

    "title": {
      "en": "Chest pain in a 62-year-old smoker",
      "ar": "ألم صدري في مدخن 62 عاماً",
      "so": "Xanuun laabta oo qaba nin 62 jir ah oo sigaar cabba"
    },
    "summary": {
      "en": "Progressive dyspnea and diaphoresis in a hypertensive smoker — work through the clinical reasoning.",
      "ar": "ضيق تنفس متقدم وتعرق في مدخن مصاب بضغط الدم — راجع التفكير السريري.",
      "so": "Neef ku yaraan iyo dhidid bukaan cadaadiska dhiigga qaba — u soco fikirka caafimaad."
    },

    "patient": {
      "age": 62,
      "sex": "M",
      "presenting": {
        "en": "Retrosternal chest pain radiating to the left arm for 40 minutes with sweating.",
        "ar": "ألم خلف عظمة الصدر ينتشر للذراع اليسرى منذ 40 دقيقة مع تعرق.",
        "so": "Xanuun laab hoosaadka ah gaadhaya gacanta bidix 40 daqiiqo iyo dhidid."
      }
    },

    "steps": [
      {
        "id": "s1",
        "title": { "en": "Initial assessment", "ar": "التقييم الأولي", "so": "Qiimeyn koowaad" },
        "content": {
          "en": "BP 150/95, HR 102, SpO2 96%.",
          "ar": "الضغط 150/95، النبض 102، الأكسجين 96%.",
          "so": "BP 150/95, HR 102, SpO2 96%."
        },
        "question": {
          "en": "Choose the best next step.",
          "ar": "اختر الخطوة التالية.",
          "so": "Dooro tallaabada xigta."
        },
        "options": [
          { "id": "a", "text": { "en": "12-lead ECG",     "ar": "تخطيط قلب 12 مسار", "so": "12-lead ECG" } },
          { "id": "b", "text": { "en": "Chest X-ray",     "ar": "أشعة صدر",           "so": "Raajada laabta" } },
          { "id": "c", "text": { "en": "D-dimer",         "ar": "دي-دايمر",           "so": "D-dimer" } },
          { "id": "d", "text": { "en": "Echocardiogram",  "ar": "إيكو للقلب",         "so": "Echo wadnaha" } }
        ],
        "correctOptionId": "a",
        "explanation": {
          "en": "In acute chest pain, a 12-lead ECG must be obtained within 10 minutes.",
          "ar": "في ألم الصدر الحاد يجب إجراء تخطيط قلب 12 مساراً خلال 10 دقائق.",
          "so": "Xanuunka laabta degdegga ah, ECG 12-lead waa in la sameeyo 10 daqiiqo gudahood."
        }
      }
    ],

    "references": ["ESC Guidelines for STEMI 2023"],
    "subjectId": "cardio",
    "difficulty": "medium",
    "imageUrl": "https://cdn.example.com/cases/stemi-cover.jpg",
    "createdAt": 1730000000000
  }
]
```

### Required fields
`id`, `title`, `patient` (with `age`, `sex`, `presenting`), `steps[]`,
`subjectId`, `difficulty`.

### Optional fields
`summary`, `references[]`, `imageUrl`, `createdAt`.

### Step fields
Every step needs `id`, `title`, `content`. If the step is a **checkpoint**,
also provide `question`, `options[]` (≥ 2), `correctOptionId`, `explanation`.
Steps without a `question` are pure content pages (no scoring).

### Golden rule
The **title** describes the presentation, never the diagnosis:
- ❌ `"Acute STEMI"`
- ✔️ `"Chest pain in a 62-year-old smoker"`

---

## OPD Cases — JSON

Full clinical encounters. **Only the core fields are required** — everything
else is optional but recommended for realism.

```json
[
  {
    "id": "opd_2025_resp_cap",
    "title": {
      "en": "Young adult with cough and fever",
      "ar": "شاب مصاب بسعال وحمى",
      "so": "Qof da'yar oo qufac iyo qandho qaba"
    },

    "chiefComplaint": { "en": "Cough and fever for 5 days", "ar": "…", "so": "…" },
    "history":        { "en": "Productive cough, yellow sputum, fever 39°C…", "ar": "…", "so": "…" },
    "vitals":         { "hr": 108, "bp": "118/72", "rr": 22, "temp": 38.9, "spo2": 94 },
    "examFindings":   { "en": "Crackles at right base, dullness to percussion.", "ar": "…", "so": "…" },

    "correctDiagnosis":  { "en": "Community-acquired pneumonia (right lower lobe)", "ar": "…", "so": "…" },
    "correctManagement": { "en": "Amoxicillin PO 1g TDS × 5 days; supportive care.", "ar": "…", "so": "…" },
    "differentials": [
      { "en": "Acute bronchitis",  "ar": "…", "so": "…" },
      { "en": "Pulmonary TB",      "ar": "…", "so": "…" }
    ],

    "subjectId": "resp",
    "difficulty": "easy",
    "createdAt": 1730000000000,

    "diagnosisOptions": [
      { "id": "a", "text": { "en": "Acute bronchitis",              "ar": "…", "so": "…" } },
      { "id": "b", "text": { "en": "Community-acquired pneumonia",  "ar": "…", "so": "…" } },
      { "id": "c", "text": { "en": "Pulmonary tuberculosis",         "ar": "…", "so": "…" } },
      { "id": "d", "text": { "en": "Pulmonary embolism",             "ar": "…", "so": "…" } }
    ],
    "diagnosisCorrectId": "b",
    "managementOptions": [
      { "id": "a", "text": { "en": "Oral amoxicillin + supportive care", "ar": "…", "so": "…" } },
      { "id": "b", "text": { "en": "Bronchodilators only",                "ar": "…", "so": "…" } },
      { "id": "c", "text": { "en": "IV vancomycin empirically",           "ar": "…", "so": "…" } },
      { "id": "d", "text": { "en": "Anti-TB quadruple therapy",           "ar": "…", "so": "…" } }
    ],
    "managementCorrectId": "a",
    "explanation": { "en": "…", "ar": "…", "so": "…" },

    "patientProfile": { "age": 28, "sex": "M", "occupation": { "en": "Teacher", "ar": "مدرس", "so": "Macallim" } },
    "historyPresentIllness": { "en": "5-day history…", "ar": "…", "so": "…" },
    "pastMedical":  { "en": "None significant.", "ar": "…", "so": "…" },
    "pastSurgical": { "en": "None.", "ar": "…", "so": "…" },
    "medications":  { "en": "Paracetamol as needed.", "ar": "…", "so": "…" },
    "allergies":    { "en": "NKDA.", "ar": "…", "so": "…" },
    "familyHistory":{ "en": "Father has hypertension.", "ar": "…", "so": "…" },
    "socialHistory":{ "en": "Non-smoker.", "ar": "…", "so": "…" },
    "riskFactors":  { "en": "Recent close contact with URTI.", "ar": "…", "so": "…" },
    "reviewOfSystems": { "en": "Fatigue, mild dyspnea on exertion.", "ar": "…", "so": "…" },
    "generalExam":  { "en": "Alert, mildly ill-looking.", "ar": "…", "so": "…" },
    "systemicExam": { "en": "Chest: bronchial breathing right base.", "ar": "…", "so": "…" },
    "positiveFindings": { "en": "Fever, tachypnea, hypoxia (SpO2 94%).", "ar": "…", "so": "…" },
    "negativeFindings": { "en": "No hemoptysis, no purulent nasal discharge.", "ar": "…", "so": "…" },

    "labs": [
      { "name": "WBC",          "value": "14.2", "unit": "×10⁹/L", "ref": "4–11",  "flag": "high" },
      { "name": "Neutrophils",  "value": "82",   "unit": "%",       "ref": "40–70", "flag": "high" },
      { "name": "CRP",          "value": "128",  "unit": "mg/L",    "ref": "<5",    "flag": "critical" }
    ],

    "imaging": [
      { "type": "xray", "url": "https://cdn.example.com/opd/cxr.png",
        "title":   { "en": "Chest X-ray", "ar": "…", "so": "…" },
        "caption": { "en": "Right lower lobe consolidation.", "ar": "…", "so": "…" } }
    ],
    "ecg": { "type": "ecg", "url": "https://cdn.example.com/opd/ecg.png",
             "caption": { "en": "Sinus tachycardia.", "ar": "…", "so": "…" } },
    "clinicalImages": [
      { "type": "clinical", "url": "https://cdn.example.com/opd/clinical.jpg" }
    ],

    "learningPoints": [
      { "en": "CURB-65 score guides admission in CAP.", "ar": "…", "so": "…" },
      { "en": "Consider atypical coverage if legionella suspected.", "ar": "…", "so": "…" }
    ],
    "followUp": { "en": "GP review in 3 days; CXR in 6 weeks.", "ar": "…", "so": "…" },
    "references": ["IDSA/ATS CAP Guidelines 2019"]
  }
]
```

### Required fields
`id`, `chiefComplaint`, `history`, `vitals`, `examFindings`,
`correctDiagnosis`, `correctManagement`, `differentials[]`, `subjectId`,
`difficulty`.

### Vital-signs colour coding (automatic)

| Vital | 🟢 Normal | 🟡 Mild | 🟠 Moderate | 🔴 Critical |
|-------|-----------|--------|-------------|-------------|
| HR    | 60–100    | 50–59 / 101–120 | 40–49 / 121–140 | < 40 / > 140 |
| RR    | 12–20     | 21–24  | 25–30 | < 8 / > 30 |
| Temp  | < 37.5    | 37.5–38.4 | 38.5–39.4 | ≥ 39.5 / < 35 |
| SpO₂  | ≥ 95      | 93–94  | 90–92 | < 90 |
| BP (sys) | 100–139 | 140–159 | 90–99 / 160–179 | < 90 / ≥ 180 |

The simulator computes these automatically from `vitals` — do not set colors
manually.

### Explicit MCQ options vs. auto-generation

If you supply `diagnosisOptions[]` + `diagnosisCorrectId` and
`managementOptions[]` + `managementCorrectId`, they are used verbatim.

Otherwise, the OPD simulator auto-generates 4-choice MCQs by combining
`correctDiagnosis` / `correctManagement` with distractors drawn from
`differentials[]` and other cases in the same specialty.

---

## Health Education Articles — JSON

```json
[
  {
    "id": "art_2025_cardio_chest_pain",
    "title": { "en": "Approach to Chest Pain", "ar": "…", "so": "…" },
    "summary": { "en": "Structured ABCDE approach…", "ar": "…", "so": "…" },
    "body": {
      "en": "Chest pain is one of the most common presentations in emergency medicine…",
      "ar": "…",
      "so": "…"
    },
    "category": "cardio",
    "tags": ["chest pain", "emergency", "ACS"],
    "references": ["ESC ACS Guidelines"],
    "imageUrl": "https://cdn.example.com/articles/chest-pain.jpg",
    "status": "published",
    "featured": true,
    "author": "Dr. Qaahir",
    "createdAt": 1730000000000,
    "updatedAt": 1730000000000
  }
]
```

### Required fields
`id`, `title`, `body`, `category`.

### Optional fields
`summary`, `tags[]`, `references[]`, `imageUrl`, `status`
(`draft` / `published` / `archived` — defaults to `published` if omitted),
`featured` (boolean, shown in the ⭐ Featured strip), `author`,
`updatedAt`.

Only articles with `status: "published"` (or no status) appear on the public
`/education` page.

---

## Validation rules

The validator checks every record against the following rules **before**
allowing commit:

| Type | Rule |
|------|------|
| All  | `id` must be a non-empty string |
| MCQ  | `question.en` present; `options[]` ≥ 2; `correctOptionId` set; `subjectId` set |
| Case | `title.en` present; `steps[]` is an array |
| OPD  | `chiefComplaint.en` present; `vitals` object present |
| Article | `title.en` and `body.en` present |

Failed records are listed with their row number. Fix and re-validate.

---

## Idempotency & duplicates

- The validator checks each record's `id` against **existing** Firestore
  documents.
- Duplicates are **silently skipped** (never overwrite) — safe to re-run
  the same import file multiple times.
- To **replace** an existing record, first delete it from the individual
  Manager (MCQ Manager, Case Manager, etc.), then re-import.

---

## Rollback

Immediately after a successful **Commit import**, a **Rollback** button
appears showing the count of records to remove. Clicking it deletes every
record from the last committed batch. Rollback is available until you
navigate away from the Bulk Import page.

If you leave the page and later need to revert, use the individual Manager
to delete records by their `id`.

---

## Recommended workflow

1. Start with a **small validation batch** (3–5 records) to confirm formatting.
2. Once validated, upload the full file.
3. Confirm with **Preview** — you'll see the first 3 records rendered as
   pretty-printed JSON.
4. **Commit import**.
5. Verify visibility on the user-facing page (`/mcq`, `/cases`, `/opd`, `/education`).
6. Announce new content via **Notification Manager → Broadcast**.

---

## Contact

For questions about import formats, contact **Dr. Qaahir** —
`dr.qaahir90@gmail.com`.
