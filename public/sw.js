/*
 * MedAcademy Service Worker
 *
 * Strategy:
 *   • App shell (index.html + inlined JS/CSS) cached on install.
 *   • Cache-first for our own origin (offline support).
 *   • Network-first with cache fallback for other GETs.
 *   • Handles `push` events (real push notifications when the app is closed).
 *   • Handles `notificationclick` to focus/open the correct page.
 *
 * The application is delivered as a single inlined index.html, so caching one
 * URL effectively caches the entire app.
 */

/* eslint-disable no-restricted-globals */

const VERSION = "medacad-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      // addAll fails fast if any resource is missing — swallow gracefully.
      Promise.all(CORE.map((url) => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Never intercept Firebase / third-party APIs
  if (!sameOrigin) return;

  // Skip navigation for hash routes — the shell responds
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) =>
        cached || fetch(req).catch(() => caches.match("./"))
      )
    );
    return;
  }

  // Cache-first for our own assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful basic responses
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// ─── Push notifications ───
self.addEventListener("push", (event) => {
  let payload = { title: "MedAcademy", body: "", url: "#/notifications" };
  try {
    if (event.data) {
      const raw = event.data.text();
      try { payload = { ...payload, ...JSON.parse(raw) }; }
      catch { payload.body = raw; }
    }
  } catch { /* ignore */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./icon.svg",
      badge: "./icon.svg",
      tag: payload.tag || "medacad",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.focus();
          if (target && "navigate" in w) {
            try { w.navigate(target); } catch { /* ignore */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

// Allow the page to trigger skipWaiting for smooth updates.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
