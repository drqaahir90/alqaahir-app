# QCAP · Developer Documentation

Detailed technical reference. For a high-level overview see [README.md](../README.md).

## Table of contents

1. [Runtime architecture](#runtime-architecture)
2. [State management](#state-management)
3. [Data flow](#data-flow)
4. [Auth service — internals](#auth-service--internals)
5. [Database service — cache design](#database-service--cache-design)
6. [Real-time chat internals](#real-time-chat-internals)
7. [Friend & Challenge state machines](#friend--challenge-state-machines)
8. [Notification pipeline](#notification-pipeline)
9. [Music player internals](#music-player-internals)
10. [Theme & i18n providers](#theme--i18n-providers)
11. [Build & bundling](#build--bundling)
12. [Testing strategy](#testing-strategy)
13. [Adding new features](#adding-new-features)

---

## Runtime architecture

QCAP is a single-page React application. On boot:

```
main.tsx  →  ReactDOM.createRoot(#root)
         →  <StrictMode>
              <ThemeProvider>            // dark/light/system, persists to localStorage
                <LanguageProvider>       // EN/AR/SO, persists to localStorage
                  <HashRouter>
                    <App />
                  </HashRouter>
                </LanguageProvider>
              </ThemeProvider>
            </StrictMode>
```

`<App>` initializes:

- `dbService.init()` → seeds demo content on first launch (if no Firebase)
- `ensureProtectedAdminDoc()` → guarantees the owner exists
- `setupPWA(...)` → registers the service worker + injects manifest fallback
- Loads branding from `siteSettings` and applies CSS custom properties
- Subscribes to `authService.onChange` via Zustand

Routes are lazy-loaded via `React.lazy` + `<Suspense>`. `<ErrorBoundary>`
wraps everything below the router.

---

## State management

**Zustand** (in `src/stores/index.ts`):

```ts
useAuthStore()   // { user, loading, init, setUser, logout }
useUIStore()     // { sidebarOpen, toggleSidebar, setSidebar, toast, showToast }
```

**Context providers** for cross-cutting concerns:

- `ThemeProvider` — theme mode + resolved theme
- `LanguageProvider` — current language + `t()` / `tr()` helpers
- `MusicProvider` — global playback state (single `<audio>` element)

No Redux. No React Query. All server state is fetched via `dbService` which
uses its own cache layer.

---

## Data flow

```
Component
   │  useEffect(() => dbService.subscribe("collection", setState))
   ▼
dbService.subscribe(coll, cb)
   │  ┌─ if Firebase: shared onSnapshot per collection, N callbacks fan-out
   │  │  cached snapshot delivered synchronously to new subscribers
   │  └─ else: subscribeLocal() + localStorage change events
   ▼
Firestore ⇄ localStorage cache
```

Writes:

```
Component → dbService.set|add|update|remove
                ↓
     invalidateCache(coll)
                ↓
     onSnapshot triggers → all subscribers re-render with fresh data
```

---

## Auth service — internals

`src/services/auth.ts`:

| Function | Purpose |
|----------|---------|
| `register(email, pw, name, whatsapp)` | Creates Firebase Auth user + Firestore `/users/{uid}` doc. Sends email verification. |
| `login(email, pw)` | Firebase Auth. Reads user doc. Auto-heals owner role. |
| `logout()` | Signs out. Clears `medacad.auth.user` from localStorage. |
| `onChange(cb)` | Fires on auth state change. Auto-heals owner role. |
| `resendVerification()` | Fires `sendEmailVerification` for the current Firebase user. |
| `resetPassword(email)` | Fires `sendPasswordResetEmail`. |
| `isEmailVerified()` | `auth.currentUser?.emailVerified`; returns `true` in demo mode. |
| `isProtectedAdmin(u)` | True for Dr. Qaahir. Used across UI to disable moderation. |

### Owner protection

`PROTECTED_ADMIN_EMAIL` is checked in five places:

1. `ensureUserDoc` — enforces `role: "admin"`, `status: "active"` on merge
2. `login` — repairs role if a rogue write demoted them
3. `onChange` — same self-heal on every auth state change
4. `AdminUsers.setRole` — refuses to demote
5. `AdminUsers.applyModeration` — refuses all sanctions

---

## Database service — cache design

`src/services/db.ts` uses **three-tier caching**:

1. **In-memory `Map<CollName, CacheEntry>`** — instant reads
2. **`localStorage`** — persists across sessions/tabs
3. **Firestore** — source of truth

TTLs per collection are defined in `CACHE_TTL`. On cache miss:

```
readCache(coll) → null
   ↓
Firestore getDocs(coll) → docs
   ↓
writeCache(coll, docs)   [both mem + localStorage]
   ↓
return docs
```

### Shared subscriptions

Every `subscribe(coll, cb)` in Firebase mode looks up (or creates) a single
`SharedSub` for that collection. Multiple components share one `onSnapshot`.
When the last subscriber leaves, the listener is detached to save reads.

### Demo mode

Every method has a `localStorage` fallback path guarded by `isFirebaseConfigured`.
The `emitChange` fan-out simulates real-time updates within a single tab.

---

## Real-time chat internals

**Two chat types**, both stored in the same collections:

| Type | Distinguisher | Route |
|------|--------------|-------|
| Support | `kind === undefined` OR `kind === "support"` | `/support` |
| Friend  | `kind === "friend"` + `participantIds[2]` | `/friends/chat/:uid` |

### Message state machine

```
sent → delivered → seen
```

- `status: "sent"` — written by sender
- Auto-upgrade to `"delivered"` after 300 ms on the sender's tab
- Receiver's tab marks `status: "seen"` + appends to `seenBy[]` when the
  message becomes visible in their scroll viewport

### Typing indicator

Sender's tab writes `typingBy: uid, typingAt: Date.now()` on `ChatThread`
(rate-limited to once per 1.5 s). Peer's tab checks `Date.now() - typingAt < 3000`.

### Online status

Each active tab writes `lastActiveAt: Date.now()` on the user's doc every 30 s.
Peer status is inferred:
- `< 2 min` → 🟢 Online now
- `< 15 min` → 🟡 Recently active
- Else → ⚪ Offline

### Attachments

Uploaded to Firebase Storage under `chat/{threadId}/{ts}_{filename}`.
Images are compressed client-side to max 1200 px before upload.

---

## Friend & Challenge state machines

### FriendRequest

```
pending ── accept ──▶ accepted   (+ writes /friendships/{pairId}, updates both users' friends[])
   │
   ├── decline ────▶ declined
   │
   └── cancel ─────▶ canceled
```

`pairId = [a, b].sort().join("__")` ensures deterministic friendship doc IDs
without duplicates.

### Challenge

```
                 accept
       pending ────────▶ active ──▶ (both submit results)
          │                             │
          │                             ▼
          │                          completed  (winner computed: highest score,
          │                                       tiebreak = fastest time)
          │
          ├── decline ───▶ declined
          └── cancel ────▶ canceled
```

Both users receive the **same `questionIds[]`** — sampled deterministically
from `mcqs` matching the spec (`subjectId`, `difficulty`, `count`).

After both submit → auto-writes a 🏆 summary message into the friend chat
and pushes a `challenge_result` notification to each participant.

---

## Notification pipeline

```
pushNotification({ kind, audience, userId, title, body, link, ... })
              │
              ├──▶ dbService.add("notifications", doc)   [always]
              │
              └──▶ if recipient is current tab user:
                     showNotification({...})
                        ├──▶ SW.showNotification (survives closed tab)
                        └──▶ new Notification (fallback for in-page)
```

User preferences read from `localStorage.medacad.notif.prefs`:

```json
{
  "enabled": true,
  "categories": {
    "announcement": true,
    "personal": true,
    "reminder": true,
    "achievement": true
  }
}
```

`kind → UI category` mapping in `services/notify.ts`:

| `kind` | UI category |
|--------|-------------|
| `announcement` | announcement |
| `personal`, `friend_request`, `friend_accept`, `message` | personal |
| `challenge_invite`, `challenge_result`, `achievement` | achievement |
| `reminder` | reminder |

---

## Music player internals

`src/audio/MusicProvider.tsx`:

- One global `<Audio>` element (`useRef`) — survives all navigation
- Track list persisted in **IndexedDB** (`src/utils/idb.ts`) — zero Firebase Storage cost
- Blob URLs created on `loadTrack`, revoked on next load / unmount
- **Media Session API** integration: title, play/pause/next/prev handlers
  so Android media notification + hardware keys work
- State persisted to `localStorage`:
  - `medacad.music.enabled`
  - `medacad.music.currentId`
  - `medacad.music.vol`
  - `medacad.music.order` (playlist ordering)
  - `medacad.music.repeat` (off/all/one)
  - `medacad.music.shuffle`

The UI is a **fixed-position button** in the top bar (`MusicButton.tsx`) that
opens a dropdown; no floating draggable element blocks page content.

---

## Theme & i18n providers

### ThemeProvider (`src/theme/index.tsx`)

- Reads `medacad.theme` → `"light" | "dark" | "system"`
- On `system`, subscribes to `matchMedia("(prefers-color-scheme: dark)")`
- Toggles `.dark` class on `<html>` (Tailwind v4 uses class-based dark mode
  via `@custom-variant`)
- Updates `<meta name="theme-color">` to match

### LanguageProvider (`src/i18n/index.tsx`)

- Reads `medacad.lang` → `"en" | "ar" | "so"` (auto-detects from
  `navigator.language` on first visit)
- Sets `<html lang>` and `<html dir>` (`rtl` for Arabic)
- Exposes:
  - `t(key, vars?)` — string lookup with `{var}` interpolation
  - `tr(text: LocalizedText)` — resolves a `{ en, ar, so }` object

Types are enforced: `t("unknown.key")` fails at compile time thanks to the
`TranslationKey` union.

---

## Build & bundling

`vite.config.ts` uses the **`vite-plugin-singlefile`** plugin so the entire
JS + CSS bundle is inlined into `dist/index.html`. This makes deployment
trivially portable:

- Copy `dist/` anywhere
- No `/assets/*` chunks to worry about caching
- The SW still caches the shell for offline use

Trade-off: initial load is one large file (~1.4 MB gzipped ~390 KB). Gzip/Brotli
+ HTTP/2 make this negligible on modern connections.

**Public assets** (`public/`) are copied verbatim into `dist/`:
`manifest.webmanifest`, `icon.svg`, `sw.js`, `_headers`, `_redirects`,
`robots.txt`.

---

## Testing strategy

The project is production-verified via:

1. **TypeScript strict mode** — catches ~80 % of bugs at compile time
2. **ErrorBoundary** — user-level fallback for render errors
3. **Defensive normalization** — `normalizeCase()` in Cases.tsx handles
   corrupted/incomplete data without crashing
4. **Manual QA checklist** — `/admin/review` walks the admin through 22
   critical modules before deployment

No automated test suite ships (deliberate — keeps the bundle minimal). If
you want to add tests, use **Vitest** + **React Testing Library**:

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Then add `vitest` to `vite.config.ts` and create `src/__tests__/*.test.tsx`.

---

## Adding new features

### 1. Add a new user-facing page

```tsx
// src/pages/MyPage.tsx
export default function MyPage() {
  const { t } = useI18n();
  return <div>{t("myPage.title")}</div>;
}
```

```tsx
// src/App.tsx
const MyPage = lazy(() => import("@/pages/MyPage"));
// …
<Route path="my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

```tsx
// src/components/Layout.tsx  (inside useNavItems)
{ to: "/my-page", label: t("nav.myPage"), icon: "🌟" }
```

Add `nav.myPage` + `myPage.title` translation keys in `src/i18n/translations.ts`.

### 2. Add a new admin manager

```tsx
// src/pages/Admin.tsx  (inside <Routes>)
<Route path="my-manager" element={<MyManager />} />

// menu item
{ to: "/admin/my-manager", label: t("admin.myMgr"), icon: "🛠️" }

// overview card
{ label: t("admin.myMgr"), value: 0, icon: "🛠️", tone: "teal", to: "/admin/my-manager" }
```

### 3. Add a new Firestore collection

```ts
// src/services/db.ts
export type CollName = ... | "myCollection";

// Optional: add a TTL entry
const CACHE_TTL: Partial<Record<CollName, number>> = {
  ...
  myCollection: 5 * 60 * 1000,   // 5 min
};
```

### 4. Add a new notification type

```ts
// src/types/index.ts
export type NotifKind = ... | "my_new_event";

// src/services/notify.ts  (inside mapToUiCategory)
case "my_new_event": return "achievement";  // or "personal", etc.
```

Then call `pushNotification({ kind: "my_new_event", ... })` anywhere.

### 5. Add a new language

1. Add the language code to `Lang` in `src/types/index.ts`:
   ```ts
   export type Lang = "en" | "ar" | "so" | "fr";
   ```
2. Add an entry in `LANGS` in `src/i18n/index.tsx`:
   ```ts
   { code: "fr", label: "Français", flag: "🇫🇷" }
   ```
3. In `src/i18n/translations.ts`, add a full `fr: Dict = { ... }` object and
   include it in `dictionaries`.
4. TypeScript will force you to translate every key.

---

## Contact

For questions about internals, contact the owner: **Dr. Qaahir**
(`dr.qaahir90@gmail.com`).
