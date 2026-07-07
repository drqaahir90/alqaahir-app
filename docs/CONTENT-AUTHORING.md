# QCAP · Content Authoring Guide

Practical guidance for writing MCQs, case studies, OPD encounters, and
health-education articles inside QCAP.

---

## Golden rules

1. **Never reveal the diagnosis in the title.** Cases and OPD scenarios use
   *neutral clinical titles* — e.g. **"Chest pain in a 62-year-old smoker"**,
   NOT **"Acute STEMI"**.
2. **Every option's text is required in all three languages.** English text
   is used as fallback if AR or SO is empty, but the app will look
   unprofessional — always translate professionally.
3. **Use professional medical terminology**, not literal machine translations.
   Ask a bilingual clinician to review AR/SO strings.
4. **Cite references.** All quiz explanations should link to a guideline,
   textbook, or peer-reviewed source in the `reference` / `references[]` field.

---

## MCQ authoring template

```json
{
  "id": "mcq_2025_cardio_001",
  "question": {
    "en": "A 55-year-old man presents with crushing chest pain radiating to the left arm for 30 minutes. ECG shows ST elevation in II, III, aVF. What is the most likely diagnosis?",
    "ar": "رجل عمره 55 عاماً يعاني من ألم صدري ضاغط ينتشر للذراع اليسرى منذ 30 دقيقة. يُظهر تخطيط القلب ارتفاعاً في ST في II، III، aVF. ما التشخيص الأرجح؟",
    "so": "Nin 55 jir ah oo qaba xanuun laabta ah oo gaadhaya gacanta bidix 30 daqiiqo. ECG waxa uu muujiyaa ST kor u kaca II, III, aVF. Waa maxay ogaanshaha ugu badan?"
  },
  "options": [
    { "id": "a", "text": { "en": "Anterior STEMI",  "ar": "احتشاء أمامي", "so": "Anterior STEMI" } },
    { "id": "b", "text": { "en": "Inferior STEMI",  "ar": "احتشاء سفلي",  "so": "Inferior STEMI" } },
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
  "createdAt": 0
}
```

### CSV import format

```csv
id,questionEn,questionAr,questionSo,optA,optB,optC,optD,correctOptionId,explanationEn,explanationAr,explanationSo,difficulty,subjectId
mcq_1,"A 55-year-old man…","رجل 55…","Nin 55 jir…","Anterior STEMI","Inferior STEMI","Pericarditis","Pulmonary embolism",b,"ST elevation…","ارتفاع ST…","ST kor u kaca…",medium,cardio
```

Notes:
- CSV import supports **only MCQs** — case studies and OPD cases must use JSON
- Quote fields containing commas or newlines with `"…"` (double up quotes: `""`)
- Missing AR/SO options fall back to the EN text

---

## Case Study authoring template

Multi-step cases with per-step MCQ checkpoints:

```json
{
  "id": "case_2025_cardio_stemi",
  "title": {
    "en": "Chest pain in a 62-year-old smoker",
    "ar": "ألم صدري في مدخن 62 عاماً",
    "so": "Xanuun laabta oo qaba nin 62 jir ah"
  },
  "summary": {
    "en": "Progressive dyspnea and diaphoresis in a hypertensive smoker — work through the clinical reasoning.",
    "ar": "…",
    "so": "…"
  },
  "patient": {
    "age": 62,
    "sex": "M",
    "presenting": {
      "en": "Retrosternal chest pain radiating to the left arm for 40 minutes with sweating.",
      "ar": "…", "so": "…"
    }
  },
  "steps": [
    {
      "id": "s1",
      "title": { "en": "Initial assessment", "ar": "…", "so": "…" },
      "content": { "en": "BP 150/95, HR 102, SpO₂ 96%.", "ar": "…", "so": "…" },
      "question": { "en": "Best next investigation?", "ar": "…", "so": "…" },
      "options": [
        { "id": "a", "text": { "en": "12-lead ECG", "ar": "…", "so": "…" } },
        { "id": "b", "text": { "en": "Chest X-ray", "ar": "…", "so": "…" } },
        { "id": "c", "text": { "en": "D-dimer",     "ar": "…", "so": "…" } },
        { "id": "d", "text": { "en": "Echocardiogram", "ar": "…", "so": "…" } }
      ],
      "correctOptionId": "a",
      "explanation": { "en": "A 12-lead ECG must be obtained within 10 minutes.", "ar": "…", "so": "…" }
    }
    /* … more steps … */
  ],
  "references": ["ESC Guidelines for STEMI 2023"],
  "subjectId": "cardio",
  "difficulty": "medium",
  "createdAt": 0
}
```

---

## OPD Case authoring — full clinical schema

OPD encounters render an interactive, colour-coded clinical workflow. Every
field beyond the core is optional but *strongly recommended* for realistic
teaching.

```json
{
  "id": "opd_2025_resp_cap",
  "title": {
    "en": "Young adult with cough and fever",
    "ar": "شاب مصاب بسعال وحمى",
    "so": "Qof da'yar oo qufac iyo qandho qaba"
  },

  /* ── Required core ── */
  "chiefComplaint": { "en": "Cough and fever for 5 days", "ar": "…", "so": "…" },
  "history":        { "en": "Productive cough, yellow sputum, fever 39°C…", "ar": "…", "so": "…" },
  "vitals":         { "hr": 108, "bp": "118/72", "rr": 22, "temp": 38.9, "spo2": 94 },
  "examFindings":   { "en": "Crackles at right base, dullness to percussion.", "ar": "…", "so": "…" },
  "correctDiagnosis":  { "en": "Community-acquired pneumonia", "ar": "…", "so": "…" },
  "correctManagement": { "en": "Amoxicillin PO 1g TDS x 5 days; supportive care.", "ar": "…", "so": "…" },
  "differentials": [
    { "en": "Acute bronchitis",  "ar": "…", "so": "…" },
    { "en": "Pulmonary TB",      "ar": "…", "so": "…" }
  ],
  "subjectId": "resp",
  "difficulty": "easy",
  "createdAt": 0,

  /* ── Explicit MCQ options (optional; auto-generated if omitted) ── */
  "diagnosisOptions": [
    { "id": "a", "text": { "en": "Acute bronchitis", "ar": "…", "so": "…" } },
    { "id": "b", "text": { "en": "Community-acquired pneumonia", "ar": "…", "so": "…" } },
    { "id": "c", "text": { "en": "Pulmonary tuberculosis", "ar": "…", "so": "…" } },
    { "id": "d", "text": { "en": "Pulmonary embolism", "ar": "…", "so": "…" } }
  ],
  "diagnosisCorrectId": "b",
  "managementOptions": [ /* same shape */ ],
  "managementCorrectId": "a",
  "explanation": { "en": "…", "ar": "…", "so": "…" },

  /* ── Rich clinical extensions (all optional) ── */
  "patientProfile": {
    "age": 28, "sex": "M",
    "occupation": { "en": "Teacher", "ar": "مدرس", "so": "Macallim" }
  },
  "historyPresentIllness": { "en": "5-day history…", "ar": "…", "so": "…" },
  "pastMedical":  { "en": "None significant.", "ar": "…", "so": "…" },
  "pastSurgical": { "en": "None.", "ar": "…", "so": "…" },
  "medications":  { "en": "Paracetamol as needed.", "ar": "…", "so": "…" },
  "allergies":    { "en": "NKDA.", "ar": "…", "so": "…" },
  "familyHistory":{ "en": "Father has hypertension.", "ar": "…", "so": "…" },
  "socialHistory":{ "en": "Non-smoker.", "ar": "…", "so": "…" },
  "riskFactors":  { "en": "Recent close contact with URTI.", "ar": "…", "so": "…" },
  "reviewOfSystems": { "en": "Fatigue, mild dyspnea on exertion.", "ar": "…", "so": "…" },
  "generalExam":  { "en": "Alert, mildly ill-looking, warm.", "ar": "…", "so": "…" },
  "systemicExam": { "en": "Chest: reduced breath sounds and bronchial breathing right base.", "ar": "…", "so": "…" },
  "positiveFindings": { "en": "Fever, tachypnea, hypoxia (SpO2 94%).", "ar": "…", "so": "…" },
  "negativeFindings": { "en": "No hemoptysis, no purulent nasal discharge.", "ar": "…", "so": "…" },

  "labs": [
    { "name": "WBC",          "value": "14.2", "unit": "×10⁹/L", "ref": "4–11",  "flag": "high" },
    { "name": "Neutrophils",  "value": "82",   "unit": "%",       "ref": "40–70", "flag": "high" },
    { "name": "CRP",          "value": "128",  "unit": "mg/L",    "ref": "<5",    "flag": "critical" }
  ],

  "imaging": [
    {
      "type": "xray",
      "url": "https://.../chest-cap.png",
      "title":   { "en": "Chest X-ray", "ar": "…", "so": "…" },
      "caption": { "en": "Right lower lobe consolidation.", "ar": "…", "so": "…" }
    }
  ],
  "ecg": {
    "type": "ecg",
    "url": "https://.../ecg.png",
    "caption": { "en": "Sinus tachycardia.", "ar": "…", "so": "…" }
  },
  "clinicalImages": [
    { "type": "clinical", "url": "https://.../clinical.jpg" }
  ],

  "learningPoints": [
    { "en": "CURB-65 score guides admission in CAP.", "ar": "…", "so": "…" },
    { "en": "Consider atypical coverage if legionella suspected.", "ar": "…", "so": "…" }
  ],
  "followUp": { "en": "GP review in 3 days; CXR in 6 weeks.", "ar": "…", "so": "…" },
  "references": ["IDSA/ATS CAP Guidelines 2019"]
}
```

### Vital signs colour coding (automatic)

| Vital | Green (Normal) | Yellow (Mild) | Orange (Moderate) | Red (Critical) |
|-------|:-:|:-:|:-:|:-:|
| HR    | 60–100 | 50–59 or 101–120 | 40–49 or 121–140 | <40 or >140 |
| RR    | 12–20  | 21–24  | 25–30 | <8 or >30 |
| Temp  | <37.5  | 37.5–38.4 | 38.5–39.4 | ≥39.5 or <35 |
| SpO₂  | ≥95    | 93–94  | 90–92 | <90 |
| BP (sys) | 100–139 | 140–159 | 90–99 or 160–179 | <90 or ≥180 |

You don't set these manually — the simulator computes them from `vitals`.

---

## Health Education article template

```json
{
  "id": "art_2025_cardio_chest_pain",
  "title": { "en": "Approach to Chest Pain", "ar": "…", "so": "…" },
  "summary": { "en": "Structured ABCDE approach…", "ar": "…", "so": "…" },
  "body": {
    "en": "Chest pain is one of the most common presentations in emergency medicine…\n\nA structured approach — ABCDE, focused history, ECG within 10 minutes, and risk stratification (HEART score) — helps distinguish life-threatening causes (ACS, PE, aortic dissection, tension pneumothorax) from benign etiologies.",
    "ar": "…",
    "so": "…"
  },
  "category": "cardio",
  "tags": ["chest pain", "emergency", "ACS"],
  "references": ["ESC ACS Guidelines", "Rosen's Emergency Medicine"],
  "imageUrl": "https://.../cover.jpg",
  "status": "published",
  "featured": true,
  "author": "Dr. Qaahir",
  "createdAt": 0,
  "updatedAt": 0
}
```

- `status`: `"draft" | "published" | "archived"` — only `published` (or missing status) shows on the public page.
- `featured: true` → article appears in the ⭐ Featured strip at the top of `/education`.

---

## Localization guidelines

### Arabic (العربية)

- Use **Modern Standard Arabic (Fusha)** clinical terminology.
- Numbers written in Latin digits are acceptable (e.g. **ECG 12-lead**).
- Layout is automatically **right-to-left** — no manual work needed.
- Prefer standardized medical Arabic:
  - **STEMI** → *احتشاء عضلة القلب مع ارتفاع ST*
  - **HPI** → *قصة المرض الحالي*
  - **Chief complaint** → *الشكوى الرئيسية*

### Somali

- Use professional clinical Somali. Where an English term has no established
  Somali equivalent, keep the English term in parentheses:
  - **Pneumonia** → *Pneumonia (cudurka sambabka)*
  - **STEMI** → *Inferior STEMI (dhaawaca wadnaha)*
- Avoid literal machine translation for anatomical/pharmacological terms.

### Consistency checklist

- [ ] All three languages present for every localized field
- [ ] Neutral case/OPD titles (no diagnosis revealed)
- [ ] References cited in `reference` / `references[]`
- [ ] Difficulty appropriately set (`easy` / `medium` / `hard`)
- [ ] `subjectId` matches an existing specialty
- [ ] For OPD, at least chief complaint / history / vitals / exam / correct answers filled

---

## Content review workflow

1. **Author** submits JSON via **Admin → Bulk Import** (validate first)
2. **Clinical reviewer** approves in dev/staging environment
3. **Translator** reviews AR and SO
4. **Owner** commits import → tracked in **Audit Log**
5. If anything breaks, use **Rollback** immediately

---

## Questions?

Owner: **Dr. Qaahir** · `dr.qaahir90@gmail.com`
