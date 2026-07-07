/**
 * Firebase configuration.
 *
 * All keys are loaded from environment variables — never hard-code secrets.
 * Vite exposes vars prefixed with VITE_. We also fall back to process.env for
 * SSR/Node compatibility as requested by the spec.
 *
 * If configuration is not present at build time, the application transparently
 * falls back to a fully-functional local-storage backed implementation so the
 * platform remains usable during development / preview.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env: Record<string, string | undefined> =
  (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // Use initializeFirestore so we can pass `ignoreUndefinedProperties: true`.
    // Without this flag, Firestore SDK v10+ REJECTS any document containing
    // an `undefined` value (e.g. an optional user field like `whatsapp` that
    // the caller didn't provide) with:
    //   FirebaseError: Function setDoc() called with invalid data.
    //   Unsupported field value: undefined (found in field whatsapp)
    // — which silently prevents the /users/{uid} document from being written.
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
    storage = getStorage(app);
  } catch (err) {
    // Do not crash the app if init fails — fall back to demo mode.
    // eslint-disable-next-line no-console
    console.warn("[firebase] init failed, falling back to demo mode:", err);
  }
}

export { app, auth, db, storage, firebaseConfig };
