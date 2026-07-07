# Security policy

## Supported versions

| Version | Supported |
|---------|:---------:|
| 1.0.x   | ✅        |

## Reporting a vulnerability

If you discover a security issue in **QCAP · Qaahir Clinical Academy**,
please **do not** open a public GitHub issue. Instead:

1. Email the owner directly at **`dr.qaahir90@gmail.com`** with:
   - A clear description of the vulnerability
   - Steps to reproduce
   - Affected version / commit hash
   - (Optional) A proof-of-concept
2. You should receive an acknowledgement within **72 hours**.
3. We will investigate, prepare a fix, and coordinate disclosure with you.
4. Once patched, we'll credit the reporter (unless they prefer to remain
   anonymous) in `CHANGELOG.md`.

## Threat model & security posture

### Authentication

- All production authentication is delegated to **Firebase Auth** —
  QCAP never stores or processes passwords itself.
- **Email verification** is auto-sent on registration; a persistent banner
  reminds unverified users to complete the flow.
- **Password reset** uses Firebase's built-in `sendPasswordResetEmail`.
- The **protected owner account** (Dr. Qaahir) is hard-coded at the
  service layer to prevent lockout — see `src/services/auth.ts`.

### Authorization

- Every route is guarded by `<ProtectedRoute>` (and `adminOnly` for admin
  paths).
- **Server-side authorization** is enforced by **Firestore security rules**
  — the client is treated as untrusted. See
  [FIREBASE_SETUP.md § 7](FIREBASE_SETUP.md#7-deploy-security-rules) for
  the complete rule set.
- **Storage rules** restrict avatar uploads to the owning user and chat
  attachments to authenticated users only.

### Input validation

- Bulk-import payloads are validated field-by-field in the Admin dashboard
  before commit.
- Firestore's `ignoreUndefinedProperties: true` flag prevents `undefined`
  values from producing runtime errors.
- Client-side stripping of `undefined` in `dbService.set / add / update`
  provides defence in depth.

### XSS protection

- All localized text is rendered through React's default JSX escaping.
- **No `dangerouslySetInnerHTML`** is used anywhere in the codebase.
- User-generated content (chat messages, article bodies, notification
  bodies) is rendered as plain text with `whitespace-pre-wrap`.

### Content Security Policy

The default `_headers` file for Cloudflare / Netlify does not set a
custom CSP because the build inlines JS + CSS into `index.html` (via
`vite-plugin-singlefile`). If you require a strict CSP for regulatory
compliance, extract the inline scripts / styles first (edit
`vite.config.ts` to remove the plugin) and add:

```
Content-Security-Policy: default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com;
  font-src 'self' data:;
```

### Transport security

- HTTPS is enforced by the hosting layer (Cloudflare Pages, Netlify,
  Firebase Hosting) — the app itself does not accept `http://` origins
  for authenticated flows.
- **HSTS** is set to 1 year by `public/_headers`:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

### Client-side data

- **IndexedDB** stores the user's music files and unsaved learning sessions.
  These are local-only and never uploaded.
- **localStorage** stores user preferences (theme, language, sound
  settings, music state, notification preferences) and short-lived caches.
- Sensitive state (Firebase Auth tokens) is managed by the Firebase SDK
  itself; QCAP never reads it.

### Dependencies

- Every runtime dependency is pinned in `package.json`.
- `firebase`, `react`, `react-dom`, `react-router-dom`, `zustand`,
  `clsx`, `tailwind-merge` — all reputable, actively maintained packages.
- Run `npm audit` before every release; if a high-severity advisory
  affects a runtime package, patch or replace it immediately.

### Owner account

Dr. Qaahir's account (`dr.qaahir90@gmail.com`) is protected at the
`authService` layer:

- Cannot be demoted from `admin` (self-heals on every login).
- Cannot be warned, suspended, banned, disabled, or deleted.
- Cannot have `status` set to anything other than `"active"` on login.

If you fork QCAP and want to reassign ownership, update
`PROTECTED_ADMIN_EMAIL` in `src/services/auth.ts` **before** deploying.

### Auditing

Every administrative action produces an entry in the `auditLogs` collection
with actor uid, action name, target, and timestamp. Admins can review and
export these logs at `/admin/audit`.

### Rate limiting

Rate limiting is currently handled by Firebase's built-in
per-project quotas. For higher-scale deployments, consider putting the app
behind Cloudflare's WAF or adding a Cloud Function proxy for write-heavy
endpoints.

---

## Disclosure timeline (typical)

| Day | Action |
|-----|--------|
| 0   | Vulnerability reported |
| 1–3 | Acknowledgement sent, initial triage |
| 3–14| Patch developed, tested, reviewed |
| 14–21| Coordinated release + advisory published |
| 30  | Public disclosure on GitHub |

Critical vulnerabilities may be patched sooner.

---

## Contact

**Dr. Qaahir** · `dr.qaahir90@gmail.com`
