# QCAP · Administrator Manual

Practical operating guide for the QCAP admin dashboard. Written for
non-developers who need to run the platform day-to-day.

---

## Table of contents

1. [Getting started as admin](#getting-started-as-admin)
2. [The admin dashboard](#the-admin-dashboard)
3. [User Manager](#user-manager)
4. [MCQ Manager](#mcq-manager)
5. [Case Study Manager](#case-study-manager)
6. [OPD Manager](#opd-manager)
7. [Health Education CMS](#health-education-cms)
8. [Leaderboard Manager](#leaderboard-manager)
9. [Streak Manager](#streak-manager)
10. [Demo Users](#demo-users)
11. [Reports](#reports)
12. [Bulk Import](#bulk-import)
13. [Notification Manager](#notification-manager)
14. [Chat Manager](#chat-manager)
15. [Branding Manager](#branding-manager)
16. [About Us Manager](#about-us-manager)
17. [Audit Log](#audit-log)
18. [Settings](#settings)
19. [Final Review Checklist](#final-review-checklist)
20. [Best practices](#best-practices)

---

## Getting started as admin

1. Open the sign-in page and enter your credentials.
2. If you're **Dr. Qaahir** (`dr.qaahir90@gmail.com`), the login button will
   automatically redirect you to the **Admin Dashboard**.
3. Any account promoted to `admin` role can also access `/admin` and its
   sub-routes. Regular users receive a `404`-style redirect back to `/`.

### The owner account

Dr. Qaahir's account is **protected**:

- Cannot be demoted (the *Demote* button is hidden — a 🔒 OWNER badge is shown).
- Cannot be warned, suspended, banned, disabled, or deleted.
- Self-heals on every sign-in — if any rogue write demotes the account,
  the system silently restores `role: admin` and `status: active`.

---

## The admin dashboard

**Route:** `/admin`

The dashboard is a **click-through grid of 20+ management modules**. Every
card is a shortcut to its dedicated manager. Statistics update on load.

Modules are grouped conceptually:

- **Content**: MCQ Manager · Case Study Manager · OPD Manager · Health Education CMS · Bulk Import
- **Community**: User Manager · Leaderboard Manager · Streak Manager · Demo Users
- **Communication**: Notification Manager · Chat Manager
- **System**: Branding Manager · About Us Manager · Settings · Audit Log
- **Analytics**: Reports
- **Pre-launch**: Final Review

---

## User Manager

**Route:** `/admin/users`

**What you see:** Every registered user with **UID · full name · avatar ·
email · phone · country · registration date · status · role · last seen**.
Click any user to open the details modal.

### Common actions

| Action | Where | Result |
|--------|-------|--------|
| Find a user | Search box | Filters by username or email |
| Filter by status | Dropdown | active / warned / suspended / banned / disabled / deleted |
| Copy a user's UID | Click the UID column | UID is copied to clipboard |
| Export all filtered users | ⬇ *Export CSV* button | Downloads `qcap-users-{date}.csv` |
| Promote a user to admin | Row action → *Promote* | User can now access `/admin` |
| Demote an admin | Row action → *Demote* | Loses admin access (owner exempt) |
| Warn a user | Details → ⚠️ *Warn* | Increments `warnings` counter, records reason |
| Suspend a user | Details → ⏸ *Suspend* | Sets `status: suspended`, records reason |
| Temporary ban | Details → ⏳ *Temp ban* | Choose duration in days; user cannot access after expiry |
| Permanent ban | Details → ⛔ *Perm ban* | Sets `status: banned` indefinitely |
| Disable login | Details → 🚫 *Disable login* | User can't sign in until reactivated |
| Reactivate | Details → ✅ *Reactivate* | Restores `status: active` |
| Delete account | Details → 🗑 *Delete account* | Marks `status: deleted` (soft delete) |
| View moderation history | Details → *Moderation history* | Every action with reason, admin name, date |
| View login history | Details → *Login history* | Last 20 logins with IP/UA when available |

### Every moderation action is recorded in the Audit Log with a reason field.

---

## MCQ Manager

**Route:** `/admin/mcqs`

Manage the MCQ bank one item at a time. For batch operations use
**Bulk Import**.

- ➕ **New** — creates an MCQ from the template
- ✏️ **Edit** — JSON editor (all fields preserved)
- 🗑 **Delete** — with confirmation
- ⧉ **Duplicate** — clones with a new ID
- 👁 **Preview** — pretty-printed JSON view
- 🔍 **Search** — filters by any text within the MCQ

Schema reference: [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md#-mcqs)

---

## Case Study Manager

**Route:** `/admin/cases`

Same operations as MCQ Manager, applied to `caseStudies`.

**Golden rule**: the **title must be neutral** (must not reveal the diagnosis).
Example:

- ❌ *"Acute STEMI"*
- ✔️ *"Chest pain in a 62-year-old smoker"*

---

## OPD Manager

**Route:** `/admin/opd`

Manage OPD encounters. Beyond the core required fields you can populate the
full clinical schema (HPI, PMH, PSH, medications, allergies, family/social
history, ROS, exams, labs, imaging, ECG, clinical images, learning points,
follow-up) — see [CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md#opd-case-authoring--full-clinical-schema).

If you don't provide explicit `diagnosisOptions` and `managementOptions`,
the simulator auto-generates 4 MCQ choices from the correct answer +
differentials from other cases.

---

## Health Education CMS

**Route:** `/admin/education`

Editorial workflow for public educational articles.

| Action | Result |
|--------|--------|
| ➕ New article | Empty editor opens |
| Draft | Only visible to admin |
| Publish | Immediately visible on `/education` |
| Unpublish | Hides from users; retains content |
| Archived | Hidden but preserved for future republish |
| ★ Featured | Article appears in the ⭐ Featured strip |
| Cover image | Upload compressed image to Firebase Storage |

The public **Education** page shows only articles with `status: "published"`
(or missing status for backward compatibility).

---

## Leaderboard Manager

**Route:** `/admin/leaderboard`

Global admin view of every learner's XP, quizzes, accuracy, streak, country,
and pin status.

Available actions:

- **Recalculate** — recomputes XP from `quizResults` (10 XP × correct answers)
- **Reset all** — zeroes XP + streak for every user and deletes all quiz
  results (requires confirmation)
- **Pin / Unpin** — pinned users float to the top of the public leaderboard
- **Export CSV** — full ranked list with all fields
- **Filter** — All users / Real users only / Demo users only
- **Search** — by username

---

## Streak Manager

**Route:** `/admin/streaks`

Overview cards: **Active learners · Longest streak · Average streak · Inactive
(7+ days)**.

**Streak rules** (persisted in `siteSettings/main`):
- **Enabled** — global on/off switch
- **Bonus XP per streak day** — awarded when a user increments their streak
- **Reset after N days of inactivity**

Per-user actions:

- **+1 Restore** — increments the user's streak by 1
- **🎁 Award bonus** — grants the configured bonus XP
- **🗑 Reset** — zeroes this user's streak

**Reset all streaks** — bulk operation with confirmation.

---

## Demo Users

**Route:** `/admin/demo`

Generate realistic sample profiles for testing the leaderboard, friend
system, and challenges — without polluting real user data.

- Choose **how many** (1–50) users to generate.
- Each demo user gets: DiceBear avatar, country ISO code, realistic XP
  (200–4 000), streak, quiz history.
- All demo users are flagged `isDemo: true` and clearly badged **DEMO** in
  every UI surface (leaderboard, friends search, admin tables).
- **Remove all** purges only demo users + their quiz results — real
  accounts are untouched.

---

## Reports

**Route:** `/admin/reports`

Aggregate learning-activity metrics:

- **By difficulty** — count + accuracy per level
- **By activity type** — MCQ / case / OPD / challenge counts
- **Overview** — total users, total quizzes, correct answers, questions answered
- **Export** — downloads `qcap-report.json` with the full dataset

---

## Bulk Import

**Route:** `/admin/import`

Efficient way to onboard large content sets.

### Workflow

1. **Select content type**: MCQs / Case Studies / OPD Cases / Articles
2. **Paste JSON or upload a file** (`.json`, `.csv`, `.txt`)
3. Click **Template** to insert a starter payload
4. Click **Validate**:
   - **Ready** ✅ — records that will be imported
   - **Duplicates** 🟡 — records skipped because their ID already exists
   - **Errors** 🔴 — validation failures with row numbers
5. Click **Commit import** — writes to Firestore
6. **Rollback** — reverts the *last* import in one click

CSV format supported for MCQs only. See
[IMPORT_FORMATS.md](IMPORT_FORMATS.md) for column details and full JSON
schemas.

---

## Notification Manager

**Route:** `/admin/notifications`

Send announcements to users.

### Fields

- **Audience**:
  - **Broadcast** — every user
  - **Personal** — one user (search by name/email)
  - **Group** — multiple users (multi-select)
- **Priority**: Low / Normal / High / Urgent (affects visual weight)
- **Title / Body** — in all three languages (EN required; AR/SO fall back to EN)
- **Image** — optional, uploaded to Firebase Storage

Every notification is written to `/notifications` and pushed to recipients'
tabs in real time. Recipients with **OS notifications enabled** in their
profile also receive a system push.

---

## Chat Manager

**Route:** `/admin/chats`

Moderation view of every chat thread — **support tickets** and **friend
chats** alike.

| Action | Effect |
|--------|--------|
| Click a thread | Inspect its full message history |
| Open/Close/Reopen | Toggle the thread's `status` |
| Delete | Removes the thread + all its messages (requires confirmation) |

Threads are sorted by `lastMessageAt` descending; you always see the
most-recent conversations first. Type + status badges make it easy to
distinguish support requests from user-to-user chats.

---

## Branding Manager

**Route:** `/admin/branding`

Change the site's visual identity without editing source code.

### Slots

- **Main logo** — used in the top bar (auto-picks Dark or Light variant if provided)
- **Dark-mode logo**
- **Light-mode logo**
- **App icon** (512 × 512 PNG for PWA install)
- **Favicon**
- **SVG logo** (legacy)

### Input methods

- 📎 **Upload file** — image is base64-encoded and stored in `siteSettings`
  (no Firebase Storage cost)
- 🌐 **Paste URL** — GitHub `github.com/.../blob/...` URLs auto-convert to
  raw asset URLs; the image is fetched, validated, converted to a data URL,
  and previewed

Click **Apply branding** to persist. Favicon + app icon update immediately;
logos reload on next navigation.

---

## About Us Manager

**Route:** `/admin/about`

Multi-block CMS for the public `/about` page.

### Block types

- **Hero** — full-width header with image + title + body
- **Section** — standard text section
- **Mission** — with 🎯 icon
- **Vision** — with 👁️ icon
- **Contact** — email, phone, website, address
- **Social** — Facebook, Twitter/X, Instagram, LinkedIn, YouTube, WhatsApp

### Actions

- Create, edit, delete, reorder (↑↓), publish/unpublish per block
- **Organization details** — orgName, orgLogo, contact email/phone/website/address, social links (fallback if no dedicated contact/social blocks)
- **Preview public page** — opens `/about` in a new tab

All block content supports **English, Arabic, and Somali**.

---

## Audit Log

**Route:** `/admin/audit`

Every admin action produces an audit entry with **date · actor · action · target**.

### Actions

- **Select all** / **Select selected rows** — checkboxes
- **Delete selected** — batch removal (with confirmation)
- **Clear all logs** — permanently deletes every entry (with confirmation)
- Per-row 🗑 button — single-entry delete

Users can also clear **their own quiz history** from **Profile → Clear all
quiz history**.

---

## Settings

**Route:** `/admin/settings`

Site-wide preferences:

- **Site name** — displayed in the app title and PWA manifest
- **Support email** — used for error/help links
- **Brand colour** (hex) — applied as CSS custom property `--brand`
- **Allow registration** — toggle new sign-ups
- **Maintenance mode** — (reserved for future middleware)

---

## Final Review Checklist

**Route:** `/admin/review`

A 22-item, 6-group interactive checklist for pre-launch verification. Each
item includes:

- Clear description of what to check
- **Open →** deep-link to the module
- Checkbox to mark verified

Progress bar shows `verified / total`. When 100% complete, a green
**READY FOR PRODUCTION** badge appears.

- **Reset checklist** — clears all checks
- **Export review report** — downloads `qcap-review-report.json`

This tool **never modifies data** — it's a read-only guided walkthrough.

---

## Best practices

### Content authoring

- Write cases and OPD titles that describe the **presentation**, never the
  diagnosis (see [CONTENT-AUTHORING.md](docs/CONTENT-AUTHORING.md)).
- Always cite sources in `reference` / `references[]`.
- Reserve **Bulk Import** for 10+ records; use the individual managers for
  smaller edits.

### Moderation

- Provide a **clear reason** for every moderation action — it appears in
  the audit log and, if you enable notifications, is emailed to the user.
- Prefer **Warn → Suspend → Temp Ban → Perm Ban** as an escalation ladder.
- Owner accounts cannot be moderated; use **Promote/Demote** for role changes
  on other admins.

### Notifications

- Reserve **Urgent** priority for genuine outages or safety issues.
- Broadcast sparingly — users can disable categories in their profile.
- Include **direct links** in `link` (e.g. `#/education/article-slug`) so
  the notification is actionable.

### Backup & Restore

- Firestore doesn't offer point-in-time restore on Spark. Export
  periodically using the **Bulk Import → Template** button on each content
  type to snapshot your data structure.
- Use `firebase firestore:export gs://your-bucket/qcap-backup-{date}` on
  Blaze if you upgrade.

### Performance

- Do not lower the cache TTLs in `src/services/db.ts` — they're tuned for
  Firebase free tier.
- Encourage users to use the built-in **music player** which uses IndexedDB
  (not Firebase Storage).

---

## Getting help

- [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md) — full data model reference
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) — connecting a new Firebase project
- [DEPLOYMENT.md](DEPLOYMENT.md) — deploying to production
- [IMPORT_FORMATS.md](IMPORT_FORMATS.md) — bulk import file formats
- [docs/DEVELOPER.md](docs/DEVELOPER.md) — internal architecture

For questions, contact **Dr. Qaahir · dr.qaahir90@gmail.com**.
