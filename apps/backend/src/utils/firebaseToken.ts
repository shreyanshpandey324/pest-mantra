import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../config/firebaseAdmin";
import { ApiError } from "./ApiError";

export interface VerifiedPhoneIdentity {
  phone: string;
}

/**
 * Verifies a Firebase Phone Authentication ID token and returns the trusted
 * 10-digit Indian mobile number stored in the token. The client-provided
 * phone number is never used for login after OTP verification.
 *
 * Security checks:
 * - token must be issued by this Firebase project
 * - sign-in provider must be `phone`
 * - phone must be an Indian +91 mobile number
 * - authentication must have happened recently (10 minutes)
 */
export async function verifyFirebasePhoneIdToken(
  idToken: string
): Promise<VerifiedPhoneIdentity> {
  const app = getFirebaseAdminApp();

  if (!app) {
    throw ApiError.internal(
      "OTP login is not configured on the server (missing FIREBASE_* env vars)."
    );
  }

  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken);
  } catch (caught) {
    // Log the REAL Admin SDK error server-side (e.g. project-id mismatch,
    // expired token, invalid signature). The client only ever gets the
    // generic message below — never leak Firebase internals to callers.
    // eslint-disable-next-line no-console
    console.error("[firebase-otp] verifyIdToken failed", caught);
    throw ApiError.unauthorized("Invalid or expired OTP verification token.");
  }

  if (decoded.firebase?.sign_in_provider !== "phone") {
    throw ApiError.unauthorized("This sign-in token was not created by phone OTP authentication.");
  }

  if (!decoded.phone_number) {
    throw ApiError.unauthorized("The verified Firebase account has no phone number.");
  }

  const match = /^\+91([6-9]\d{9})$/.exec(decoded.phone_number);
  if (!match) {
    throw ApiError.unauthorized("Only verified Indian mobile numbers are supported.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const authAgeSeconds = nowSeconds - decoded.auth_time;
  if (authAgeSeconds < -60 || authAgeSeconds > 10 * 60) {
    throw ApiError.unauthorized("OTP verification is too old. Request a new OTP and try again.");
  }

  return { phone: match[1] };
}
