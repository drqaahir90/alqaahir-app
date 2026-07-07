// ─────────────────────────────────────────────────────────────
// Core Types — QCAP · Qaahir Clinical Academic Professional
// All new fields are OPTIONAL for full backward compatibility.
// ─────────────────────────────────────────────────────────────

export type Lang = "en" | "ar" | "so";

export type LocalizedText = Record<Lang, string>;

export type Role = "admin" | "user";

export type Difficulty = "easy" | "medium" | "hard";

export type UserStatus = "active" | "warned" | "suspended" | "banned" | "disabled" | "deleted";

export interface AppUser {
  uid: string;
  email: string;
  username: string;
  whatsapp?: string;
  role: Role;
  photoURL?: string;
  createdAt: number;
  bookmarks?: string[];
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

  // Extended profile / gamification (all optional)
  country?: string;               // ISO-3166 alpha-2, e.g. "SO"
  streakUpdatedAt?: number;       // last day the streak was incremented
  featured?: boolean;             // admin-pinned to leaderboard top
  isDemo?: boolean;               // demo/sample user (never affects prod stats)
  friends?: string[];             // uids of accepted friends
}

export interface ModerationAction {
  id: string;
  type: "warn" | "suspend" | "temp_ban" | "perm_ban" | "disable" | "reactivate" | "delete";
  reason: string;
  by: string;
  byName?: string;
  at: number;
  expiresAt?: number;
}

export interface LoginRecord {
  at: number;
  ip?: string;
  ua?: string;
}

export interface MCQOption {
  id: string;
  text: LocalizedText;
}

export interface MCQ {
  id: string;
  question: LocalizedText;
  options: MCQOption[];
  correctOptionId: string;
  explanation: LocalizedText;
  difficulty: Difficulty;
  subjectId: string;
  tags?: string[];
  reference?: string;
  imageUrl?: string;
  timerSeconds?: number;
  createdAt: number;
  createdBy?: string;
}

export interface CaseStep {
  id: string;
  title: LocalizedText;
  content: LocalizedText;
  question?: LocalizedText;
  options?: MCQOption[];
  correctOptionId?: string;
  explanation?: LocalizedText;
}

export interface CaseStudy {
  id: string;
  title: LocalizedText;
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

export interface VitalSigns {
  hr: number; bp: string; rr: number; temp: number; spo2: number;
}

export interface MediaAsset {
  title?: LocalizedText;
  type?: "xray" | "ct" | "mri" | "ultrasound" | "ecg" | "clinical" | "other";
  url: string;
  caption?: LocalizedText;
}

export interface LabResult {
  name: string; value: string; unit?: string; ref?: string;
  flag?: "normal" | "low" | "high" | "critical";
}

export interface OPDCase {
  id: string;
  title?: LocalizedText;
  chiefComplaint: LocalizedText;
  history: LocalizedText;
  vitals: VitalSigns;
  examFindings: LocalizedText;
  correctDiagnosis: LocalizedText;
  correctManagement: LocalizedText;
  differentials: LocalizedText[];
  diagnosisOptions?: MCQOption[];
  diagnosisCorrectId?: string;
  managementOptions?: MCQOption[];
  managementCorrectId?: string;
  explanation?: LocalizedText;
  subjectId: string;
  difficulty: Difficulty;
  imageUrl?: string;
  createdAt: number;
  patientProfile?: { age?: number; sex?: "M" | "F"; occupation?: LocalizedText; ethnicity?: LocalizedText; };
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

export interface QuizResult {
  id: string;
  userId: string;
  username: string;
  type: "mcq" | "case" | "opd" | "challenge";
  refIds: string[];
  score: number;
  total: number;
  durationSec: number;
  createdAt: number;
  subjectId?: string;
  difficulty?: Difficulty;
  challengeId?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  photoURL?: string;
  xp: number;
  quizzes: number;
  accuracy: number;
  streak?: number;
  country?: string;
  featured?: boolean;
  isDemo?: boolean;
}

export type EducationStatus = "draft" | "published" | "archived";

export interface EducationArticle {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  category: string;
  tags?: string[];
  references?: string[];
  imageUrl?: string;
  createdAt: number;
  status?: EducationStatus;
  featured?: boolean;
  updatedAt?: number;
  author?: string;
  summary?: LocalizedText;
}

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/** Notification "kind" — matches the user-facing category system. Optional for
 *  backward compatibility with existing broadcast-only notifications. */
export type NotifKind =
  | "announcement" | "personal" | "reminder" | "achievement"
  | "friend_request" | "friend_accept"
  | "challenge_invite" | "challenge_result"
  | "message";

export interface Notification {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  audience: "broadcast" | "personal" | "group";
  userId?: string;
  userIds?: string[];
  imageUrl?: string;
  priority?: NotificationPriority;
  read?: boolean;
  readBy?: string[];
  createdAt: number;
  link?: string;
  senderId?: string;
  kind?: NotifKind;
  meta?: Record<string, unknown>;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  attachments?: string[];
  reply?: string;
  createdAt: number;
  updatedAt: number;
}

// ─────── Chat ───────
export type MessageStatus = "sent" | "delivered" | "seen";

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
  isImage?: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  attachments?: ChatAttachment[];
  replyTo?: { id: string; text: string; senderName: string };
  status: MessageStatus;
  seenBy?: string[];
  deletedFor?: string[];
  deletedForAll?: boolean;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  userId: string;        // legacy: primary user for support threads
  username: string;
  userPhoto?: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: number;
  lastSenderId?: string;
  unreadByUser?: number;
  unreadByAdmin?: number;
  typingBy?: string;
  typingAt?: number;
  createdAt: number;
  status: "open" | "closed";

  // New (optional): distinguishes friend chat from support chat.
  kind?: "support" | "friend";
  /** For friend chats: uids of both participants (length 2). */
  participantIds?: string[];
  /** For friend chats: per-participant unread counters. */
  unread?: Record<string, number>;
  /** Names/photos of both participants (used to render peer info without extra reads). */
  participants?: Array<{ uid: string; name: string; photo?: string }>;
}

// ─────── Friends & challenges ───────

export type FriendRequestStatus = "pending" | "accepted" | "declined" | "canceled";

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromPhoto?: string;
  toId: string;
  toName: string;
  toPhoto?: string;
  status: FriendRequestStatus;
  createdAt: number;
  respondedAt?: number;
}

export type ChallengeStatus = "pending" | "active" | "completed" | "declined" | "canceled";
export type ChallengeType = "mcq" | "case" | "opd" | "mixed";

export interface ChallengeResult {
  score: number;
  total: number;
  durationSec: number;
  completedAt: number;
  /** Answers keyed by question/case/opd id → chosen option id (for review/replay) */
  answers?: Record<string, string>;
}

export interface Challenge {
  id: string;
  fromId: string;
  fromName: string;
  fromPhoto?: string;
  toId: string;
  toName: string;
  toPhoto?: string;
  subjectId: string;                 // "all" allowed
  difficulty: Difficulty | "all";
  count: number;                     // number of items in the challenge set
  timerSeconds?: number;             // per question
  /**
   * Deterministic set of item IDs. Their meaning depends on `type`:
   *   • "mcq"   → MCQ ids
   *   • "case"  → case-study ids
   *   • "opd"   → OPD case ids
   *   • "mixed" → prefixed ids "mcq:xxx" / "case:yyy" / "opd:zzz"
   * Kept as `string[]` for full backward compatibility with 1.0 challenges.
   */
  questionIds: string[];
  /** Optional — defaults to "mcq" for backward compatibility. */
  type?: ChallengeType;
  status: ChallengeStatus;
  createdAt: number;
  results: Record<string, ChallengeResult>;
  winnerId?: string;                 // computed once both submit
}

// ─────── Subjects / branding / settings ───────

export interface Subject {
  id: string;
  name: LocalizedText;
  icon?: string;
  color?: string;
  isSpecialty?: boolean;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

export interface BrandingAssets {
  /** Legacy fields (kept for backward compatibility) */
  websiteLogo?: string;
  mobileLogo?: string;
  favicon?: string;
  appIcon?: string;
  svgLogo?: string;
  /** New — semantic logo slots */
  mainLogo?: string;   // used in header + auth
  darkLogo?: string;   // shown in dark mode
  lightLogo?: string;  // shown in light mode
}

export interface StreakRules {
  /** Bonus XP granted per streak day increment. */
  bonusXp?: number;
  /** Number of days without activity before a streak resets. */
  inactivityDays?: number;
  /** Enable/disable the streak system globally. */
  enabled?: boolean;
}

export interface SiteSettings {
  siteName: string;
  supportEmail: string;
  allowRegistration: boolean;
  maintenance: boolean;
  featuredSubjects: string[];
  branding?: BrandingAssets;
  brandColor?: string;
  streak?: StreakRules;
}

// ─────────── About Us CMS ───────────
export type AboutBlockType = "hero" | "section" | "mission" | "vision" | "contact" | "social";

export interface AboutBlock {
  id: string;
  type: AboutBlockType;
  title?: LocalizedText;
  body?: LocalizedText;
  imageUrl?: string;
  order: number;
  published?: boolean;

  /** Contact fields (only used when type === "contact"). */
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: LocalizedText;
  contactWebsite?: string;

  /** Social links (only used when type === "social"). */
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;

  createdAt: number;
  updatedAt?: number;
}

/** Global "about" page metadata (stored as a single doc id="main"). */
export interface AboutSettings {
  id?: string;
  orgName?: LocalizedText;
  orgLogo?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: LocalizedText;
  contactWebsite?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;
  updatedAt?: number;
}
