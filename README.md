# QCAP · Qaahir Clinical Academy

> **Master Clinical Medicine** — MCQs · Case-Based Learning · OPD Simulator
>
> A production-ready, trilingual (English / العربية / Soomaali) medical
> education platform built with **React 19**, **Vite**, **Tailwind CSS**,
> **Firebase**, and **PWA** technology.

[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-Educational-blue.svg)]()
[![PWA](https://img.shields.io/badge/PWA-installable-teal.svg)]()

---

## Table of contents

1. [Project overview](#project-overview)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Folder structure](#folder-structure)
5. [Firebase collections & database schema](#firebase-collections--database-schema)
6. [Authentication flow](#authentication-flow)
7. [User roles & permissions](#user-roles--permissions)
8. [Admin Dashboard modules](#admin-dashboard-modules)
9. [User features](#user-features)
10. [Environment variables](#environment-variables)
11. [Installation](#installation)
12. [Local development](#local-development)
13. [Build & deployment](#build--deployment)
14. [GitHub workflow](#github-workflow)
15. [Cloudflare deployment](#cloudflare-deployment)
16. [PWA configuration](#pwa-configuration)
17. [Notification system](#notification-system)
18. [Translation system](#translation-system)
19. [How-to guides](#how-to-guides)
20. [Troubleshooting](#troubleshooting)
21. [Future maintenance](#future-maintenance)

---

## Project overview

**QCAP** (**Q**aahir **C**linical **A**cademic **P**rofessional) is a
Progressive Web App designed for medical students, doctors, nurses, and
healthcare professionals. It combines:

- 🎯 **1,000+ MCQ bank** with timers, difficulty levels, and specialty grouping
- 📋 **Case Studies** — multi-step clinical scenarios with MCQ checkpoints
- 🩺 **OPD Simulator** — full clinical encounters: history → assessment → diagnosis → management
- 📚 **Health Education CMS** — admin-managed articles, categories, drafts, and featured content
- 🤝 **Friends & Challenges** — peer-to-peer real-time messaging + quiz duels
- 🏆 **Gamification** — XP, streaks, leaderboard, achievements
- 🎨 **Branding manager**, **theme (light/dark/system)**, **background music player**
- 🌍 **Trilingual** — professional medical translations in English, Arabic (RTL), Somali
- 📱 **PWA-first** — installable, offline-capable, hardware media controls

The **default owner account** is **Dr. Qaahir** (`dr.qaahir90@gmail.com`) and
is protected: it cannot be demoted, deleted, or moderated by anyone — including
other admins.

---

## Technology stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **React 19** | Component model + hooks |
| Language | **TypeScript** (strict) | Type safety across the codebase |
| Build tool | **Vite 7** | Fast dev server + production bundling |
| Styling | **Tailwind CSS v4** | Utility-first CSS with custom variants |
| Routing | **react-router-dom v7** | Client-side routing (HashRouter) |
| State | **Zustand** | Lightweight global state |
| Backend | **Firebase** (Auth · Firestore · Storage) | Auth, real-time database, file uploads |
| Local storage | **IndexedDB** (via native API) | User's music files |
| Audio | **Web Audio API** | Sound effects + `<audio>` element for music |
| PWA | Custom service worker + Web App Manifest | Installability + offline + push |
| CI/CD | GitHub Actions | Automated build & deploy |
| Hosting | **Cloudflare Pages**, GitHub Pages, or Firebase Hosting | Static single-file bundle |

Zero runtime backend code — every server-side capability is delegated to
Firebase, keeping the entire application deployable as a single static
`index.html`.

---

## Architecture

QCAP is a **fully client-side SPA** that mounts into `<div id="root">` and
handles all logic in the browser. It gracefully degrades:

- **With Firebase configured** → uses Firestore for data, Firebase Auth for
  authentication, Firebase Storage for files, and Firebase Cloud Messaging
  compatible push where supported.
- **Without Firebase** (demo mode) → uses `localStorage` for everything,
  IndexedDB for music. The UI is identical.

```
┌────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                 │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  MusicProvider · ThemeProvider · LanguageProvider          │   │
│  │  ErrorBoundary · Suspense · HashRouter                     │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │                     Layout                           │  │   │
│  │  │  Top bar (Brand · Theme · Music · Notif · Profile)  │  │   │
│  │  │  Sidebar (desktop) · Bottom nav (mobile)            │  │   │
│  │  │  <Outlet /> → routed pages                          │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
           │                       │                     │
           ▼                       ▼                     ▼
   ┌───────────────┐       ┌───────────────┐     ┌───────────────┐
   │  authService  │       │   dbService   │     │storageService │
   │ (Firebase/LS) │       │ (Firestore/LS │     │(FirebaseStore │
   │               │       │  + cache)     │     │ /base64)      │
   └───────────────┘       └───────────────┘     └───────────────┘
```

### Read-cache strategy (Firebase Spark friendly)

`dbService` caches every list read in-memory + `localStorage` with per-collection
TTLs, keeping quota usage well within the free tier:

| Collection         | TTL |
|--------------------|-----|
| `subjects`         | 60 min |
| `mcqs` `caseStudies` `opdCases` | 15 min |
| `educationArticles` `siteSettings` | 10 min |
| `users` `quizResults` | 5 min |
| `auditLogs` `notifications` | 60 sec |
| `chatThreads` `chatMessages` | real-time (no cache) |

Realtime chat/notifications use **one shared** `onSnapshot` per collection
fanned out to N components. Writes invalidate cache; subsequent reads are fresh.

---

## Folder structure

```
qcap/
├── .github/workflows/
│   └── deploy.yml                # CI: build + deploy to GitHub Pages
├── public/
│   ├── _headers                  # Cloudflare/Netlify security headers
│   ├── _redirects                # SPA rewrites
│   ├── icon.svg                  # PWA icon (QCAP monogram)
│   ├── manifest.webmanifest      # PWA manifest
│   ├── robots.txt                # SEO directives
│   └── sw.js                     # Service worker (offline + push)
├── src/
│   ├── App.tsx                   # Root component + route table
│   ├── main.tsx                  # ReactDOM entry + providers
│   ├── index.css                 # Tailwind directives + custom CSS variables
│   ├── pwa.ts                    # Registers SW, injects manifest fallback
│   │
│   ├── audio/
│   │   └── MusicProvider.tsx     # Global music state + <audio> element
│   │
│   ├── components/
│   │   ├── BrandLogo.tsx         # Theme-aware brand logo (custom or built-in)
│   │   ├── ErrorBoundary.tsx     # Prevents blank-screen crashes
│   │   ├── Layout.tsx            # Top bar, sidebar, bottom nav, mobile drawer
│   │   ├── MusicButton.tsx       # Top-bar music player dropdown
│   │   ├── ProtectedRoute.tsx    # Auth guard (adminOnly flag)
│   │   └── ui.tsx                # Design-system primitives (Button, Card, Modal…)
│   │
│   ├── config/
│   │   └── firebase.ts           # Firebase SDK initialization
│   │
│   ├── data/
│   │   └── seed.ts               # Default seed content for demo mode
│   │
│   ├── hooks/
│   │   └── useBackButton.ts      # Android/PWA back-button UX
│   │
│   ├── i18n/
│   │   ├── index.tsx             # LanguageProvider + t() + tr() helpers
│   │   └── translations.ts       # EN/AR/SO dictionaries (~700 keys)
│   │
│   ├── pages/                    # One file per top-level route
│   │   ├── About.tsx             # Public About Us page
│   │   ├── Admin.tsx             # Admin dashboard + all managers
│   │   ├── Auth.tsx              # Sign-in / register
│   │   ├── Cases.tsx             # Case Studies module
│   │   ├── Education.tsx         # Public education feed
│   │   ├── FriendChat.tsx        # Full real-time friend chat
│   │   ├── Friends.tsx           # Friends list, requests, discover
│   │   ├── Home.tsx              # User dashboard
│   │   ├── Leaderboard.tsx       # Public leaderboard
│   │   ├── MCQ.tsx               # MCQ quiz runner
│   │   ├── Notifications.tsx     # In-app notification feed
│   │   ├── OPD.tsx               # OPD Simulator
│   │   ├── Profile.tsx           # User profile + settings
│   │   ├── Search.tsx            # Global search
│   │   ├── Support.tsx           # Admin ↔ user chat
│   │   └── UserProfile.tsx       # Public /u/:uid profile
│   │
│   ├── services/
│   │   ├── auth.ts               # Firebase Auth wrapper + protected admin
│   │   ├── challenges.ts         # Friend challenge state machine
│   │   ├── db.ts                 # Firestore wrapper + cache
│   │   ├── friendChat.ts         # Friend chat thread helpers
│   │   ├── friends.ts            # Friend request state machine
│   │   ├── notifications.ts      # OS notification + prefs
│   │   ├── notify.ts             # High-level push helper
│   │   └── storage.ts            # Firebase Storage + base64 fallback
│   │
│   ├── stores/
│   │   └── index.ts              # Zustand: auth + UI state
│   │
│   ├── theme/
│   │   └── index.tsx             # ThemeProvider (light/dark/system)
│   │
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces
│   │
│   └── utils/
│       ├── cn.ts                 # className joiner
│       ├── idb.ts                # IndexedDB helper (music files)
│       └── sound.ts              # Web-Audio SFX synthesizer
│
├── index.html                    # Vite entry + SEO/PWA meta
├── vite.config.ts                # Vite + single-file plugin
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## Firebase collections & database schema

Every collection is **optional** — the app runs entirely from `localStorage`
if Firebase is not configured. All types are declared in
[`src/types/index.ts`](src/types/index.ts).

### `users` (collection)

```ts
interface AppUser {
  uid: string;             // Firebase Auth UID
  email: string;
  username: string;
  whatsapp?: string;
  role: "admin" | "user";
  photoURL?: string;
  createdAt: number;       // ms epoch
  bookmarks?: string[];    // article IDs
  xp?: number;
  streak?: number;
  language?: "en" | "ar" | "so";

  // Optional moderation fields
  status?: "active" | "warned" | "suspended" | "banned" | "disabled" | "deleted";
  warnings?: number;
  banUntil?: number;
  moderation?: ModerationAction[];
  loginHistory?: LoginRecord[];
  lastActiveAt?: number;

  // Optional gamification & profile
  country?: string;        // ISO-3166 alpha-2
  streakUpdatedAt?: number;
  featured?: boolean;      // pinned to leaderboard top
  isDemo?: boolean;
  friends?: string[];
}
```

### `mcqs` (collection)

```ts
interface MCQ {
  id: string;
  question: { en: string; ar: string; so: string };
  options: { id: string; text: LocalizedText }[];
  correctOptionId: string;
  explanation: LocalizedText;
  difficulty: "easy" | "medium" | "hard";
  subjectId: string;
  tags?: string[];
  reference?: string;
  imageUrl?: string;
  timerSeconds?: number;
  createdAt: number;
}
```

### `caseStudies` (collection)

Multi-step clinical case with per-step MCQ checkpoints. See
[`src/types/index.ts` › `CaseStudy`](src/types/index.ts).

### `opdCases` (collection)

Full clinical encounter — chief complaint, HPI, PMH, PSH, medications,
allergies, family/social history, ROS, examinations, labs, imaging, ECG,
clinical images, differential diagnoses, correct diagnosis / management,
learning points, follow-up. See [`OPDCase`](src/types/index.ts).

### `educationArticles` (collection)

CMS-managed content with drafts, publish workflow, featured flag, categories,
cover image, references. See [`EducationArticle`](src/types/index.ts).

### `notifications` (collection)

```ts
interface Notification {
  id: string;
  audience: "broadcast" | "personal" | "group";
  userId?: string; userIds?: string[];
  title: LocalizedText; body: LocalizedText;
  imageUrl?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  read?: boolean; readBy?: string[];
  kind?: "announcement" | "personal" | "reminder" | "achievement"
       | "friend_request" | "friend_accept"
       | "challenge_invite" | "challenge_result" | "message";
  createdAt: number;
  link?: string; senderId?: string;
  meta?: Record<string, unknown>;
}
```

### `chatThreads` / `chatMessages`

Support tickets (admin ↔ user) AND friend chats live in the same collection,
distinguished by `kind: "support" | "friend"` and `participantIds[]`. See
[`ChatThread`, `ChatMessage`](src/types/index.ts).

### `friendRequests`, `friendships`, `challenges`

Friend system + challenge state machine. All state transitions documented in
[`services/friends.ts`](src/services/friends.ts) and
[`services/challenges.ts`](src/services/challenges.ts).

### `aboutBlocks`, `aboutSettings`

Public About Us page CMS. Blocks are ordered, per-block published toggle,
localized title/body, plus organization-level contact + social links.

### `auditLogs`

Every admin action produces a log entry:

```ts
interface AuditLog {
  id: string;
  actorId: string;
  action: string;        // e.g. "user.promote", "leaderboard.reset"
  target?: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}
```

### `siteSettings/main`

Single document — site-wide preferences including branding assets, brand
colour, streak rules, and featured subjects.

### Firestore security rules (recommended)

Add these to `firestore.rules` in your Firebase project:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    // Public read for learning content; write for admins only
    match /mcqs/{id}         { allow read: if true; allow write: if isAdmin(); }
    match /caseStudies/{id}  { allow read: if true; allow write: if isAdmin(); }
    match /opdCases/{id}     { allow read: if true; allow write: if isAdmin(); }
    match /educationArticles/{id} { allow read: if true; allow write: if isAdmin(); }
    match /subjects/{id}     { allow read: if true; allow write: if isAdmin(); }
    match /aboutBlocks/{id}  { allow read: if true; allow write: if isAdmin(); }
    match /aboutSettings/{id}{ allow read: if true; allow write: if isAdmin(); }
    match /siteSettings/{id} { allow read: if true; allow write: if isAdmin(); }

    // Users can read all profiles; only self or admin can update; only admin can delete
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin();
    }

    // Quiz results — user writes their own, everyone reads (for leaderboard)
    match /quizResults/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin() ||
        (request.auth != null && resource.data.userId == request.auth.uid);
    }

    // Notifications
    match /notifications/{id} {
      allow read: if request.auth != null;
      allow create, update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Chat — participants only + admin moderation
    match /chatThreads/{id} {
      allow read, update: if isAdmin() ||
        (request.auth != null && (resource.data.userId == request.auth.uid ||
          request.auth.uid in resource.data.participantIds));
      allow create: if request.auth != null;
      allow delete: if isAdmin();
    }
    match /chatMessages/{id} {
      allow read, update: if request.auth != null;
      allow create: if request.auth != null &&
        request.resource.data.senderId == request.auth.uid;
      allow delete: if isAdmin() ||
        (request.auth != null && resource.data.senderId == request.auth.uid);
    }

    // Friends / challenges — participants only
    match /friendRequests/{id} {
      allow read, update: if request.auth != null &&
        (resource.data.fromId == request.auth.uid || resource.data.toId == request.auth.uid);
      allow create: if request.auth != null &&
        request.resource.data.fromId == request.auth.uid;
    }
    match /friendships/{id}  { allow read, write: if request.auth != null; }
    match /challenges/{id}   { allow read, write: if request.auth != null; }

    // Audit log — admin only
    match /auditLogs/{id} { allow read, write: if isAdmin(); }
  }
}
```

### Firebase Storage rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public read for uploaded logos/images
    match /branding/{file=**}      { allow read; allow write: if request.auth != null; }
    match /education/{file=**}     { allow read; allow write: if request.auth != null; }
    match /notifications/{file=**} { allow read; allow write: if request.auth != null; }
    match /avatars/{uid}/{file=**} { allow read; allow write: if request.auth != null && request.auth.uid == uid; }
    match /chat/{threadId}/{file=**} { allow read, write: if request.auth != null; }
  }
}
```

---

## Authentication flow

### Sign in / register

```
User → Auth page → authService.login(email, pw)
                 ↳ authService.register(email, pw, username, whatsapp)
                    ↓
              Firebase Auth (real) OR localStorage (demo)
                    ↓
              ensureUserDoc() writes Firestore /users/{uid}
                    ↓
              stores current uid in localStorage.medacad.currentUid
                    ↓
              onChange listener updates Zustand store
                    ↓
              Auto-redirect: admin → /admin,  user → /
```

### Email verification (Firebase mode only)

On registration, `sendEmailVerification(cred.user)` is called automatically
(the protected owner account is exempt). A banner appears in the Layout for
signed-in users whose `emailVerified === false`, with a **Resend** button that
calls `authService.resendVerification()`.

### Password reset

The **Forgot password?** link on the sign-in form calls
`authService.resetPassword(email)`, which uses Firebase's built-in
`sendPasswordResetEmail`. Not available in demo mode.

### Protected owner

`PROTECTED_ADMIN_EMAIL = "dr.qaahir90@gmail.com"` is hard-coded in
`services/auth.ts`. On every login and every `onChange`, if this account's
role is not `admin` or status is not `active`, it is silently repaired. The
Admin Users manager also refuses to demote or moderate this account.

---

## User roles & permissions

| Capability                       | User | Admin | Owner (Dr. Qaahir) |
|----------------------------------|:----:|:-----:|:------------------:|
| Take MCQs / Cases / OPD          | ✅   | ✅    | ✅ |
| Bookmark / edit own profile      | ✅   | ✅    | ✅ |
| Friend requests + chat           | ✅   | ✅    | ✅ |
| Clear own quiz history           | ✅   | ✅    | ✅ |
| View leaderboard                 | ✅   | ✅    | ✅ |
| Access `/admin`                  | ❌   | ✅    | ✅ |
| CRUD content (MCQs, cases, …)    | ❌   | ✅    | ✅ |
| Moderate users                   | ❌   | ✅    | ✅ |
| Manage branding / settings       | ❌   | ✅    | ✅ |
| Delete audit logs                | ❌   | ✅    | ✅ |
| Be demoted / banned              | ✅   | ✅    | ❌ |

---

## Admin Dashboard modules

| Route | Module | Description |
|-------|--------|-------------|
| `/admin` | **Overview** | Clickable stat grid → drill into any module |
| `/admin/users` | **User Manager** | UID + full profile, moderation history, promote/demote, warn/ban/disable |
| `/admin/mcqs` | **MCQ Manager** | List, edit, delete, duplicate, preview |
| `/admin/cases` | **Case Study Manager** | Same CRUD for multi-step cases |
| `/admin/opd` | **OPD Manager** | CRUD for OPD encounters |
| `/admin/education` | **Health Education CMS** | Draft/publish/archive, featured, multilingual, cover image upload |
| `/admin/leaderboard` | **Leaderboard Manager** | Reset, recalculate, export CSV, pin featured users |
| `/admin/streaks` | **Streak Manager** | Rules, reset, restore, award bonus |
| `/admin/demo` | **Demo Users** | Generate/remove sample profiles for testing |
| `/admin/reports` | **Reports** | Aggregate learning-activity metrics + JSON export |
| `/admin/import` | **Bulk Import** | Paste JSON/CSV, validate, commit, rollback |
| `/admin/notifications` | **Notification Manager** | Broadcast / personal / group; priority; optional image |
| `/admin/chats` | **Chat Manager** | Moderate all support & friend threads |
| `/admin/branding` | **Branding Manager** | Upload logo/icon/favicon or paste URL |
| `/admin/about` | **About Us Manager** | Blocks, ordering, publish, contact info, social links |
| `/admin/audit` | **Audit Log** | Every admin action; delete selected or clear all |
| `/admin/settings` | **Settings** | Site name, support email, brand colour, registration, maintenance mode |
| `/admin/review` | **Final Review** | 22-item pre-launch checklist with export |

---

## User features

| Route | Feature |
|-------|---------|
| `/` | Home dashboard — 6 learning modules + top learners + featured articles |
| `/mcq` | MCQ Bank — filter by specialty/difficulty, timed quizzes |
| `/cases` | Case Studies — multi-step clinical scenarios |
| `/opd` | OPD Simulator — full clinical encounter workflow |
| `/education` | Health Education — public article feed with bookmarks |
| `/leaderboard` | Global leaderboard — country, streak, XP, accuracy |
| `/friends` | Friends — list, discover, requests, challenges tabs |
| `/friends/chat/:uid` | Real-time private chat — typing, seen, delete, emoji, attachments |
| `/u/:uid` | Public user profile — stats + Add friend / Message / Challenge |
| `/notifications` | Notification feed — categorized, deep-linked |
| `/support` | Chat with the support team |
| `/search` | Global search across MCQs, cases, articles |
| `/profile` | Profile settings, theme, sound, music, language, sign out, clear history |
| `/about` | Public About Us page |

---

## Environment variables

Create a `.env.local` file at the project root **or** set these in your host's
environment settings. All are optional — if omitted, the app runs in demo mode.

```bash
# Firebase (get these from Firebase Console → Project settings → Web app)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

**⚠️ Never commit `.env.local`.** The provided `.gitignore` excludes it.

---

## Installation

```bash
# Prerequisites: Node.js 20+, npm 10+
git clone https://github.com/<your-org>/qcap.git
cd qcap
npm install
```

## Local development

```bash
npm run dev          # Vite dev server at http://localhost:5173
```

- Hot-reload for React components
- No Firebase required — everything runs in demo mode with seeded content
- The demo admin button on the login page auto-fills Dr. Qaahir's credentials

## Build & deployment

```bash
npm run build        # Emits static assets into dist/
npm run preview      # Preview the built bundle locally
```

Build output:

```
dist/
├── index.html            # SPA (all JS/CSS inlined via vite-plugin-singlefile)
├── manifest.webmanifest  # PWA manifest
├── icon.svg              # App icon
├── sw.js                 # Service worker
├── _headers              # Cloudflare security headers
├── _redirects            # SPA fallback rewrite
└── robots.txt
```

Upload `dist/` to any static host (Cloudflare Pages, Netlify, GitHub Pages,
Firebase Hosting, S3+CloudFront, etc.).

---

## GitHub workflow

`.github/workflows/deploy.yml` automatically builds on push to `main` and
publishes to **GitHub Pages**:

```yaml
on: { push: { branches: [main] } }
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci && npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # …repeat for each VITE_* secret
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy-pages:
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

Add all `VITE_FIREBASE_*` values under **Settings → Secrets and variables → Actions**.

---

## Cloudflare deployment

1. Push your repo to GitHub.
2. In Cloudflare dashboard → **Pages → Create a project → Connect to Git**.
3. **Build settings**:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20`
4. **Environment variables**: add all `VITE_FIREBASE_*` values.
5. Deploy. Cloudflare automatically applies `_headers` and `_redirects` from
   `public/`.

HTTPS, HTTP/2, HTTP/3, Brotli compression, and global CDN are enabled by
default.

---

## PWA configuration

Files in `public/` power installability:

| File | Role |
|------|------|
| `manifest.webmanifest` | Full Google-compliant manifest: `name`, `short_name`, `display: standalone`, `theme_color`, icons (SVG + PNG hints), shortcuts (MCQ / OPD / Cases / Friends) |
| `icon.svg` | Scalable icon with `any maskable` purpose |
| `sw.js` | Cache-first for shell + network-first for other GETs; handles `push` and `notificationclick` |
| `_headers` | HSTS, CSP-friendly, no-cache for SW, immutable cache for `/assets/*` |

The `src/pwa.ts` module registers the SW on app start and gracefully falls
back to an inline data-URL manifest if the file is unreachable (e.g. `file://`
preview).

### Android install

Open the deployed URL in Chrome → tap ⋮ → **Install app**.

### iOS install

Open in Safari → tap **Share → Add to Home Screen**.

### Back-button UX (installed PWA)

`src/hooks/useBackButton.ts` pushes a sentinel history entry on load so the
first back press stays in the app. At `/`, it prompts before exiting.

---

## Notification system

Three layers:

1. **Firestore document** (`notifications` collection) → always written; shows up in `/notifications` feed forever.
2. **In-app toast** → immediate feedback for the sender's tab.
3. **OS notification** via `showNotification()` in `services/notifications.ts`
   → uses `ServiceWorkerRegistration.showNotification` when the SW is active
   (so it survives the tab being closed), falling back to `new Notification(...)`
   for in-page delivery.

User preferences (persisted in `localStorage`):

- Master toggle (enable/disable all)
- Per-category: **Announcements · Personal · Reminders · Achievements**

Managed from **Profile → 🔔 Push notifications**.

`pushNotification(args)` in `services/notify.ts` is the unified helper used
everywhere: friend requests, friend accepts, challenge invites, challenge
results, new messages, admin broadcasts. It automatically maps
`kind → UI category`.

---

## Translation system

- **~730 keys** in `src/i18n/translations.ts` (EN / AR / SO)
- Fully typed via the `TranslationKey` union — TypeScript flags missing keys at compile time
- `LanguageProvider` sets `<html lang>` and `dir="rtl"` for Arabic
- Interpolation: `t("mcq.questionOf", { n: 3, total: 10 })` → `"Question 3 of 10"`
- Localized content stored in Firestore uses `LocalizedText = { en, ar, so }`
- Helper `tr(text)` falls back to the first non-empty language

To add a new translation key:

1. Add the key to the `TranslationKey` union in `translations.ts`
2. TypeScript will error on the `en`, `ar`, `so` dictionaries until you add values
3. Use in a component: `t("your.new.key")`

---

## How-to guides

### How to add new MCQs

**Option A — via UI (recommended)**

1. Sign in as admin → **Admin → MCQ Manager → ＋ New**
2. Edit the JSON form and save

**Option B — via Bulk Import**

1. **Admin → Bulk Import → Select "MCQs"**
2. Click **Template** to insert a starter JSON array, or upload a JSON/CSV file
3. Click **Validate** → **Commit import**
4. **Rollback** button reverts the last import

**CSV columns for MCQ import** (headers on first row):

```
id,questionEn,questionAr,questionSo,optA,optB,optC,optD,correctOptionId,explanationEn,explanationAr,explanationSo,difficulty,subjectId
```

### How to add Case Studies

Same as MCQs but the JSON structure is:

```json
{
  "id": "case_x",
  "title": { "en": "Chest pain in a 62-year-old smoker", "ar": "…", "so": "…" },
  "summary": { "en": "…", "ar": "…", "so": "…" },
  "patient": { "age": 62, "sex": "M", "presenting": { "en": "…", "ar": "…", "so": "…" } },
  "steps": [
    {
      "id": "s1",
      "title": { "en": "Initial assessment", "ar": "…", "so": "…" },
      "content": { "en": "BP 150/95, HR 102…", "ar": "…", "so": "…" },
      "question": { "en": "Best next step?", "ar": "…", "so": "…" },
      "options": [
        { "id": "a", "text": { "en": "12-lead ECG", "ar": "…", "so": "…" } },
        { "id": "b", "text": { "en": "Chest X-ray", "ar": "…", "so": "…" } }
      ],
      "correctOptionId": "a",
      "explanation": { "en": "…", "ar": "…", "so": "…" }
    }
  ],
  "references": ["ESC Guidelines for STEMI 2023"],
  "subjectId": "cardio",
  "difficulty": "medium",
  "createdAt": 0
}
```

**Neutral titles only** — the title must NOT reveal the diagnosis (e.g.
"Chest pain in a 62-year-old smoker", NOT "Acute STEMI").

### How to add OPD cases

Full clinical schema — every field except the ones marked below is optional.
See `src/data/seed.ts` for a fully-populated example (`opd_1`).

**Required**: `id`, `chiefComplaint`, `history`, `vitals`, `examFindings`,
`correctDiagnosis`, `correctManagement`, `differentials`, `subjectId`,
`difficulty`, `createdAt`.

**Recommended optional**: `title` (neutral), `historyPresentIllness`,
`pastMedical`, `pastSurgical`, `medications`, `allergies`, `familyHistory`,
`socialHistory`, `riskFactors`, `reviewOfSystems`, `generalExam`, `systemicExam`,
`positiveFindings`, `negativeFindings`, `labs[]`, `imaging[]`, `ecg`,
`clinicalImages[]`, `learningPoints[]`, `followUp`.

If you provide `diagnosisOptions[]` + `diagnosisCorrectId` and
`managementOptions[]` + `managementCorrectId`, those explicit choices are used;
otherwise the simulator auto-generates 4 MCQ options by mixing the correct
answer with differentials from other cases.

### How to manage Health Education

1. **Admin → Health Education CMS → ＋ New article**
2. Fill in title / summary / body in all three languages
3. Select category, upload cover image (optional)
4. Choose **Save draft** or **Publish**
5. Toggle the ★ button to mark as **Featured** (shown at top of `/education`)

Featured articles appear in a dedicated strip on the public education page.
Only articles with `status === "published"` (or no status, for backward
compatibility) are visible to users.

### How to add a new specialty / subject

Edit `src/data/seed.ts` and append to `seedSubjects`:

```ts
{ id: "hem",
  name: { en: "Hematology", ar: "أمراض الدم", so: "Dhiigga" },
  icon: "🩸",
  color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  isSpecialty: true }
```

Any content whose `subjectId` matches will automatically appear grouped under
this specialty in the OPD Simulator.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Blank screen after login** | Corrupted case/opd data | The `ErrorBoundary` in `src/components/ErrorBoundary.tsx` should catch this — check browser console. Cases with missing steps show a friendly "no steps yet" message. |
| **Music doesn't autoplay** | Browser gesture policy | Music now starts only after the first user interaction. This is standard browser behavior. |
| **Push notifications not delivered** | SW not registered / permission denied | Verify: (1) served over HTTPS; (2) `Notification.permission === "granted"`; (3) `navigator.serviceWorker.controller` is not null |
| **"Firebase quota exceeded"** | Free-tier daily limit | The cache system minimizes reads. Check `dbService.clearCache()` isn't being called on every navigation. Consider upgrading to Blaze. |
| **RTL layout broken** | Missing `flip-rtl` utility | Add `className="flip-rtl"` on directional icons (arrows, chevrons). See `src/index.css`. |
| **PWA won't install** | Manifest invalid | Verify `dist/manifest.webmanifest` is served with `Content-Type: application/manifest+json` (handled by `_headers`) |
| **Admin can't sign in** | Owner role stripped | The account self-heals on next login. If completely locked out, edit `users/admin_qaahir_super` in Firestore Console and set `role: "admin"`, `status: "active"`. |
| **Case Studies opens blank** | Bad data (should not happen anymore) | Fixed via `normalizeCase()` + `ErrorBoundary`. Report a bug with the offending case JSON. |
| **Translation shows key name** | Missing translation | Add the value to `translations.ts` for the missing language, or check the key exists in the `TranslationKey` union |

---

## Future maintenance

- **Adding new UI text** — add key to `TranslationKey` in `translations.ts`, TS will
  force you to fill EN/AR/SO before building.
- **Adding a new admin page** — create a component in `src/pages/Admin.tsx`,
  add a `<Route>` and a nav item, then add a card to `AdminOverview`.
- **Adding a new user page** — create `src/pages/YourPage.tsx`, lazy-import
  in `App.tsx`, add a `<Route>`.
- **Extending schemas** — add optional fields to interfaces in
  `src/types/index.ts`. Never remove or rename existing fields — the codebase
  guarantees backward compatibility by treating every new field as optional.
- **Adding a new collection** — extend `CollName` in `src/services/db.ts` and
  update the TTL table if it should be cached.
- **Adding a new Firebase config** — put the key in `.env.local` with
  `VITE_` prefix (Vite exposes only prefixed vars to the client).
- **Version bumps** — the SW cache version constant `VERSION` in `public/sw.js`
  should be bumped on every deploy that changes cached assets to invalidate old
  caches.

---

## License

Educational use. See [`LICENSE`](LICENSE) for full terms.

---

## Credits

- **Owner** — Dr. Qaahir · `dr.qaahir90@gmail.com`
- Built with ❤️ for medical students and healthcare professionals in Somalia,
  the Horn of Africa, the Middle East, and beyond.
- Trilingual medical translations reviewed for clinical accuracy.
