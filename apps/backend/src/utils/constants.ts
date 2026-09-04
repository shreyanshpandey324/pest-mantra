/**
 * Single source of truth for validation patterns used in more than
 * one place (the Mongoose schema re-validates at the DB layer even
 * though Zod already validated at the request layer — intentional
 * defense in depth, not accidental duplication, but both must use
 * the exact same pattern or they could silently drift apart).
 */
export const PHONE_REGEX = /^[6-9]\d{9}$/;
// Customer/contact numbers may be international. Staff authentication remains
// on the stricter local mobile pattern until country-aware OTP providers are configured.
export const CUSTOMER_PHONE_REGEX = /^\+?[0-9][0-9\s()-]{6,23}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
