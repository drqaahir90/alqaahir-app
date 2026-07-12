import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const env: Record<string, string | undefined> =
  (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
const nodeEnv: Record<string, string | undefined> =
  (typeof process !== "undefined" && (process as any).env) || {};

function pick(key: string): string | undefined {
  return env[`VITE_${key}`] || nodeEnv[`VITE_${key}`] || nodeEnv[key];
}

const firebaseConfig = {
  apiKey: pick("FIREBASE_API_KEY"),
  authDomain: pick("FIREBASE_AUTH_DOMAIN"),
  projectId: pick("FIREBASE_PROJECT_ID"),
  storageBucket: pick("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: pick("FIREBASE_MESSAGING_SENDER_ID"),
  appId: pick("FIREBASE_APP_ID"),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig as Required<typeof firebaseConfig>);
    auth = getAuth(app);
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    storage = getStorage(app);

    if (typeof window !== "undefined") {
      enableIndexedDbPersistence(db).catch((err) => {
        console.warn("[firebase] Offline persistence failed:", err.code);
      });
    }
  } catch (err) {
    console.warn("[firebase] init failed, falling back to demo mode:", err);
  }
}

export { app, auth, db, storage, firebaseConfig };
