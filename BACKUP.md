# QCAP · Backup & Restore

Guidance for backing up and restoring QCAP data safely.

---

## What to back up

| Source | Contents | Method |
|--------|----------|--------|
| **Firestore** | All content + users + activity | Admin dashboard exports + Firebase native export |
| **Firebase Storage** | Uploaded avatars, chat attachments, notification/education images | `gsutil rsync` |
| **Site settings** | Branding, brand colour, streak rules | Included in Firestore backup (`siteSettings/main`) |
| **Local dev data** | Demo-mode content in your browser | Export via Admin dashboard |

---

## Admin-driven exports (no Firebase CLI needed)

Every content type provides an export from the admin dashboard:

| Route | Export button | Format |
|-------|---------------|--------|
| `/admin/users` | ⬇ **Export as CSV** | CSV with UID + full profile fields |
| `/admin/leaderboard` | ⬇ **Export CSV** | Ranked leaderboard snapshot |
| `/admin/reports` | ⬇ **Export all data** | JSON — users + quizResults aggregated |
| `/admin/review` | ⬇ **Export review report** | JSON — pre-launch checklist state |

Each **Bulk Import** manager also lets you copy the current data by
selecting all items and using the browser DevTools → Network → Response
export (an in-app JSON export is planned for a future release).

These exports are **fully self-contained** — you can restore any of them
by pasting into **Admin → Bulk Import**.

---

## Recommended: Firebase native export (Blaze plan required)

Firestore's native export runs server-side, is atomic, and does not consume
read quota. It requires the **Blaze (pay-as-you-go)** plan and a Cloud
Storage bucket.

### One-time setup

```bash
# 1. Install the Firebase CLI + Google Cloud CLI
npm install -g firebase-tools
# https://cloud.google.com/sdk/docs/install

# 2. Log in and select the project
firebase login
gcloud auth login
gcloud config set project qcap-prod

# 3. Create a dedicated backup bucket
gsutil mb -l europe-west1 gs://qcap-prod-backups
```

### Manual backup

```bash
gcloud firestore export gs://qcap-prod-backups/$(date +%F-%H%M%S)
```

### Automated daily backup

Create a **Cloud Scheduler job** that invokes a small Cloud Function each
day at 03:00 UTC:

```js
// functions/index.js
const admin = require("firebase-admin");
admin.initializeApp();
const client = new (require("@google-cloud/firestore").v1.FirestoreAdminClient)();
const BUCKET = "gs://qcap-prod-backups";
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;

exports.scheduledBackup = require("firebase-functions/v2/scheduler")
  .onSchedule("0 3 * * *", async () => {
    const dbName = client.databasePath(PROJECT_ID, "(default)");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    await client.exportDocuments({
      name: dbName,
      outputUriPrefix: `${BUCKET}/${stamp}`,
      collectionIds: [], // empty = all collections
    });
  });
```

Deploy with `firebase deploy --only functions`.

### Restore

⚠️ **A restore overwrites documents with the same paths.**

```bash
gcloud firestore import gs://qcap-prod-backups/2025-01-15-030000
```

Restore into a **fresh project first** to verify the backup before
overwriting production data.

---

## Storage backup

```bash
gsutil -m rsync -r gs://qcap-prod.appspot.com gs://qcap-prod-backups/storage-$(date +%F)
```

Restore:

```bash
gsutil -m rsync -r gs://qcap-prod-backups/storage-2025-01-15 gs://qcap-prod.appspot.com
```

---

## Local (demo mode) backup

Demo mode stores everything in `localStorage`. To export:

```js
// Run in the browser DevTools console
const dump = {};
for (const k of Object.keys(localStorage)) dump[k] = localStorage.getItem(k);
copy(JSON.stringify(dump));
```

To restore, paste the JSON in the DevTools console:

```js
const restore = /* paste JSON here */;
for (const [k, v] of Object.entries(restore)) localStorage.setItem(k, v);
location.reload();
```

---

## Retention policy (recommended)

| Backup type | Frequency | Retention |
|-------------|-----------|-----------|
| Firestore native | Daily (Cloud Scheduler) | 30 days |
| Firestore native | Weekly | 90 days |
| Firestore native | Monthly | 12 months |
| Storage rsync | Weekly | 30 days |
| Admin CSV / JSON export | Before every content release | Indefinitely (small, version-controlled if you commit them) |

---

## Testing your backups

Every quarter, verify that a backup actually restores:

1. Create a new Firebase project (`qcap-dr`).
2. Point QCAP at it via `.env.local`.
3. Run `gcloud firestore import` against the latest backup.
4. Sign in as owner + admin + regular user. Verify:
   - Users list is complete
   - MCQs / Cases / OPD / Articles all present
   - Chat threads intact
   - Leaderboard ranks match production

If any check fails, investigate the backup process before an actual
disaster forces you to.

---

## Disaster-recovery runbook

1. **Detect** — Firebase Console → Firestore → Data → confirm data loss.
2. **Freeze writes** — enable **Maintenance mode** at
   `/admin/settings` (blocks in-app writes; user-visible read-only banner).
3. **Restore** — `gcloud firestore import gs://qcap-prod-backups/<snapshot>`.
4. **Verify** — open the app in an incognito tab; walk through the Final
   Review Checklist.
5. **Unfreeze** — disable maintenance mode.
6. **Post-mortem** — write a short RCA and file it in a private repo.

---

## Contact

For backup / restore assistance, contact **Dr. Qaahir** —
`dr.qaahir90@gmail.com`.
