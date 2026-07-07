# QCAP · Developer Guide

> This is the top-level developer entry-point that complements
> [docs/DEVELOPER.md](docs/DEVELOPER.md) (deep technical reference).
> Read this file first for orientation, then dive into DEVELOPER.md and
> [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 10-minute orientation

QCAP is a **React 19 + Vite 7 + TypeScript** single-page app that:

- Uses **Firebase** (Auth + Firestore + Storage) when configured, and
  transparently falls back to a fully-featured `localStorage` demo mode
  when not.
- Bundles into **a single `dist/index.html`** via `vite-plugin-singlefile`
  so deployment is trivial.
- Ships as a **Progressive Web App** — installable, offline-capable,
  push-notification-ready.
- Supports **English, Arabic (RTL), Somali** — every UI string is
  translated at compile time via a typed `TranslationKey` union.

Total codebase: ~15 000 lines of TypeScript, ~730 translation keys per
language, ~110 modules.

---

## Repository map

```
qcap/
├── src/                     # Application source
│   ├── App.tsx              # Route table + top-level providers
│   ├── audio/               # MusicProvider (single global <audio>)
│   ├── components/          # Reusable UI + composed widgets
│   ├── config/firebase.ts   # Firebase SDK initialization
│   ├── data/seed.ts         # Demo-mode seed content
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Translations (EN/AR/SO)
│   ├── pages/               # One file per route
│   ├── services/            # Business logic + Firestore wrappers
│   ├── stores/              # Zustand global state
│   ├── theme/               # Theme provider
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Pure helpers (no React)
├── public/                  # Static assets (SW, manifest, icons)
├── branding/                # Design assets (placeholders)
├── docs/                    # Detailed technical reference
└── *.md                     # Top-level documentation
```

---

## Recommended reading order

1. **[README.md](README.md)** — project overview, quickstart
2. **[FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md)** — data model
3. **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** — Firebase provisioning
4. **[docs/DEVELOPER.md](docs/DEVELOPER.md)** — runtime architecture, state, services
5. **[CONTRIBUTING.md](CONTRIBUTING.md)** — coding standards
6. **[docs/CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md)** — MCQ/Case/OPD/Article authoring
7. **[SECURITY.md](SECURITY.md)** — auth, rules, XSS, dependencies
8. **[DEPLOYMENT.md](DEPLOYMENT.md)** — Cloudflare / GitHub / Firebase Hosting
9. **[PWA_SETUP.md](PWA_SETUP.md)** — manifest, SW, install, update

---

## Fast local development

```bash
npm install
npm run dev        # http://localhost:5173 — instant hot reload
npm run build      # dist/index.html + static assets
npm run preview    # preview the production build
```

**No `.env` required** for demo mode — everything works from seeded
localStorage. Add `.env.local` (copy from `.env.example`) only when you
want to connect a real Firebase project.

---

## Where things live

| I want to… | File |
|-----------|------|
| Add a new route | `src/App.tsx` (add `<Route>` + `lazy(() => …)`) + `src/components/Layout.tsx` (nav item) |
| Add a new translation string | `src/i18n/translations.ts` (add key to `TranslationKey` + EN/AR/SO values) |
| Add a new Firestore collection | `src/services/db.ts` (add to `CollName` + optional TTL) |
| Change theme / dark-mode | `src/theme/index.tsx` + Tailwind `dark:` classes |
| Add a new admin manager | `src/pages/Admin.tsx` (add `<Route>` + nav item + component) |
| Change branding logo at runtime | `/admin/branding` (no code) |
| Change permanent PWA icon | `public/icon.svg` (rebuild required) |
| Debug a Firestore write | Search browser console for `[dbService.set]` / `[ensureUserDoc]` |
| Understand a chat state | See `src/services/friendChat.ts` + `src/pages/FriendChat.tsx` |
| Rebuild the leaderboard | `/admin/leaderboard → Recalculate` |
| Ship a hotfix | Bump `VERSION` in `public/sw.js`, rebuild, redeploy |

---

## Non-obvious design decisions

### Why HashRouter instead of BrowserRouter?

Because the app bundles into a single file (`index.html`), any 404 from
the host would break deep links. HashRouter (`#/route`) avoids that entirely
and works out of the box on GitHub Pages, Cloudflare Pages, static S3, etc.

### Why per-collection cache TTLs?

To stay within Firebase's **Spark (free) plan** — 50 K reads/day is
generous but easy to burn through with naive real-time listeners. See
`src/services/db.ts` for the TTL matrix.

### Why is music stored in IndexedDB, not Firebase Storage?

To avoid users' personal music files eating into the app's Storage quota.
IndexedDB is client-only and unlimited on modern browsers.

### Why is there no automated test suite?

Deliberate — keeps the bundle ≤ 400 KB gzipped. Manual verification via
`/admin/review` (22-item Final Review Checklist). If you want tests, use
Vitest + React Testing Library (see [CONTRIBUTING.md](CONTRIBUTING.md#testing)).

### Why does the owner account self-heal?

To prevent lockout during Firestore migrations, rule changes, or accidental
demotion by another admin. See `ensureProtectedAdminDoc()` in
`src/services/auth.ts`.

### Why `initializeFirestore(app, { ignoreUndefinedProperties: true })`?

To handle optional AppUser fields (`whatsapp`, `photoURL`, `country`, …)
that may be `undefined` at write time. Without this flag, Firestore SDK v10+
throws `Unsupported field value: undefined`, which was previously silently
losing new user documents.

---

## Common troubleshooting

| Symptom | Where to look |
|---------|--------------|
| Blank page on a specific route | `ErrorBoundary` should show; check console |
| Firestore write fails silently | Now impossible — every error is logged with `[dbService.*]` prefix |
| Owner locked out | Self-heals on next login. If persistent, edit `users/admin_qaahir_super` in Firestore Console |
| Translation shows the key name | Add the missing translation in `src/i18n/translations.ts` |
| PWA doesn't install | DevTools → Application → Manifest — look for errors |
| SW cache stale | Bump `VERSION` in `public/sw.js`, redeploy |
| RTL layout broken | Use logical properties (`ps-*`, `pe-*`) instead of `pl-*`, `pr-*` |
| Music won't play | Requires a user gesture on first load (browser policy) |

---

## Release checklist

Before publishing a new version:

- [ ] `npm run build` completes with no warnings
- [ ] Bump SW `VERSION` in `public/sw.js`
- [ ] Update `CHANGELOG.md` under a new version heading
- [ ] Run through `/admin/review` — all 22 items pass
- [ ] Test install flow on a real Android device
- [ ] Test sign-in with Firebase Auth
- [ ] Verify email + password reset flows work
- [ ] Push to `main` — GitHub Actions deploys automatically

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for the full
pre-release verification.

---

## Contact

- Owner: **Dr. Qaahir** · `dr.qaahir90@gmail.com`
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security disclosures: [SECURITY.md](SECURITY.md)
