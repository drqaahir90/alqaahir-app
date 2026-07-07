# QCAP · PWA Setup

Everything you need to know about installing, updating, and configuring
the QCAP Progressive Web App.

---

## Table of contents

1. [Files that make QCAP a PWA](#files-that-make-qcap-a-pwa)
2. [Manifest](#manifest)
3. [Icons](#icons)
4. [Service worker](#service-worker)
5. [Install prompts](#install-prompts)
6. [Offline behaviour](#offline-behaviour)
7. [Update flow](#update-flow)
8. [Android / iOS / desktop install](#android--ios--desktop-install)
9. [Push notifications](#push-notifications)
10. [Troubleshooting](#troubleshooting)

---

## Files that make QCAP a PWA

```
public/
├── manifest.webmanifest   # Web App Manifest (installability)
├── icon.svg               # App icon (192 × 192, 512 × 512 recommendation)
├── sw.js                  # Service worker (offline + push)
├── _headers               # Cache/security headers (Cloudflare Pages / Netlify)
└── _redirects             # SPA rewrite

src/
├── pwa.ts                 # Registers SW, falls back to inline manifest
└── hooks/useBackButton.ts # Android/PWA back-button UX
```

---

## Manifest

Located at `public/manifest.webmanifest`. Key fields:

```json
{
  "name": "QCAP · Qaahir Clinical Academy",
  "short_name": "QCAP",
  "description": "Master clinical medicine — MCQs, case-based learning, and OPD simulator.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui", "browser"],
  "orientation": "portrait",
  "background_color": "#0f172a",
  "theme_color": "#0d9488",
  "lang": "en",
  "dir": "auto",
  "categories": ["education", "medical", "productivity", "health"],
  "icons": [
    { "src": "./icon.svg",     "sizes": "any",     "type": "image/svg+xml", "purpose": "any maskable" },
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png",     "purpose": "any" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png",     "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "MCQ Bank",      "url": "./#/mcq" },
    { "name": "OPD Simulator", "url": "./#/opd" },
    { "name": "Case Studies",  "url": "./#/cases" },
    { "name": "Friends",       "url": "./#/friends" }
  ]
}
```

### To modify

Edit `public/manifest.webmanifest` directly, rebuild, and redeploy.

**Do not** rely on the runtime data-URL fallback (`src/pwa.ts` injects one
if the file is unreachable) for production — always ensure the real file is
served with `Content-Type: application/manifest+json`. This is handled
automatically by `public/_headers`.

---

## Icons

QCAP ships a **single SVG icon** (`public/icon.svg`) which browsers
rasterize on demand. This is the simplest maintainable approach.

For **Google Play Store TWA** or **App Store WKWebView wrapper**, you'll
need dedicated raster icons:

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192 × 192 | Android home screen |
| `icon-512.png` | 512 × 512 | Android splash / high-res |
| `icon-maskable-512.png` | 512 × 512 | Android adaptive icon (safe area = central 80%) |
| `apple-touch-180.png` | 180 × 180 | iOS home screen |

Place them in `public/` next to `icon.svg` and update the manifest icons
array.

You can override icons at runtime (no rebuild required) via
**Admin → Branding Manager**:

- **App icon** → sets `<link rel="apple-touch-icon">` and PWA install icon
- **Favicon** → sets `<link rel="icon">`

Uploaded images are stored as base64 data URLs in `siteSettings.branding`
(no Firebase Storage cost).

---

## Service worker

`public/sw.js` is a **hand-written service worker** (no Workbox
dependency) with three responsibilities:

### 1. Install — cache the app shell

```js
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
```

Called once when the SW installs. Uses `Promise.all(cache.add(...))` so
one missing asset doesn't block the entire install.

### 2. Fetch — cache-first for same-origin

- **Navigations** (`req.mode === "navigate"`) → serve the cached
  `index.html` (SPA offline shell), fall back to network
- **Same-origin GETs** → cache-first, network fallback, cache-populate on
  success
- **Third-party** (Firebase, etc.) → passthrough (SW does not intercept)

### 3. Push + notificationclick — see [notifications](#push-notifications)

### Cache versioning

The `VERSION` constant at the top of `sw.js` (currently `"medacad-v3"`)
identifies the cache. **Bump it** on every deploy that changes the cached
assets. On activate, all caches with different versions are deleted.

```js
const VERSION = "medacad-v4";   // ← bump this on release
```

---

## Install prompts

Chrome and Edge fire a `beforeinstallprompt` event when the site meets
[installability criteria](https://web.dev/install-criteria/):

- Served over HTTPS
- Manifest with `name`, `icons` (192 + 512), `start_url`, `display: standalone`
- Service worker with a `fetch` handler
- User has visited the site at least twice

QCAP satisfies all four out of the box. To customize the install prompt
UI, add a listener in `src/App.tsx`:

```ts
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault();
    // Save the event, show your own install button, then call:
    // (deferredEvent as { prompt: () => Promise<void> }).prompt();
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}, []);
```

---

## Offline behaviour

After the first visit:

- **App shell** (JS + CSS + HTML) is cached → the app opens instantly and
  works offline.
- **Static assets** (icons, manifest) are cached on first request.
- **Firebase reads** are cached by `dbService`'s TTL cache in `localStorage`;
  most navigation works without network for 5–60 minutes.
- **Firebase writes** while offline are queued by the Firestore SDK and
  synced when connectivity resumes (this is Firestore's default behaviour).
- **Media / chat attachments** fetched from Firebase Storage are **not**
  cached by the SW (we deliberately skip third-party origins).

To force offline-friendly caching of Firebase Storage, wrap those requests
in a `Cache API` intercept — not enabled by default because it can grow
storage unpredictably.

---

## Update flow

```
User loads app
   ↓
Browser fetches sw.js → compares with previously installed SW
   ↓
If different byte-for-byte:
   → New SW installs in background
   → 'updatefound' event fires
   → New SW sits in 'installed' state
   ↓
`nw.postMessage({ type: "SKIP_WAITING" })` triggers activation
   ↓
Next navigation uses the new SW + fresh assets
```

The `SKIP_WAITING` message is sent automatically by `src/pwa.ts`:

```ts
nw.addEventListener("statechange", () => {
  if (nw.state === "installed" && navigator.serviceWorker.controller) {
    try { nw.postMessage({ type: "SKIP_WAITING" }); } catch { /* ignore */ }
  }
});
```

Users see the update on their **next page navigation** — no forced reload,
no jarring UI.

For a stricter update flow (immediate refresh), listen to
`controllerchange` and call `location.reload()`.

---

## Android / iOS / desktop install

### Android (Chrome)

1. Open the deployed URL.
2. Tap the ⋮ menu → **Install app**.
3. QCAP appears on the home screen with the correct icon + splash.

### iOS (Safari)

1. Open the site in Safari.
2. Tap **Share** → **Add to Home Screen**.
3. Confirm the name (default: **QCAP**).

iOS has some limitations:

- No `beforeinstallprompt` event → no custom install button.
- Push notifications require iOS 16.4+ **and** the user must add the app
  to their home screen first.
- Splash screens must be provided per-device (see
  [`branding/splash/`](branding/splash/)).

### Desktop (Chrome / Edge)

1. Click the **install icon** in the address bar.
2. QCAP appears in the Start menu / Applications folder.
3. Launches in standalone mode (no browser chrome).

### Chromebook / Trusted Web Activity (TWA)

To publish QCAP to the Google Play Store as a TWA, use the
[Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://qcap.example.org/manifest.webmanifest
bubblewrap build
```

Follow the resulting `README.md` to sign and upload the APK.

---

## Push notifications

QCAP's SW handles the `push` event out of the box:

```js
self.addEventListener("push", (event) => {
  let payload = { title: "MedAcademy", body: "", url: "#/notifications" };
  try {
    if (event.data) {
      const raw = event.data.text();
      try { payload = { ...payload, ...JSON.parse(raw) }; }
      catch { payload.body = raw; }
    }
  } catch { /* ignore */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body, icon: "./icon.svg", badge: "./icon.svg",
    tag: payload.tag || "medacad",
    data: { url: payload.url },
  }));
});
```

Real remote push notifications (delivered even when the app is closed)
require:

1. **VAPID keys** — generate in Firebase Console → Cloud Messaging → Web configuration.
2. **A backend endpoint** (Cloud Function / Cloud Run) that sends the
   push via the FCM HTTP API — VAPID private keys must never live in the
   client bundle.

Without a backend, QCAP still delivers in-app notifications via the
`Notification` API on the active tab. See `src/services/notify.ts`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Install icon doesn't appear | Site doesn't meet installability criteria | Check DevTools → Application → Manifest for warnings |
| App opens in browser instead of standalone | Missing `display: standalone` in manifest | Verify `manifest.webmanifest` served correctly |
| Old version keeps loading | SW cache stale | Bump `VERSION` in `sw.js` and redeploy |
| Icons look pixellated on Android | Missing dedicated PNG icons | Add 192/512 PNG icons and update manifest |
| Offline shows blank page | SW didn't cache `index.html` on first visit | Visit the site once online, then test offline |
| Push notifications ignored | Permission denied or SW not registered | User must grant permission in Profile → 🔔 Push notifications |
| iOS refuses to install | Not opened in Safari | PWAs on iOS install only from Safari, not Chrome |

---

## Related documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — hosting configuration
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) — Firebase Cloud Messaging
- [BRANDING.md](BRANDING.md) — icon overrides at runtime
