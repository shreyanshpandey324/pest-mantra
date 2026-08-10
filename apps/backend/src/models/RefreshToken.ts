import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";
import crypto from "crypto";

export interface IRefreshToken
  extends Document {
  _id: Types.ObjectId;

  companyId?: Types.ObjectId;

  userId: Types.ObjectId;

  tokenHash: string;

  expiresAt: Date;

  revokedAt?: Date;

  replacedByTokenHash?: string;

  userAgent?: string;

  ipAddress?: string;

  createdAt: Date;
}

const refreshTokenSchema =
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      tokenHash: {
        type: String,
        required: true,
        unique: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },

      revokedAt: {
        type: Date,
      },

      replacedByTokenHash: {
        type: String,
      },

      userAgent: {
        type: String,
      },

      ipAddress: {
        type: String,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    }
  );

refreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

refreshTokenSchema.index({
  companyId: 1,
  userId: 1,
  revokedAt: 1,
});

export const RefreshToken =
  model<IRefreshToken>(
    "RefreshToken",
    refreshTokenSchema
  );

/**
 * Single source of truth for hashing
 * refresh tokens.
 */
export function hashToken(
  token: string
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}