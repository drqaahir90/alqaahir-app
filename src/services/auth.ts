/**
 * Auth service — Firebase Authentication when configured, otherwise a
 * localStorage-backed demo auth that mirrors the same contract.
 *
 * ─── Permanent super-admin ──────────────────────────────────────────
 * Dr. Qaahir (dr.qaahir90@gmail.com) is the platform's owner account.
 * The account is:
 *   • Seeded automatically on first launch (demo mode)
 *   • Auto-provisioned on first Firebase sign-in with the correct email
 *   • Protected: no admin action can downgrade or delete this account
 *   • Always granted role: "admin" and status: "active"
 * See `PROTECTED_ADMIN_EMAIL` below.
 */
import { auth, isFirebaseConfigured } from "@/config/firebase";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile,
  sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import { dbService } from "./db";
import type { AppUser, Role } from "@/types";

const LS_USER = "medacad.auth.user";
const LS_USERS = "medacad.auth.users";
const LS_ADMINS = "medacad.auth.admins";

/** Protected super-admin (Dr. Qaahir). Cannot be demoted or deleted. */
export const PROTECTED_ADMIN_EMAIL = "dr.qaahir90@gmail.com";
const PROTECTED_ADMIN_UID = "admin_qaahir_super";
const PROTECTED_ADMIN_PASSWORD = "Kingsadam36";
const PROTECTED_ADMIN_USERNAME = "Dr. Qaahir";
const PROTECTED_ADMIN_WHATSAPP = "+62 851-2432-7946";

export function isProtectedAdmin(u: { email?: string; uid?: string } | null | undefined): boolean {
  if (!u) return false;
  const email = (u.email || "").toLowerCase();
  return email === PROTECTED_ADMIN_EMAIL.toLowerCase() || u.uid === PROTECTED_ADMIN_UID;
}

interface StoredUser {
  uid: string; email: string; username: string; whatsapp?: string;
  password: string; role: Role; createdAt: number;
}

function loadUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); } catch { return []; }
}
function saveUsers(u: StoredUser[]) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }

/** Owner email list persisted so it survives sessions. Includes the super-admin. */
function adminEmails(): string[] {
  let stored: string[] = [];
  try { stored = JSON.parse(localStorage.getItem(LS_ADMINS) || "[]"); } catch { /* empty */ }
  const set = new Set<string>(stored.map((e) => e.toLowerCase()));
  set.add(PROTECTED_ADMIN_EMAIL.toLowerCase());
  set.add("admin@qcap.io");         // legacy demo admin
  set.add("admin@medacademy.io");   // legacy demo admin
  return Array.from(set);
}
function isAdminEmail(email: string): boolean {
  return adminEmails().includes((email || "").toLowerCase());
}

async function ensureUserDoc(u: AppUser): Promise<AppUser> {
  let existing: AppUser | null;
  try {
    existing = await dbService.get<AppUser>("users", u.uid);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ensureUserDoc] Failed to read existing user doc:", err);
    throw err;
  }

  const merged: AppUser = existing ? { ...existing, ...u, role: existing.role || u.role } : u;
  // Always enforce super-admin role.
  if (isProtectedAdmin(merged)) {
    merged.role = "admin";
    merged.status = "active";
  }

  if (!existing) {
    try {
      await dbService.set("users", u.uid, merged);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        "[ensureUserDoc] Failed to CREATE user doc — Firebase Auth user exists " +
        "but /users/{uid} was NOT written. Check Firestore security rules and " +
        "the payload below for issues:",
        { uid: u.uid, payload: merged },
        err,
      );
      throw err;
    }
  } else if (existing.role !== merged.role || existing.status !== merged.status) {
    try {
      await dbService.update("users", u.uid, { role: merged.role, status: merged.status });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ensureUserDoc] Failed to update user role/status:", err);
      throw err;
    }
  }
  return merged;
}

/** Seed the protected admin into local-mode storage on first launch. */
function seedProtectedAdminLocal() {
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase())) return;
  users.push({
    uid: PROTECTED_ADMIN_UID,
    email: PROTECTED_ADMIN_EMAIL,
    username: PROTECTED_ADMIN_USERNAME,
    whatsapp: PROTECTED_ADMIN_WHATSAPP,
    password: PROTECTED_ADMIN_PASSWORD,
    role: "admin",
    createdAt: Date.now(),
  });
  saveUsers(users);
}

/** Ensure the super-admin user document exists (called at boot). */
export async function ensureProtectedAdminDoc(): Promise<void> {
  const existing = await dbService.get<AppUser>("users", PROTECTED_ADMIN_UID);
  if (!existing) {
    const u: AppUser = {
      uid: PROTECTED_ADMIN_UID,
      email: PROTECTED_ADMIN_EMAIL,
      username: PROTECTED_ADMIN_USERNAME,
      whatsapp: PROTECTED_ADMIN_WHATSAPP,
      role: "admin",
      status: "active",
      createdAt: Date.now(),
      bookmarks: [], xp: 0, streak: 0,
      country: "SO", language: "en",
    };
    await dbService.set("users", PROTECTED_ADMIN_UID, u);
  } else if (existing.role !== "admin" || existing.status === "banned" || existing.status === "disabled" || existing.status === "deleted") {
    // Self-heal: never allow the super-admin to be locked out.
    await dbService.update("users", PROTECTED_ADMIN_UID, { role: "admin", status: "active" });
  }
  if (!isFirebaseConfigured) seedProtectedAdminLocal();
}

export const authService = {
  isRemote: isFirebaseConfigured,
  PROTECTED_ADMIN_EMAIL,

  async register(email: string, password: string, username: string, whatsapp?: string): Promise<AppUser> {
    const role: Role = isAdminEmail(email) ? "admin" : "user";
    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (cred.user && username) {
        try { await updateProfile(cred.user, { displayName: username }); }
        catch (err) { /* eslint-disable-next-line no-console */ console.warn("[register] updateProfile failed:", err); }
      }
      // Send Firebase verification email (owner is auto-verified).
      if (cred.user && !isProtectedAdmin({ email })) {
        try { await sendEmailVerification(cred.user); }
        catch (err) { /* eslint-disable-next-line no-console */ console.warn("[register] sendEmailVerification failed:", err); }
      }
      // Build the AppUser payload. Note: any optional field left undefined
      // (e.g. `whatsapp`, `photoURL`) would otherwise be rejected by Firestore
      // — this is handled by (a) `ignoreUndefinedProperties: true` on the
      // Firestore instance and (b) `stripInvalid()` in dbService.
      const u: AppUser = {
        uid: cred.user.uid,
        email,
        username,
        whatsapp: whatsapp || "",       // never persist `undefined`
        role,
        createdAt: Date.now(),
        bookmarks: [],
        xp: 0,
        streak: 0,
        status: "active",
        language: "en",
      };
      // Await the Firestore write. If this throws, the caller sees the real
      // error — the auth user will exist but the profile doc is missing, which
      // is exactly the failure mode we want to surface (not silently swallow).
      const saved = await ensureUserDoc(u);
      return saved;
    }
    // local mode
    seedProtectedAdminLocal();
    const users = loadUsers();
    if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) throw new Error("Email already registered.");
    if (users.some((x) => x.username === username)) throw new Error("Username already taken.");
    const uid = "u_" + Math.random().toString(36).slice(2, 10);
    const stored: StoredUser = { uid, email, username, whatsapp, password, role, createdAt: Date.now() };
    users.push(stored);
    saveUsers(users);
    const u: AppUser = { uid, email, username, whatsapp, role, createdAt: stored.createdAt, bookmarks: [], xp: 0, streak: 0, status: "active" };
    await ensureUserDoc(u);
    localStorage.setItem(LS_USER, JSON.stringify(u));
    return u;
  },

  async login(emailOrUsername: string, password: string): Promise<AppUser> {
    if (isFirebaseConfigured && auth) {
      const cred = await signInWithEmailAndPassword(auth, emailOrUsername, password);
      const existing = await dbService.get<AppUser>("users", cred.user.uid);
      if (existing) {
        // Enforce super-admin role on every login (even if a rogue write demoted them).
        if (isProtectedAdmin(existing)) {
          if (existing.role !== "admin" || existing.status !== "active") {
            await dbService.update("users", existing.uid, { role: "admin", status: "active" });
            return { ...existing, role: "admin", status: "active" };
          }
        }
        return existing;
      }
      // Auth user exists but has no /users/{uid} doc — this is exactly the
      // broken state that a failed registration write leaves behind.
      // Repair it on-the-fly by creating the missing doc.
      // eslint-disable-next-line no-console
      console.warn("[login] No /users/" + cred.user.uid + " document found — creating it now.");
      const u: AppUser = {
        uid: cred.user.uid,
        email: cred.user.email || emailOrUsername,
        username: cred.user.displayName || emailOrUsername.split("@")[0],
        whatsapp: "",
        role: isAdminEmail(cred.user.email || emailOrUsername) ? "admin" : "user",
        createdAt: Date.now(),
        bookmarks: [],
        xp: 0,
        streak: 0,
        status: "active",
        language: "en",
      };
      return await ensureUserDoc(u);
    }
    // local mode
    seedProtectedAdminLocal();
    const users = loadUsers();
    const found = users.find((u) => (u.email.toLowerCase() === emailOrUsername.toLowerCase() || u.username === emailOrUsername) && u.password === password);
    if (!found) throw new Error("Invalid credentials.");
    const u: AppUser = {
      uid: found.uid, email: found.email, username: found.username, whatsapp: found.whatsapp,
      role: found.role, createdAt: found.createdAt, bookmarks: [], xp: 0, streak: 0,
      status: "active",
    };
    const merged = await ensureUserDoc(u);
    localStorage.setItem(LS_USER, JSON.stringify(merged));
    return merged;
  },

  async logout() {
    if (isFirebaseConfigured && auth) await signOut(auth);
    localStorage.removeItem(LS_USER);
  },

  onChange(cb: (user: AppUser | null) => void): () => void {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (fu) => {
        if (!fu) return cb(null);
        try {
          const existing = await dbService.get<AppUser>("users", fu.uid);
          if (existing) {
            if (isProtectedAdmin(existing) && (existing.role !== "admin" || existing.status !== "active")) {
              await dbService.update("users", existing.uid, { role: "admin", status: "active" });
              return cb({ ...existing, role: "admin", status: "active" });
            }
            return cb(existing);
          }
          // No profile doc — repair it (handles apps left in the broken state
          // by an older build that failed the write during registration).
          // eslint-disable-next-line no-console
          console.warn("[onAuthStateChanged] No /users/" + fu.uid + " document found — creating it now.");
          const u: AppUser = {
            uid: fu.uid,
            email: fu.email || "",
            username: fu.displayName || (fu.email?.split("@")[0] || "user"),
            whatsapp: "",
            role: isAdminEmail(fu.email || "") ? "admin" : "user",
            createdAt: Date.now(),
            bookmarks: [],
            xp: 0,
            streak: 0,
            status: "active",
            language: "en",
          };
          await ensureUserDoc(u);
          cb(u);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[onAuthStateChanged] Failed to load/repair user doc:", err);
          cb(null);
        }
      });
    }
    try {
      seedProtectedAdminLocal();
      const raw = localStorage.getItem(LS_USER);
      cb(raw ? (JSON.parse(raw) as AppUser) : null);
    } catch { cb(null); }
    return () => {};
  },

  async updateUser(uid: string, patch: Partial<AppUser>) {
    await dbService.update<AppUser>("users", uid, patch);
    if (!isFirebaseConfigured) {
      const raw = localStorage.getItem(LS_USER);
      if (raw) {
        const cur = JSON.parse(raw) as AppUser;
        if (cur.uid === uid) localStorage.setItem(LS_USER, JSON.stringify({ ...cur, ...patch }));
      }
    }
  },

  /** Send / resend a Firebase email-verification link. No-op in demo mode. */
  async resendVerification(): Promise<boolean> {
    if (!isFirebaseConfigured || !auth?.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch { return false; }
  },

  /** Send a Firebase password-reset email. */
  async resetPassword(email: string): Promise<boolean> {
    if (!isFirebaseConfigured || !auth) throw new Error("Password reset requires Firebase.");
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (e) {
      throw e;
    }
  },

  /** True when the current Firebase user has a verified email. */
  isEmailVerified(): boolean {
    if (!isFirebaseConfigured || !auth?.currentUser) return true; // demo mode = pass-through
    return !!auth.currentUser.emailVerified;
  },
};
