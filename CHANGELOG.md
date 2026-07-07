# QCAP · Changelog

All notable changes to Qaahir Clinical Academy are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and semantic versioning conventions.

---

## [1.1.0] — 2025 · Learning-experience upgrade

### Added

- **Resume learning** — MCQ quizzes, Case Studies, and OPD encounters now
  auto-save progress to IndexedDB after every action (400 ms debounce) and
  restore it on the next visit via `useLearningSession()`
- **Profile → Continue learning** panel lists all in-progress sessions
  with one-tap Resume
- **Profile → Achievements** — 9 unlockable badges tracked purely from
  local activity (first quiz / case / OPD, perfect score, 7-day &
  30-day streaks, XP milestones, first friend)
- **Profile → Learning statistics** — weekly / monthly / all-time
  aggregates plus per-type and per-difficulty breakdowns
- **Notifications → Filter tabs** — All / Unread / High priority / Archived
- **Notifications → Archive** button per notification (per-user, stored
  in localStorage — never mutates the shared doc)
- **Fisher-Yates shuffle** (`src/utils/shuffle.ts`) replaces the biased
  `sort(() => Math.random() - 0.5)` MCQ randomization pattern with a
  uniform O(n) permutation + seeded RNG for deterministic tests

### Documentation

- Complete top-level doc suite (11 files):
  - `README.md` `CHANGELOG.md` `CONTRIBUTING.md` `SECURITY.md`
  - `DEPLOYMENT.md` `FIREBASE_SETUP.md` `PWA_SETUP.md`
  - `BACKUP.md` `BRANDING.md` `ADMIN_GUIDE.md` `DEVELOPER_GUIDE.md`
- Professional `branding/` folder with README + placeholder files for
  every asset slot (logos, icons, favicon, apple, social, splash,
  screenshots, brand-sheet, fonts)

### Improved

- `package.json` renamed from `react-vite-tailwind` → `qcap-qaahir-clinical-academy`
- Bumped IndexedDB schema to version 2 to add the `sessions` object store
  (backward compatible — existing music store untouched)
- All `admin.audit.*` labels now localized (EN/AR/SO)

### Fixed

- Firestore `undefined` field rejection: initialized Firestore with
  `ignoreUndefinedProperties: true`, added `stripInvalid()` defensive
  helper in `dbService`, and now log every write failure with the full
  payload (was previously silently swallowed)
- Missing `/users/{uid}` documents now auto-repair on next sign-in or
  `onAuthStateChanged` callback

---

## [1.0.0] — 2025 · Production release

The initial production-ready release of QCAP · Qaahir Clinical Academy.

### Added — Learning

- **MCQ Bank** — timer support, per-question difficulty, subject filtering,
  detailed post-quiz review with explanations & references
- **Case Studies** — multi-step clinical scenarios with per-step MCQ
  checkpoints, defensive `normalizeCase()` prevents blank-screen crashes on
  malformed data
- **OPD Simulator** — full clinical workflow (Patient Info → Assessment →
  Diagnosis → Management → Result) with automatic vital-sign colour coding
  and the **Examination Colour Guide** modal
- **Health Education CMS** — draft / publish / archive workflow, featured
  articles, cover-image upload, multilingual content
- **21 clinical specialties** — Cardio, Resp, Neuro, GI, Endo, Peds, ID,
  Surgery, EM, IM, Nephro, Ortho, Neurosurg, Urology, ENT, Ophth, Derm,
  Psych, Ob/Gyn, Midwifery, Nursing, ICU, Anesth, Radio, Pharm, Family,
  Community, Onco, Hema, Rheum

### Added — Community

- **Friends system** — Discover / List / Requests / Challenges tabs,
  suggested users prioritized by country, real-time friend request state
  machine
- **Private chat** — full-featured real-time messaging (sent/delivered/seen,
  typing indicator, online status, reply-to, delete own message, message
  search, iOS-style emoji picker, file/image attachments)
- **Friend challenges** — deterministic quiz duels with auto-computed
  winner, tie-break by fastest time, 🏆 summary auto-posted to friend chat
- **Public user profiles** at `/u/:uid` with context-aware Add friend /
  Message / Challenge actions
- **Leaderboard** — global XP ranking with pinned users, country flags,
  streak indicators, medal top-3

### Added — Administration

- **Admin Dashboard** at `/admin` (also aliased `/admin-dashboard`) — 20+
  clickable module cards
- **User Manager** — full profile fields (UID · full name · avatar · email
  · phone · country · registration date · role · status), click-to-copy UID,
  CSV export, complete moderation ladder (warn / suspend / temp-ban /
  perm-ban / disable / reactivate / delete) with reason logging
- **MCQ Manager, Case Study Manager, OPD Manager, Health Education CMS** —
  full CRUD + Search + Filter + Duplicate + Preview
- **Bulk Import** with validate → commit → rollback workflow (JSON for all
  types, CSV for MCQs)
- **Leaderboard Manager** — reset, recalculate from quizResults, pin
  featured users, export CSV
- **Streak Manager** — configurable rules (bonus XP, inactivity days),
  per-user reset/restore/award, bulk reset
- **Demo Users generator** — 20 realistic country templates; DEMO badge
  everywhere; never affects real user statistics
- **Reports** — aggregate learning-activity metrics + JSON export
- **Notification Manager** — broadcast/personal/group targeting, priority
  levels, optional image
- **Chat Manager** — moderation view of all support + friend threads
- **Branding Manager** — upload OR paste URL for main/dark/light logos,
  favicon, app icon, SVG logo — GitHub raw URLs auto-converted
- **About Us Manager** — orderable content blocks (hero / section / mission
  / vision / contact / social), publish toggle per block, organization-level
  contact & social links
- **Audit Log** — every admin action recorded; per-row delete, batch delete
  by selection, clear all
- **Settings** — site name, support email, brand color, allow registration,
  maintenance mode
- **Final Review Checklist** — 22-item pre-launch verification with export

### Added — Authentication

- **Real Firebase email verification** — auto-sent on registration
- **Password reset** via Firebase's `sendPasswordResetEmail`
- **Persistent verification banner** in the Layout for unverified users
  with one-click resend
- **Protected owner account** — Dr. Qaahir (`dr.qaahir90@gmail.com`)
  auto-provisioned on boot, self-heals on every login, cannot be demoted,
  moderated, or deleted
- **Auto-redirect** — admin users land on `/admin` immediately after login

### Added — Internationalization

- **730+ translation keys** across three languages
- Professional medical terminology in Arabic (MSA / Fusha) and Somali
- RTL support with automatic `<html dir>` switching for Arabic
- Language selector in the top bar (`🇬🇧 EN · 🇸🇦 AR · 🇸🇴 SO`)
- Interpolation via `{var}` placeholders

### Added — UX

- **Light / Dark / System theme** with `matchMedia` auto-switching
- **Professional sound engine** — Web Audio API multi-oscillator SFX with
  volume control (correct, wrong, achievement, XP, streak, notification,
  reward, mcqComplete, caseComplete, opdComplete, click, message, warning)
- **User music player** — files stored in IndexedDB (zero Firebase
  Storage cost), full playlist manager, shuffle, repeat, seek, background
  playback, Android Media Session API integration
- **Fixed music button** in the top bar (never blocks page content)
- **Mobile bottom navigation** — 6 core items (Home · MCQs · Cases · OPD ·
  Friends · Profile)
- **Android back-button handling** — sentinel history entry prevents
  accidental exit; confirmation at Home
- **Draggable → replaced with fixed positioning** — no floating UI blocks
  content
- **Notification preferences UI** — master toggle + per-category
  (Announcements / Personal / Reminders / Achievements)

### Added — PWA

- **Complete Web App Manifest** with `standalone` display, theme_color,
  background_color, maskable icons, shortcuts (MCQ / OPD / Cases / Friends)
- **Service worker** with cache-first shell, network-first for others,
  push handling, notificationclick routing
- **Offline app shell** cached automatically after first visit
- **Installable** on Android (Chrome), iOS (Safari share-sheet), and desktop
- **Manifest fallback** — pwa.ts injects an inline data-URL manifest if the
  file is unreachable

### Added — Infrastructure

- **Firebase Spark-plan optimized** — per-collection read cache
  (5 min – 60 min TTLs), shared realtime subscriptions, client-side sorting
- **GitHub Actions** workflow for automatic build + deploy to GitHub Pages
- **Cloudflare Pages** support with `_headers` (HSTS, CSP-friendly) and
  `_redirects` (SPA fallback)
- **Complete documentation** — README, FIRESTORE_SCHEMA, FIREBASE_SETUP,
  DEPLOYMENT, ADMIN_MANUAL, USER_MANUAL, IMPORT_FORMATS, CHANGELOG,
  PRODUCTION_CHECKLIST, plus developer + content-authoring guides in `docs/`

### Security

- **Firestore security rules** provided for all collections (see
  `FIREBASE_SETUP.md` and `FIRESTORE_SCHEMA.md`)
- **Storage security rules** provided for `/avatars`, `/chat`, `/branding`,
  `/education`, `/notifications`
- **Owner account protected** at the service layer — refuses demotion,
  moderation, or deletion regardless of who invokes the action
- **XSS-safe** rendering — all localized text goes through React's default
  escaping; no `dangerouslySetInnerHTML` in the codebase
- **CSP-friendly** — no inline event handlers, no `eval`

### Documentation

- Comprehensive `README.md` (~700 lines) covering every requested topic
- `docs/DEVELOPER.md` — deep technical reference
- `docs/CONTENT-AUTHORING.md` — MCQ/Case/OPD/Article writing guide
- `docs/README.md` — documentation index
- `.env.example` — annotated environment variable template
- `LICENSE` — Educational Use License with clinical disclaimer

### Backward compatibility

- Every schema change since inception has been **additive** — new fields
  are optional; documents written by older versions load cleanly
- Existing `subjectId` values, `id` formats, and localization keys remain
  stable
- CSV import format is frozen — files created today will import for the
  foreseeable future

### Build

- Final production bundle: **~1.38 MB** (~390 KB gzipped)
- **`vite-plugin-singlefile`** inlines JS + CSS into `dist/index.html` for
  trivial deployment
- **Public assets** (`sw.js`, `manifest.webmanifest`, `icon.svg`, `_headers`,
  `_redirects`, `robots.txt`) copied verbatim into `dist/`
- **No console.log, no debugger, no TODO/FIXME** in production code
- **TypeScript strict mode** with zero errors, zero warnings

---

## Versioning policy

QCAP follows **semantic versioning**:

- **MAJOR** — schema-breaking changes (requires migration). Never planned;
  we favour additive extension.
- **MINOR** — new features, additive schema fields, new translations.
- **PATCH** — bug fixes, security updates, documentation improvements.

The Service Worker `VERSION` constant in `public/sw.js` should be bumped
on every deploy that changes cached assets.

---

## Roadmap (post-1.0)

Non-committal ideas the team may explore in the future:

- Offline quiz-taking with sync on reconnect
- Cloud Functions for scheduled digest notifications
- Public API for LMS integration
- Analytics dashboard with charts (Recharts / Chart.js)
- Voice input for chat and dictation for OPD note-taking
- Additional languages (French, Swahili, Amharic)

---

## Reporting issues

- **Bug reports** — via the in-app **Support Chat** or by email
- **Content errors** — contact the admin team
- **Security disclosures** — email the owner directly:
  `dr.qaahir90@gmail.com`
