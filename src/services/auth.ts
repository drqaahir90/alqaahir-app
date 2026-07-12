import { auth, isFirebaseConfigured, db } from "@/config/firebase";
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

function adminEmails(): string[] {
  let stored: string[] = [];
  try { stored = JSON.parse(localStorage.getItem(LS_ADMINS) || "[]"); } catch { /* empty */ }
  const set = new Set<string>(stored.map((e) => e.toLowerCase()));
  set.add(PROTECTED_ADMIN_EMAIL.toLowerCase());
  set.add("admin@qcap.io");         
  set.add("admin@medacademy.io");   
  return Array.from(set);
}
function isAdminEmail(email: string): boolean {
  return adminEmails().includes((email || "").toLowerCase());
}

async function ensureUserDoc(u: AppUser): Promise<AppUser> {
  let existing: AppUser | null;
  try { existing = await dbService.get<AppUser>("users", u.uid); } catch (err) { throw err; }

  const merged: AppUser = existing ? { ...existing, ...u, role: existing.role || u.role } : u;
  if (isProtectedAdmin(merged)) {
    merged.role = "admin";
    merged.status = "active";
  }

  if (!existing) {
    try { await dbService.set("users", u.uid, merged); } catch (err) { throw err; }
  } else if (existing.role !== merged.role || existing.status !== merged.status) {
    try { await dbService.update("users", u.uid, { role: merged.role, status: merged.status }); } catch (err) { throw err; }
  }
  return merged;
}

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
        try { await updateProfile(cred.user, { displayName: username }); } catch (err) { }
      }
      if (cred.user && !isProtectedAdmin({ email })) {
        try { await sendEmailVerification(cred.user); } catch (err) { }
      }
      const u: AppUser = {
        uid: cred.user.uid,
        email,
        username,
        whatsapp: whatsapp || "",       
        role,
        createdAt: Date.now(),
        bookmarks: [],
        xp: 0,
        streak: 0,
        status: "active",
        language: "en",
      };
      const saved = await ensureUserDoc(u);

      if (db) {
        try {
          const { collection, addDoc } = await import("firebase/firestore");
          await addDoc(collection(db, "notifications"), {
            userId: cred.user.uid,
            title: "مرحباً بك في QCAP! 🎉",
            message: `أهلاً بك يا ${username}! نحن سعداء جداً بانضمامك إلينا ورحلتك التعليمية المتميزة تبدأ الآن. يرجى العلم أنه تم إرسال رابط تأكيد الحساب (Verified) إلى بريدك الإلكتروني. إذا لم تجد الرسالة في البريد الوارد، يرجى التحقق فوراً من مجلد البريد غير المرغوب فيه (Spam). بالتوفيق!`,
            isRead: false,
            createdAt: Date.now(),
            type: "welcome"
          });
        } catch (notifErr) { }
      }

      return saved;
    }
    
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
        if (isProtectedAdmin(existing)) {
          if (existing.role !== "admin" || existing.status !== "active") {
            await dbService.update("users", existing.uid, { role: "admin", status: "active" });
            return { ...existing, role: "admin", status: "active" };
          }
        }
        return existing;
      }
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

  async resendVerification(): Promise<boolean> {
    if (!isFirebaseConfigured || !auth?.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch { return false; }
  },

  async resetPassword(email: string): Promise<boolean> {
    if (!isFirebaseConfigured || !auth) throw new Error("Password reset requires Firebase.");
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (e) { throw e; }
  },

  isEmailVerified(): boolean {
    if (!isFirebaseConfigured || !auth?.currentUser) return true; 
    return !!auth.currentUser.emailVerified;
  },
};
