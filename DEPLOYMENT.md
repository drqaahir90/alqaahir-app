# MedAcademy — Deployment Guide

## Table of contents
1. [Prerequisites](#prerequisites)
2. [Environment variables](#environment-variables)
3. [Cloudflare Pages](#cloudflare-pages)
4. [GitHub Pages via Actions](#github-pages-via-actions)
5. [Firebase Hosting](#firebase-hosting)
6. [Firebase Spark (Free) plan optimization](#firebase-spark-free-plan-optimization)
7. [PWA / Android installation](#pwa--android-installation)

---

## Prerequisites

- Node.js 20+
- npm 10+
- A Firebase project (optional — the app runs in offline demo mode without it)

Install and build locally:

```bash
npm install
npm run build     # produces dist/
```

Everything is emitted into `dist/`. The primary application is inlined into
`dist/index.html`, and the following supporting assets are copied alongside it:

| File                         | Purpose                                  |
|------------------------------|------------------------------------------|
| `manifest.webmanifest`       | PWA manifest                             |
| `icon.svg`                   | App / splash icon                        |
| `sw.js`                      | Service worker (offline + push)          |
| `_headers`                   | Cloudflare / Netlify HTTP headers        |
| `_redirects`                 | SPA rewrite rule                         |
| `robots.txt`                 | Search-engine directives                 |

## Environment variables

Never commit secrets. Set these in your hosting provider or CI/CD:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

If any are missing, the app transparently falls back to **local demo mode**
(LocalStorage backend, seeded content). No feature breaks.

## Cloudflare Pages

1. Push the repository to GitHub.
2. In Cloudflare → Pages → *Create a project* → *Connect to Git*.
3. **Build settings**:
   - Framework preset: **None** (or Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20`
4. In **Settings → Environment variables**, add all `VITE_FIREBASE_*` values.
5. Deploy. Cloudflare automatically picks up `_headers` and `_redirects`.

HTTPS, HTTP/2, HTTP/3, Brotli compression and global CDN are enabled by default.

## GitHub Pages via Actions

A workflow is provided at `.github/workflows/deploy.yml`. Enable GitHub Pages
(**Settings → Pages → Source: GitHub Actions**) and add the `VITE_FIREBASE_*`
values as repository secrets.

## Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting          # public: dist   single-page app: yes
npm run build
firebase deploy --only hosting
```

## Firebase Spark (Free) plan optimization

The application is engineered to run comfortably within the Firebase Spark
limits (Firestore 50 K reads/day, 20 K writes/day, 1 GiB storage, 10 GiB egress
per month):

- **Read cache** – `dbService` caches every collection in `localStorage` with
  per-collection TTLs (subjects 1 h, MCQs/cases/OPD 15 min, articles 10 min).
  A user browsing the app for an entire session may trigger < 20 reads.
- **Shared realtime listeners** – chat and notifications use a single Firestore
  `onSnapshot` per collection, fanned out to N React components. This eliminates
  concurrent duplicate reads.
- **User-uploaded music lives in IndexedDB**, not Firebase Storage. Storage is
  reserved for avatars, chat attachments and notification images.
- **Aggressive image compression** – avatars, notification images and chat
  images are downscaled and re-encoded client-side before upload.
- **Batched moderation** actions and consolidated writes on the audit log.
- **HTTP cache** – the service worker caches the app shell so cold navigations
  are served entirely from the cache after the first visit.

## PWA / Android installation

The application is a full Progressive Web App:

- Valid **Web App Manifest** (`manifest.webmanifest`) with `standalone`,
  `theme_color`, `background_color`, name, `icons[]` (SVG + PNG hints), and
  `shortcuts[]` for MCQ / OPD / Cases.
- **Service Worker** for offline support and background push handling.
- **iOS support** via `apple-touch-icon` and `apple-mobile-web-app-*` tags.
- **Android** back-button intercepted while running in standalone mode to
  prevent accidental exit (see `src/hooks/useBackButton.ts`).
- **Media Session API** integration: hardware and Android notification media
  controls drive the built-in music player.

To install on Android: open the deployed site in Chrome, tap the menu, choose
**Install app**. On iOS: tap **Share → Add to Home Screen**.

---

© MedAcademy contributors. Licensed for educational use.
