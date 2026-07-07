# QCAP · Firestore Schema Reference

Complete reference for every Firestore collection used by QCAP · Qaahir
Clinical Academy.

> All schemas are **backward-compatible**. Every new field is optional.
> Documents written by older versions of the app continue to load.

---

## Table of contents

1. [Type conventions](#type-conventions)
2. [Collection index](#collection-index)
3. [users](#-users)
4. [mcqs](#-mcqs)
5. [caseStudies](#-casestudies)
6. [opdCases](#-opdcases)
7. [educationArticles](#-educationarticles)
8. [notifications](#-notifications)
9. [quizResults](#-quizresults)
10. [chatThreads](#-chatthreads)
11. [chatMessages](#-chatmessages)
12. [friendRequests](#-friendrequests)
13. [friendships](#-friendships)
14. [challenges](#-challenges)
15. [aboutBlocks](#-aboutblocks)
16. [aboutSettings/main](#-aboutsettingsmain)
17. [subjects](#-subjects)
18. [siteSettings/main](#-sitesettingsmain)
19. [auditLogs](#-auditlogs)
20. [Composite indexes](#composite-indexes)

---

## Type conventions

```ts
type Lang           = "en" | "ar" | "so";
type LocalizedText  = { en: string; ar: string; so: string };
type Difficulty     = "easy" | "medium" | "hard";
type Role           = "admin" | "user";
type UserStatus     = "active" | "warned" | "suspended" | "banned"
                    | "disabled" | "deleted";
```

Timestamps are stored as **`number` milliseconds since Unix epoch** (`Date.now()`).
Rationale: cross-platform arithmetic + JSON portability; avoids Firestore
`Timestamp` serialization edge cases in the client cache.

Document IDs are always strings; most application-generated IDs follow the
pattern `{collection}_{timestamp}_{random}` (e.g. `mcq_1700000000_abc123`).

---

## Collection index

| Collection | Read | Write | Realtime | Cache TTL |
|------------|:----:|:-----:|:--------:|-----------|
| `users` | signed-in | self / admin | shared | 5 min |
| `mcqs` | public | admin | on-demand | 15 min |
| `caseStudies` | public | admin | on-demand | 15 min |
| `opdCases` | public | admin | on-demand | 15 min |
| `educationArticles` | public | admin | on-demand | 10 min |
| `notifications` | signed-in (own) | admin | shared | none |
| `quizResults` | signed-in | self / admin | on-demand | 5 min |
| `chatThreads` | participants / admin | participants | shared | none |
| `chatMessages` | signed-in | sender / admin | shared | none |
| `friendRequests` | participants | participants | shared | 60 s |
| `friendships` | signed-in | signed-in | on-demand | 60 s |
| `challenges` | participants | participants | shared | 60 s |
| `aboutBlocks` | public | admin | on-demand | 10 min |
| `aboutSettings` | public | admin | on-demand | 10 min |
| `subjects` | public | admin | on-demand | 60 min |
| `siteSettings` | public | admin | on-demand | 10 min |
| `auditLogs` | admin | admin | on-demand | 60 s |

---

## 👤 `users`

```ts
interface AppUser {
  uid: string;                 // matches Firebase Auth UID
  email: string;
  username: string;
  whatsapp?: string;
  role: "admin" | "user";
  photoURL?: string;
  createdAt: number;
  bookmarks?: string[];        // article IDs
  xp?: number;
  streak?: number;
  language?: Lang;

  // Moderation
  status?: UserStatus;
  warnings?: number;
  banUntil?: number;
  moderation?: ModerationAction[];
  loginHistory?: LoginRecord[];
  lastActiveAt?: number;

  // Extended profile & gamification
  country?: string;            // ISO-3166 alpha-2 (e.g. "SO")
  streakUpdatedAt?: number;
  featured?: boolean;          // pinned to leaderboard top by admin
  isDemo?: boolean;            // demo/sample account
  friends?: string[];          // uids of accepted friends
}

interface ModerationAction {
  id: string;
  type: "warn" | "suspend" | "temp_ban" | "perm_ban"
      | "disable" | "reactivate" | "delete";
  reason: string;
  by: string;                  // admin uid
  byName?: string;
  at: number;
  expiresAt?: number;
}

interface LoginRecord { at: number; ip?: string; ua?: string; }
```

### Special document

`users/admin_qaahir_super` — the **protected owner** (Dr. Qaahir).
Auto-seeded on first boot. Cannot be demoted, moderated, or deleted; the
`authService` self-heals `role`/`status` on every login.

---

## ❓ `mcqs`

```ts
interface MCQ {
  id: string;
  question: LocalizedText;
  options: MCQOption[];        // 2–6 options
  correctOptionId: string;
  explanation: LocalizedText;
  difficulty: Difficulty;
  subjectId: string;
  tags?: string[];
  reference?: string;
  imageUrl?: string;
  timerSeconds?: number;       // default 45
  createdAt: number;
  createdBy?: string;
}

interface MCQOption {
  id: string;                  // "a" | "b" | "c" | "d"
  text: LocalizedText;
}
```

Correct answer is identified by matching `option.id === correctOptionId`
(never by index).

---

## 📋 `caseStudies`

```ts
interface CaseStudy {
  id: string;
  title: LocalizedText;                    // NEUTRAL — must not reveal diagnosis
  summary: LocalizedText;
  patient: {
    age: number;
    sex: "M" | "F";
    presenting: LocalizedText;
  };
  steps: CaseStep[];
  references: string[];
  subjectId: string;
  difficulty: Difficulty;
  imageUrl?: string;
  createdAt: number;
}

interface CaseStep {
  id: string;
  title: LocalizedText;
  content: LocalizedText;
  question?: LocalizedText;                // optional MCQ checkpoint
  options?: MCQOption[];
  correctOptionId?: string;
  explanation?: LocalizedText;
}
```

If any step lacks `question`/`options`/`correctOptionId`, that step is
displayed as pure content (no scoring). The runner survives missing/corrupt
data via `normalizeCase()` in `src/pages/Cases.tsx`.

---

## 🩺 `opdCases`

```ts
interface OPDCase {
  id: string;
  title?: LocalizedText;                   // NEUTRAL

  // Required core
  chiefComplaint: LocalizedText;
  history: LocalizedText;
  vitals: VitalSigns;
  examFindings: LocalizedText;
  correctDiagnosis: LocalizedText;
  correctManagement: LocalizedText;
  differentials: LocalizedText[];
  subjectId: string;
  difficulty: Difficulty;
  createdAt: number;

  // Optional explicit MCQs (auto-generated from differentials otherwise)
  diagnosisOptions?: MCQOption[];
  diagnosisCorrectId?: string;
  managementOptions?: MCQOption[];
  managementCorrectId?: string;
  explanation?: LocalizedText;
  imageUrl?: string;

  // Rich clinical extensions (all optional)
  patientProfile?: {
    age?: number;
    sex?: "M" | "F";
    occupation?: LocalizedText;
    ethnicity?: LocalizedText;
  };
  historyPresentIllness?: LocalizedText;
  pastMedical?: LocalizedText;
  pastSurgical?: LocalizedText;
  medications?: LocalizedText;
  allergies?: LocalizedText;
  familyHistory?: LocalizedText;
  socialHistory?: LocalizedText;
  riskFactors?: LocalizedText;
  reviewOfSystems?: LocalizedText;
  generalExam?: LocalizedText;
  systemicExam?: LocalizedText;
  positiveFindings?: LocalizedText;
  negativeFindings?: LocalizedText;

  labs?: LabResult[];
  imaging?: MediaAsset[];
  ecg?: MediaAsset;
  clinicalImages?: MediaAsset[];

  learningPoints?: LocalizedText[];
  followUp?: LocalizedText;
  references?: string[];
}

interface VitalSigns {
  hr: number;   bp: string;   rr: number;
  temp: number; spo2: number;
}

interface LabResult {
  name: string;
  value: string;
  unit?: string;
  ref?: string;
  flag?: "normal" | "low" | "high" | "critical";
}

interface MediaAsset {
  type?: "xray" | "ct" | "mri" | "ultrasound" | "ecg" | "clinical" | "other";
  url: string;
  title?: LocalizedText;
  caption?: LocalizedText;
}
```

---

## 📚 `educationArticles`

```ts
interface EducationArticle {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  category: string;                        // subjectId
  tags?: string[];
  references?: string[];
  imageUrl?: string;                       // cover
  createdAt: number;

  // CMS fields (backward-compatible: missing status = "published")
  status?: "draft" | "published" | "archived";
  featured?: boolean;
  updatedAt?: number;
  author?: string;
  summary?: LocalizedText;
}
```

---

## 🔔 `notifications`

```ts
interface Notification {
  id: string;
  audience: "broadcast" | "personal" | "group";
  userId?: string;                         // for "personal"
  userIds?: string[];                      // for "group"

  title: LocalizedText;
  body: LocalizedText;
  imageUrl?: string;
  priority?: "low" | "normal" | "high" | "urgent";

  read?: boolean;                          // for "personal"
  readBy?: string[];                       // for "broadcast" / "group"

  kind?: "announcement" | "personal" | "reminder" | "achievement"
       | "friend_request" | "friend_accept"
       | "challenge_invite" | "challenge_result" | "message";

  link?: string;                           // e.g. "#/friends"
  senderId?: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}
```

---

## 📝 `quizResults`

```ts
interface QuizResult {
  id: string;
  userId: string;
  username: string;                        // denormalized for leaderboard perf
  type: "mcq" | "case" | "opd" | "challenge";
  refIds: string[];                        // MCQ / case / opd / question ids
  score: number;
  total: number;
  durationSec: number;
  createdAt: number;
  subjectId?: string;
  difficulty?: Difficulty;
  challengeId?: string;                    // if type === "challenge"
}
```

---

## 💬 `chatThreads`

Both support tickets and friend chats share this collection.

```ts
interface ChatThread {
  id: string;
  userId: string;                          // legacy: initiator (support)
  username: string;
  userPhoto?: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: number;
  lastSenderId?: string;
  unreadByUser?: number;
  unreadByAdmin?: number;
  typingBy?: string;                       // uid currently typing
  typingAt?: number;
  createdAt: number;
  status: "open" | "closed";

  // Friend-chat extensions
  kind?: "support" | "friend";
  participantIds?: string[];               // [uidA, uidB]
  unread?: Record<string, number>;         // per-participant counters
  participants?: Array<{ uid: string; name: string; photo?: string }>;
}
```

Deterministic friend-thread ID: `friend__${sortedUidA}__${sortedUidB}`.

---

## 💭 `chatMessages`

```ts
interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;                        // or "system" for auto-messages
  senderName: string;
  senderPhoto?: string;
  text: string;
  attachments?: ChatAttachment[];
  replyTo?: { id: string; text: string; senderName: string };
  status: "sent" | "delivered" | "seen";
  seenBy?: string[];
  deletedFor?: string[];
  deletedForAll?: boolean;
  createdAt: number;
}

interface ChatAttachment {
  url: string;    name: string;    type: string;
  size?: number;  isImage?: boolean;
}
```

---

## 🤝 `friendRequests`

```ts
interface FriendRequest {
  id: string;
  fromId: string;   fromName: string;   fromPhoto?: string;
  toId: string;     toName: string;     toPhoto?: string;
  status: "pending" | "accepted" | "declined" | "canceled";
  createdAt: number;
  respondedAt?: number;
}
```

---

## 🤝 `friendships`

Deterministic ID: `[uidA, uidB].sort().join("__")` — prevents duplicates.

```ts
interface Friendship {
  id: string;         // pairId
  userIds: string[];  // [uidA, uidB]
  createdAt: number;
}
```

The `friends[]` array on each `AppUser` doc is the denormalized read model
for O(1) friend lookups.

---

## ⚡ `challenges`

```ts
interface Challenge {
  id: string;
  fromId: string;   fromName: string;   fromPhoto?: string;
  toId: string;     toName: string;     toPhoto?: string;

  subjectId: string;                     // "all" allowed
  difficulty: Difficulty | "all";
  count: number;
  timerSeconds?: number;                 // per question

  questionIds: string[];                 // deterministic MCQ set
  status: "pending" | "active" | "completed" | "declined" | "canceled";
  createdAt: number;

  results: Record<string, ChallengeResult>;  // keyed by uid
  winnerId?: string;                     // computed once both submit
}

interface ChallengeResult {
  score: number;
  total: number;
  durationSec: number;
  completedAt: number;
}
```

State machine: `pending → active → completed` (or `declined` / `canceled`
terminal states). Winner = highest score, tiebreak by fastest time.

---

## ℹ️ `aboutBlocks`

```ts
type AboutBlockType = "hero" | "section" | "mission" | "vision"
                    | "contact" | "social";

interface AboutBlock {
  id: string;
  type: AboutBlockType;
  title?: LocalizedText;
  body?: LocalizedText;
  imageUrl?: string;
  order: number;
  published?: boolean;

  // "contact" fields
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: LocalizedText;
  contactWebsite?: string;

  // "social" fields
  facebook?: string;   twitter?: string;   instagram?: string;
  linkedin?: string;   youtube?: string;   whatsapp?: string;

  createdAt: number;
  updatedAt?: number;
}
```

---

## ℹ️ `aboutSettings/main`

Single document — global About Us page organization data.

```ts
interface AboutSettings {
  id?: string;                             // "main"
  orgName?: LocalizedText;
  orgLogo?: string;                        // URL

  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: LocalizedText;
  contactWebsite?: string;

  facebook?: string;   twitter?: string;   instagram?: string;
  linkedin?: string;   youtube?: string;   whatsapp?: string;

  updatedAt?: number;
}
```

---

## 🏥 `subjects`

```ts
interface Subject {
  id: string;                              // e.g. "cardio"
  name: LocalizedText;
  icon?: string;                           // emoji
  color?: string;                          // Tailwind class fragment
  isSpecialty?: boolean;                   // shown in OPD specialty picker
}
```

---

## ⚙️ `siteSettings/main`

Single document — site-wide preferences.

```ts
interface SiteSettings {
  siteName: string;
  supportEmail: string;
  allowRegistration: boolean;
  maintenance: boolean;
  featuredSubjects: string[];
  branding?: BrandingAssets;
  brandColor?: string;                     // hex
  streak?: StreakRules;
}

interface BrandingAssets {
  websiteLogo?: string;   // legacy
  mobileLogo?: string;    // legacy
  favicon?: string;
  appIcon?: string;
  svgLogo?: string;       // legacy
  mainLogo?: string;      // preferred
  darkLogo?: string;
  lightLogo?: string;
}

interface StreakRules {
  enabled?: boolean;
  bonusXp?: number;         // XP awarded per streak day increment
  inactivityDays?: number;  // days without activity before reset
}
```

Logos may be pasted URLs or `data:image/*;base64,...` (from the Branding
Manager's upload flow — no Firebase Storage cost).

---

## 📜 `auditLogs`

```ts
interface AuditLog {
  id: string;
  actorId: string;                         // admin uid, "system" if omitted
  action: string;                          // e.g. "user.promote"
  target?: string;                         // usually a doc id
  meta?: Record<string, unknown>;
  createdAt: number;
}
```

**Standard action names**:
`user.promote`, `user.demote`, `user.warn`, `user.suspend`, `user.temp_ban`,
`user.perm_ban`, `user.disable`, `user.reactivate`, `user.delete`,
`mcqs.edit`, `caseStudies.edit`, `opdCases.edit`, `mcqs.delete`,
`caseStudies.delete`, `opdCases.delete`, `mcqs.duplicate`,
`caseStudies.duplicate`, `opdCases.duplicate`,
`import.<coll>`, `article.save`, `article.publish`, `article.draft`,
`article.delete`, `notification.send`, `branding.update`,
`leaderboard.reset`, `leaderboard.recalc`, `leaderboard.pin`, `leaderboard.unpin`,
`streak.reset`, `streak.resetAll`, `streak.bonus`, `demo.generate`,
`demo.removeAll`, `about.block.save`, `about.block.delete`,
`about.settings.save`.

---

## Composite indexes

QCAP is optimized to avoid composite indexes (all filtering happens
client-side against the read cache). The only ordered query used is:

```ts
query(collection("auditLogs"), orderBy("createdAt", "desc"))
```

Firestore auto-creates a single-field index for `createdAt`; no explicit
`firestore.indexes.json` entry is required.

If you extend the app with server-side compound filtering, add indexes
to `firestore.indexes.json` and deploy with
`firebase deploy --only firestore:indexes`.
