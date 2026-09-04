import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { env } from "./env";

/**
 * Lazily initializes the firebase-admin app on first use, rather
 * than at module load / server boot. Keeps the server bootable
 * without Firebase configured at all. OTP verification returns a clear
 * configuration error if these vars are unset instead of crashing server
 * startup for unrelated API routes.
 *
 * FIREBASE_PRIVATE_KEY is stored in .env with literal "\n" sequences
 * (standard for multi-line values in .env files) and must be
 * unescaped to real newlines before being handed to the SDK.
 */
let app: App | undefined;

export function getFirebaseAdminApp(): App | null {
  if (app) return app;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      "[firebase-admin] not configured — missing env var(s):",
      [
        !FIREBASE_PROJECT_ID && "FIREBASE_PROJECT_ID",
        !FIREBASE_CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
        !FIREBASE_PRIVATE_KEY && "FIREBASE_PRIVATE_KEY",
      ].filter(Boolean)
    );
    return null;
  }

  try {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        });
  } catch (caught) {
    // eslint-disable-next-line no-console
    console.error("[firebase-admin] initializeApp failed", caught);
    return null;
  }

  // Confirms, in server logs, exactly which Firebase project the backend's
  // Admin SDK (used to verify OTP ID tokens) is bound to. This MUST match
  // NEXT_PUBLIC_FIREBASE_PROJECT_ID used by the technician/admin web apps —
  // a mismatch here causes id-token verification to fail even when the
  // client successfully receives an OTP.
  // eslint-disable-next-line no-console
  console.info("[firebase-admin] initialised for project:", FIREBASE_PROJECT_ID);

  return app;
}
