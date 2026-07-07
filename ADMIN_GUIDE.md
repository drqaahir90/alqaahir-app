# QCAP · Administrator Guide

> This file supplements [ADMIN_MANUAL.md](ADMIN_MANUAL.md) with a concise,
> task-oriented **quick reference**. Use ADMIN_MANUAL for the exhaustive
> module-by-module description; use this document for "how do I do X?".

---

## Table of contents

1. [First-time setup](#first-time-setup)
2. [Common tasks](#common-tasks)
3. [Emergency procedures](#emergency-procedures)
4. [Bulk operations cheat sheet](#bulk-operations-cheat-sheet)
5. [Rotating admin credentials](#rotating-admin-credentials)
6. [Handling abusive users](#handling-abusive-users)
7. [Deploying a content update](#deploying-a-content-update)
8. [Interpreting the audit log](#interpreting-the-audit-log)
9. [Monitoring and health](#monitoring-and-health)

---

## First-time setup

1. Deploy the app (see [DEPLOYMENT.md](DEPLOYMENT.md)).
2. Sign in with the owner account (`dr.qaahir90@gmail.com`). If it's your
   first launch, the account will be created on-the-fly.
3. Verify your email via the Firebase-sent link.
4. Complete the **Final Review Checklist** at `/admin/review`.
5. Configure your site name, support email, and brand colour at
   `/admin/settings`.
6. Upload your logo + favicon at `/admin/branding`.
7. Create your public About Us content at `/admin/about`.
8. Import your first batch of MCQs via `/admin/import`.
9. Announce launch via `/admin/notifications` (broadcast).

---

## Common tasks

### Add a new admin

1. `/admin/users` → find user → **Promote to admin**.
   *(Owner cannot be demoted; other admins can.)*

### Import 500 MCQs from a spreadsheet

1. Export your spreadsheet as CSV with the columns listed in
   [IMPORT_FORMATS.md](IMPORT_FORMATS.md).
2. `/admin/import` → select **MCQs** → upload file → **Validate**.
3. Fix any red errors, re-validate, then **Commit import**.
4. If the import went wrong, click **Rollback** immediately.

### Publish a new Health Education article

1. `/admin/education` → **＋ New article**.
2. Fill in title / body in all three languages (EN mandatory; AR + SO can
   fall back to EN but are strongly recommended).
3. Choose category, upload cover image.
4. Toggle **⭐ Featured** if it should appear in the featured strip.
5. **Publish** (or Save draft for later).

### Broadcast a maintenance notice

1. `/admin/notifications` → **＋ Send**.
2. Audience = **Broadcast**, Priority = **High** (or Urgent for outages).
3. Title + body in EN/AR/SO.
4. Optional image.
5. Send.

### Reset all XP + streaks (start-of-season)

1. `/admin/leaderboard` → **Reset all** → confirm.
   *(Warning: this deletes every `quizResults` document. Consider exporting
   first from `/admin/reports`.)*

### Give a bonus to a top learner

1. `/admin/streaks` → find user → **🎁 Award bonus**.
   *(Grants the XP amount configured under Streak rules.)*

### See who's misusing the platform

1. `/admin/audit` → filter by action prefix (`user.*` for moderation events).
2. `/admin/chats` → inspect any thread → **Delete** if abusive.

---

## Emergency procedures

### Locked out of the owner account

- The owner account **self-heals** on every login. Simply sign in again.
- If Firebase itself blocks sign-in, use Firebase Console →
  Authentication to reset the password.
- If the Firestore `users/admin_qaahir_super` document is missing or
  corrupt, edit it manually in Firestore Console to set
  `role: "admin"`, `status: "active"`.

### Data loss

Follow the **disaster-recovery runbook** in [BACKUP.md](BACKUP.md).

### Abusive user

1. `/admin/users` → find user → **⛔ Perm ban** with reason.
2. `/admin/chats` → delete offensive messages if present.
3. Consider updating **Firestore rules** to block future writes if the
   abuse pattern is systemic.

### Compromised admin account

1. Owner: `/admin/users` → demote the compromised admin immediately.
2. In Firebase Console → Authentication, disable the account.
3. Rotate any shared credentials.
4. Post-mortem: audit `/admin/audit` for the actor's actions.

---

## Bulk operations cheat sheet

| Manager | Bulk actions |
|---------|-------------|
| MCQ / Case / OPD / Article Managers | **New**, **Edit**, **Delete**, **Duplicate**, **Preview** (per item) |
| **Bulk Import** | Validate → Commit → Rollback across an entire JSON/CSV batch |
| **Notifications** | Broadcast to all users with one send |
| **Leaderboard Manager** | **Reset all** XP + quizResults · **Recalculate** from history · **Export CSV** |
| **Streak Manager** | **Reset all** streaks · Configure rules |
| **Demo Users** | Generate 1–50 · **Remove all** |
| **Audit Log** | Batch delete selected · **Clear all** |
| **User Manager** | **Export CSV** with UID + all profile fields |

---

## Rotating admin credentials

1. Owner: `/admin/users` → find the admin → **Demote** to user.
2. In Firebase Console → Authentication, disable the account.
3. Create a new Firebase Auth user for the replacement admin.
4. Owner: `/admin/users` → find the new user → **Promote**.
5. Log in as the new admin and verify access.

Never share the owner account. Every admin should have their own Firebase
Auth identity so `auditLogs` can distinguish who did what.

---

## Handling abusive users

### Warn (soft)

Purpose: put the user on notice.
```
/admin/users → open user → ⚠️ Warn → provide reason
```

### Suspend (medium)

Purpose: pause account without deleting data.
```
/admin/users → open user → ⏸ Suspend → provide reason
```

### Temporary ban

Purpose: sanction for a fixed period.
```
/admin/users → open user → ⏳ Temp ban → duration (days) + reason
```

### Permanent ban

Purpose: irreversible sanction.
```
/admin/users → open user → ⛔ Perm ban → reason
```

### Disable login

Purpose: preserve data but block access.
```
/admin/users → open user → 🚫 Disable login → reason
```

### Reactivate

Purpose: restore access after ban expiry or successful appeal.
```
/admin/users → open user → ✅ Reactivate → reason
```

All moderation actions are recorded in **`user.moderation[]`** and the
**Audit Log** with timestamp, admin uid, and reason.

---

## Deploying a content update

1. Author + validate content JSON locally.
2. Bulk import via `/admin/import` in **staging** first if you have one.
3. Verify visibility from the user's perspective (`/mcq`, `/cases`, `/opd`, `/education`).
4. Broadcast an announcement via `/admin/notifications`.
5. Monitor `/admin/audit` and `/admin/reports` for the next 24 hours to
   catch feedback / bug reports.

---

## Interpreting the audit log

Every entry has this shape:

```json
{
  "id": "…",
  "actorId": "admin_qaahir_super",
  "action": "user.warn",
  "target": "u_abcd1234",
  "meta": { "reason": "spamming chat", "expiresAt": null },
  "createdAt": 1730000000000
}
```

Common `action` prefixes:

| Prefix | Meaning |
|--------|---------|
| `user.*` | User moderation (promote, demote, warn, suspend, ban, reactivate, delete) |
| `mcqs.*`, `caseStudies.*`, `opdCases.*` | Content CRUD |
| `import.*` | Bulk import commits |
| `article.*` | Health Education CMS |
| `leaderboard.*` | Leaderboard reset / recalc / pin |
| `streak.*` | Streak resets / bonuses |
| `demo.*` | Demo-user generator |
| `about.*` | About Us CMS |
| `branding.update` | Branding assets applied |
| `notification.send` | Broadcast / personal / group notification sent |

Filter by action prefix in the browser DevTools Network tab (Firestore
queries), or export the whole log via **/admin/audit → Export**.

---

## Monitoring and health

- **Firebase Console → Firestore → Usage** — daily read/write counts,
  storage size.
- **Firebase Console → Authentication → Users** — active user count.
- **Cloudflare Pages / Firebase Hosting analytics** — page views, unique
  visitors, bandwidth.
- **In-app** — `/admin/reports` for learning-activity metrics.

Watch for:

- Firestore reads approaching **50 K/day** (Spark limit). If they do, the
  cache TTLs in `src/services/db.ts` may need tuning upward.
- Storage bucket approaching **5 GiB**. Chat attachments are the usual
  culprit — consider pruning old threads via `/admin/chats`.
- Auth signup spikes (bots?). Toggle **Allow registration** off in
  `/admin/settings` while investigating.

---

## Contact

For operational assistance, contact **Dr. Qaahir** —
`dr.qaahir90@gmail.com`.
