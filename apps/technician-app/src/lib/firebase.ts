import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

// Do not initialise the Firebase client with half-filled environment values.
// This lets the login page render a useful configuration error instead of
// throwing during module import on a new/staging deployment.
export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
firebaseAuth?.useDeviceLanguage();

// Debug visibility: this app talks to whichever Firebase project these
// NEXT_PUBLIC_FIREBASE_* env vars point to at BUILD time (Next.js inlines
// them into the client bundle). If Phone sign-in works in one Firebase
// project's console but the app still errors, the two most common causes
// are (a) these vars point at a different project than the one you are
// looking at in the console, or (b) a stale build/browser cache is still
// serving an older bundle with old vars baked in. Logging this on every
// load makes both cases immediately visible in the browser DevTools
// console — compare "projectId" below with the project you enabled Phone
// sign-in on.
if (typeof window !== "undefined") {
  if (firebaseConfigured) {
    // eslint-disable-next-line no-console
    console.info("[firebase] technician-app client initialised", {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      appId: firebaseConfig.appId,
    });
  } else {
    const missing = (
      [
        ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
        ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
        ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
        ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
      ] as const
    )
      .filter(([, value]) => !value)
      .map(([name]) => name);
    // eslint-disable-next-line no-console
    console.warn(
      "[firebase] technician-app client NOT initialised — missing env vars:",
      missing
    );
  }
}
