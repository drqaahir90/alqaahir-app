# Contributing to QCAP

Thank you for your interest in improving **QCAP · Qaahir Clinical Academy**.
This project follows a small set of conventions to keep the codebase
consistent, safe, and production-ready.

---

## Table of contents

1. [Ground rules](#ground-rules)
2. [Development environment](#development-environment)
3. [Coding standards](#coding-standards)
4. [Commit hygiene](#commit-hygiene)
5. [Pull request workflow](#pull-request-workflow)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Reporting issues](#reporting-issues)

---

## Ground rules

QCAP is a **production platform** used by medical students and healthcare
professionals. Contributions must respect the following non-negotiables:

- **Backward compatibility** — never rename or remove existing Firestore
  fields, translation keys, routes, or admin actions. Add new fields as
  optional.
- **No secrets in commits** — `.env.local`, Firebase private keys, and any
  credentials must never be committed. `.gitignore` already excludes them.
- **No fake clinical content** — every MCQ, case, and OPD scenario must be
  authored or reviewed by a qualified clinician.
- **No breaking database schema changes.**
- **No console.log / debugger** in production code.

---

## Development environment

```bash
# Prerequisites: Node 20+, npm 10+
git clone https://github.com/<your-org>/qcap.git
cd qcap
npm install
cp .env.example .env.local    # (optional — leave empty for demo mode)
npm run dev
```

Open <http://localhost:5173>.

---

## Coding standards

### TypeScript

- **Strict mode** — every project file is checked. Fix errors, never suppress.
- **No `any`** — use `unknown` with a type guard, or model the shape with an
  interface. If a third-party library forces `any`, use a narrow type
  assertion at the boundary only.
- **No `// @ts-ignore` / `// @ts-expect-error`** — if you truly need to
  bypass the checker, prefer a narrow assertion and add a code comment
  explaining why.
- **No unused imports or variables** — TypeScript's `noUnusedLocals` and
  `noUnusedParameters` are enabled.

### React

- Functional components + hooks only.
- Prefer **`useMemo`** for derived values, **`useCallback`** for stable
  function identities passed to memoized children, **`React.memo`** for
  expensive pure components.
- Use `React.lazy` + `Suspense` for route-level splitting (already applied
  in `src/App.tsx`).
- Cleanup every subscription (`useEffect` returning a cleanup function).

### Styling

- Tailwind utility classes only. If you find yourself repeating a large
  utility group, extract a small component or a reusable class in
  `src/index.css`.
- **Dark mode** — always add `dark:` variants for colours.
- **RTL** — use logical properties (`start`/`end`, `ps-*` / `pe-*`)
  instead of `left`/`right`. Use the `.flip-rtl` utility for
  directional glyphs (arrows).

### File layout

```
src/
├── App.tsx           # Router + providers
├── main.tsx          # ReactDOM entry
├── audio/            # MusicProvider + related audio helpers
├── components/       # Reusable UI (ui.tsx primitives) + composed widgets
├── config/           # firebase.ts and other 3rd-party init
├── data/             # Seed data (demo mode)
├── hooks/            # Custom hooks
├── i18n/             # Translation dictionaries + provider
├── pages/            # One file per top-level route
├── services/         # Business logic + Firestore wrappers
├── stores/           # Zustand stores
├── theme/            # ThemeProvider
├── types/            # Shared TypeScript interfaces
└── utils/            # Pure helpers (no React)
```

### Naming

| Kind | Convention |
|------|-----------|
| Components / files | `PascalCase.tsx` |
| Hooks | `useXxx.ts` |
| Services | `xxxService` |
| Translation keys | `namespace.subKey.leaf` |
| Firestore collections | `camelCase` |

---

## Commit hygiene

- **Small, focused commits.** One conceptual change per commit.
- Follow **Conventional Commits** for the subject line:
  ```
  feat(mcq): resume in-progress quiz from IndexedDB
  fix(auth): repair /users/{uid} document if registration write failed
  docs: complete IMPORT_FORMATS with OPD schema
  chore: bump service worker cache version to v4
  ```
- Reference issues in the body when applicable (`Closes #123`).

---

## Pull request workflow

1. Fork → create a feature branch off `main`.
2. Make your changes; run `npm run build` locally — it must complete with
   zero errors and zero warnings.
3. Update relevant docs (`README.md`, `CHANGELOG.md`, others) in the same PR.
4. Open a PR against `main` with a clear title + description.
5. CI (GitHub Actions) will build the project and run any smoke tests.
6. A maintainer reviews. Address feedback and re-request review.

---

## Testing

QCAP does not ship an automated test suite (the bundle is optimized to
stay ≤ 400 KB gzipped). Every change must be **manually verified**:

- Sign in as admin + regular user.
- Walk through the **Final Review Checklist** at `/admin/review`.
- Test on a real Android device using Chrome DevTools' phone emulator at
  minimum.

If you'd like to add tests, use **Vitest** + **React Testing Library**:

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add a `test` script to `package.json` and configure Vitest in
`vite.config.ts`.

---

## Documentation

Every user-visible or admin-visible change must update the corresponding
doc:

| Change type | Update |
|-------------|--------|
| New page or feature | `README.md` + `USER_MANUAL.md` |
| Admin module change | `ADMIN_GUIDE.md` |
| Schema change | `FIRESTORE_SCHEMA.md` + `IMPORT_FORMATS.md` |
| Deployment / infra | `DEPLOYMENT.md` + `FIREBASE_SETUP.md` / `PWA_SETUP.md` |
| Any user-visible change | `CHANGELOG.md` under `[Unreleased]` |
| Branding assets | `BRANDING.md` + `branding/README.md` |

---

## Reporting issues

- **Bug reports** — via the in-app **Support chat** or GitHub Issues.
- **Security disclosures** — email the owner directly:
  `dr.qaahir90@gmail.com`. Do NOT open a public issue for security bugs.
  See [SECURITY.md](SECURITY.md) for details.
- **Feature requests** — GitHub Issues with the `enhancement` label.

---

Thank you for helping make QCAP better for the medical education community!
