# QCAP · Firebase Setup Guide

Step-by-step instructions to connect QCAP to a fresh Firebase project.
When Firebase is not configured, QCAP falls back to a fully-featured demo
mode that runs entirely from `localStorage` — no setup required for local
evaluation.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Create the Firebase project](#1-create-the-firebase-project)
3. [Add a Web App](#2-add-a-web-app)
4. [Enable Authentication](#3-enable-authentication)
5. [Create Firestore](#4-create-firestore)
6. [Create Storage](#5-create-storage)
7. [Configure environment variables](#6-configure-environment-variables)
8. [Deploy security rules](#7-deploy-security-rules)
9. [Seed the owner account](#8-seed-the-owner-account)
10. [Enable Cloud Messaging (optional)](#9-enable-cloud-messaging-optional)
11. [Verify the connection](#10-verify-the-connection)
12. [Free-tier (Spark) tuning](#free-tier-spark-tuning)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A **Google account**
- **Node.js 20+** and **npm 10+** installed locally
- Firebase CLI (optional but recommended):
  ```bash
  npm install -g firebase-tools
  firebase login
  ```

---

## 1. Create the Firebase project

1. Open <https://console.firebase.google.com/>.
2. Click **Add project** → give it a name (e.g. `qcap-prod`).
3. Disable Google Analytics (optional — not used by QCAP).
4. Click **Create project**.

---

## 2. Add a Web App

1. In the project dashboard, click the **Web icon** `</>`.
2. Register the app with nickname `QCAP Web`.
3. **Do NOT** check "Firebase Hosting" here (unless you want to use it later).
4. Copy the configuration object shown — you'll paste those values into
   `.env.local` in the next section.

```js
// Example config (values are yours, not these)
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "qcap-prod.firebaseapp.com",
  projectId: "qcap-prod",
  storageBucket: "qcap-prod.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
};
```

---

## 3. Enable Authentication

1. **Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. (Optional) Enable **Google**, **Phone**, or other providers you plan to use.
4. Under **Templates**, customize the *Email address verification* and
   *Password reset* email templates (add your logo + brand color).
5. Under **Settings → Authorized domains**, add your production domain
   (e.g. `qcap.pages.dev`, `www.qcap.org`).

---

## 4. Create Firestore

1. **Firestore Database → Create database**.
2. Choose **Production mode**.
3. Choose the location closest to your users (e.g. `europe-west1` or
   `me-central1` for Somalia / Middle East users).
4. Click **Enable**.

QCAP does **not** require any collections to be pre-created — they're
created on demand as content is imported.

---

## 5. Create Storage

1. **Storage → Get started**.
2. Choose **Start in production mode**.
3. Choose the same location as Firestore.

Storage is used for **avatars**, **chat attachments**, and
**notification/education images** — all client-compressed before upload
to stay well within Spark limits.

---

## 6. Configure environment variables

Copy `.env.example` to `.env.local` and paste your Firebase config values:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=qcap-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qcap-prod
VITE_FIREBASE_STORAGE_BUCKET=qcap-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

**⚠️ Never commit `.env.local`.** It's excluded by `.gitignore`. On hosted
CI (GitHub Actions, Cloudflare Pages), add these as encrypted environment
variables in the host's dashboard.

---

## 7. Deploy security rules

### 7a. Firestore rules

Create `firestore.rules` at your project root:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    // ─── Public learning content ───
    match /mcqs/{id}              { allow read: if true;  allow write: if isAdmin(); }
    match /caseStudies/{id}       { allow read: if true;  allow write: if isAdmin(); }
    match /opdCases/{id}          { allow read: if true;  allow write: if isAdmin(); }
    match /educationArticles/{id} { allow read: if true;  allow write: if isAdmin(); }
    match /subjects/{id}          { allow read: if true;  allow write: if isAdmin(); }
    match /aboutBlocks/{id}       { allow read: if true;  allow write: if isAdmin(); }
    match /aboutSettings/{id}     { allow read: if true;  allow write: if isAdmin(); }
    match /siteSettings/{id}      { allow read: if true;  allow write: if isAdmin(); }

    // ─── Users ───
    match /users/{uid} {
      allow read:   if isSignedIn();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
      allow delete: if isAdmin();
    }

    // ─── Quiz results ───
    match /quizResults/{id} {
      allow read:  if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin() ||
        (isSignedIn() && resource.data.userId == request.auth.uid);
    }

    // ─── Notifications ───
    match /notifications/{id} {
      allow read:   if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    // ─── Chat ───
    match /chatThreads/{id} {
      allow read, update: if isAdmin() ||
        (isSignedIn() && (resource.data.userId == request.auth.uid ||
         (resource.data.participantIds != null && request.auth.uid in resource.data.participantIds)));
      allow create: if isSignedIn();
      allow delete: if isAdmin();
    }
    match /chatMessages/{id} {
      allow read, update: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.senderId == request.auth.uid;
      allow delete: if isAdmin() ||
        (isSignedIn() && resource.data.senderId == request.auth.uid);
    }

    // ─── Friends / challenges ───
    match /friendRequests/{id} {
      allow read, update: if isSignedIn() &&
        (resource.data.fromId == request.auth.uid || resource.data.toId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.fromId == request.auth.uid;
    }
    match /friendships/{id} { allow read, write: if isSignedIn(); }
    match /challenges/{id}  { allow read, write: if isSignedIn(); }

    // ─── Audit log (admin only) ───
    match /auditLogs/{id} { allow read, write: if isAdmin(); }
  }
}
```

Deploy with:

```bash
firebase deploy --only firestore:rules
```

### 7b. Storage rules

Create `storage.rules`:

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /branding/{file=**}      { allow read; allow write: if request.auth != null; }
    match /education/{file=**}     { allow read; allow write: if request.auth != null; }
    match /notifications/{file=**} { allow read; allow write: if request.auth != null; }
    match /avatars/{uid}/{file=**} { allow read; allow write: if request.auth != null && request.auth.uid == uid; }
    match /chat/{threadId}/{file=**} { allow read, write: if request.auth != null; }
  }
}
```

Deploy with:

```bash
firebase deploy --only storage
```

---

## 8. Seed the owner account

The **protected owner** account (`dr.qaahir90@gmail.com`) is auto-provisioned
on first sign-in. To sign in for the first time:

1. Deploy the app (or run locally with `npm run dev`).
2. Open the login page.
3. Click the **"Use demo admin"** button — this pre-fills Dr. Qaahir's
   credentials.
4. Click **Create account** (register mode) on first launch.
5. Verify the email via the Firebase-sent verification link.
6. Sign in — you'll be redirected to `/admin`.

The `ensureProtectedAdminDoc()` function in `src/services/auth.ts` guarantees
this account always has `role: "admin"` and `status: "active"`.

---

## 9. Enable Cloud Messaging (optional)

Web push notifications are entirely optional; QCAP works without them.

1. **Cloud Messaging → Get started**.
2. Under **Web configuration → Web Push certificates**, generate a **VAPID
   key pair**.
3. QCAP's built-in service worker (`public/sw.js`) already handles `push`
   events. If you want to send real remote push notifications, extend the
   `pushNotification()` helper in `src/services/notify.ts` to send an HTTP
   POST to the FCM `send` endpoint from a Cloud Function (backend key
   required — cannot be embedded in the client).

The current in-app notification system fires `Notification` API popups on
active tabs — no VAPID setup needed.

---

## 10. Verify the connection

1. Start the app: `npm run dev`.
2. Open <http://localhost:5173>.
3. Confirm that the **⚠️ demo banner is NOT visible** in the top bar.
4. Sign in with Dr. Qaahir's credentials.
5. Open **Admin → Overview** — you should see live user/MCQ/case counts.
6. Open **Admin → Audit Log** — every action you perform should appear.

---

## Free-tier (Spark) tuning

QCAP is engineered to stay comfortably within Spark limits:

| Limit | QCAP usage |
|-------|-----------|
| **50 K reads/day** | Typical daily browsing ≈ 500–2 000 reads thanks to per-collection cache (TTL 1 min – 1 hour) |
| **20 K writes/day** | Writes only happen on quiz submission, chat messages, admin content updates. Typical: 100–500/day |
| **1 GiB Firestore** | 1 000 MCQs ≈ 2 MB; 100 cases ≈ 5 MB; 100 OPD ≈ 10 MB → << 1 GiB |
| **5 GiB Storage** | Avatars + chat attachments compressed to <400 KB each |
| **10 GiB egress/mo** | Cloudflare Pages CDN caches the static bundle — negligible Firebase egress |

Tips to stay within limits:

- Keep the **read cache TTLs** in `src/services/db.ts` (do not lower them).
- Avoid deleting the shared subscription optimization in `subscribe()`.
- Use the **Bulk Import** rather than one-at-a-time UI creation for large
  content drops.
- Encourage users to enable **Music** which stores files in IndexedDB, not
  Firebase Storage.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Console error `Firebase: Error (auth/unauthorized-domain)` | Domain not authorized | Add your domain under **Authentication → Settings → Authorized domains** |
| `Missing or insufficient permissions` when reading | Rules block anonymous | Sign in first, or make read `if true` for the collection |
| `Missing or insufficient permissions` when writing | User is not admin | Check the user's Firestore `users/{uid}` document has `role: "admin"` |
| Storage `403` on upload | Storage rules not deployed | Run `firebase deploy --only storage` |
| Emails not delivered | Firebase Auth email template not configured | Configure sender name + reply-to under Authentication templates |
| **Quota exceeded** in first day | Real-time listeners not sharing | Verify `sharedSubs` in `src/services/db.ts` isn't disabled |
| Owner locked out | Someone changed the `users/admin_qaahir_super` doc | The next sign-in from Dr. Qaahir auto-heals. If needed, edit the doc manually in Firestore Console. |

---

## Removing Firebase (switching back to demo mode)

Simply remove the `VITE_FIREBASE_*` values from `.env.local` and rebuild:

```bash
rm .env.local
npm run build
```

The app will detect the missing config and revert to the localStorage
demo backend — all existing UI, features, and content behave identically.
