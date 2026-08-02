import { Schema, model, Document, Types } from "mongoose";
import crypto from "crypto";

/**
 * Refresh tokens are never stored in plaintext — only a SHA-256 hash.
 * This means a database leak alone cannot be used to impersonate users;
 * the attacker would still need the original token value.
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index: MongoDB automatically deletes expired refresh tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);

/** Single source of truth for hashing a refresh token — used on both the issue and verify paths. */

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
