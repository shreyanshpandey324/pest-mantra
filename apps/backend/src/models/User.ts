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

  companyId?: Types.ObjectId;

  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  branchId?: Types.ObjectId;
  isActive: boolean;
  otpLoginEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  tokenVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

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
      select: false,
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

    otpLoginEnabled: {
      type: Boolean,
      default: false,
      index: true,
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
  {
    timestamps: true,
  }
);

userSchema.index({ companyId: 1, role: 1, branchId: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);

  next();
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function (): boolean {
  return (
    !!this.lockedUntil &&
    this.lockedUntil.getTime() > Date.now()
  );
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const {
      passwordHash: _passwordHash,
      failedLoginAttempts: _failedLoginAttempts,
      lockedUntil: _lockedUntil,
      tokenVersion: _tokenVersion,
      __v: _version,
      ...safeUser
    } = ret;

    return safeUser;
  },
});

export const User = model<IUser>("User", userSchema);