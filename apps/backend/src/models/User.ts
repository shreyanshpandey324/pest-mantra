import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { PHONE_REGEX, EMAIL_REGEX } from "../utils/constants";

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  OFFICE_ADMIN = "office_admin",
  TECHNICIAN = "technician",
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  branchId?: Types.ObjectId;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  tokenVersion: number; // bumped on password change / forced logout to invalidate old refresh tokens
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: (v: string) => PHONE_REGEX.test(v),
        message: "Phone must be a valid 10-digit Indian mobile number",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [EMAIL_REGEX, "Invalid email format"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default on any query
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: function (this: IUser) {
        return this.role !== UserRole.SUPER_ADMIN;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockedUntil: {
      type: Date,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, branchId: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  // passwordHash field is set to the plain password by the service layer
  // before save, then hashed here so hashing logic lives in exactly one place.
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

/**
 * NOTE: lockedUntil has `select: false`. Callers must explicitly
 * `.select("+lockedUntil")` on the query that loaded this document,
 * otherwise this always returns false (the field will be undefined
 * even if a lock is actually set in the database). auth.service.ts
 * does this correctly for the login flow; keep it that way if this
 * method is reused elsewhere.
 */
userSchema.methods.isLocked = function (): boolean {
  return !!this.lockedUntil && this.lockedUntil.getTime() > Date.now();
};

// Strip sensitive fields even if they somehow get selected.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.failedLoginAttempts;
    delete ret.lockedUntil;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);
