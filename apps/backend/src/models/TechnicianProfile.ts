import { Schema, model, Document, Types } from "mongoose";

export enum DutyStatus {
  OFF_DUTY = "off_duty",
  ON_DUTY_IDLE = "on_duty_idle",
  EN_ROUTE = "en_route",
  ON_SITE = "on_site",
  BUSY = "busy",
}

export interface ITechnicianProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  employeeCode: string;
  skills: string[];
  vehicleNumber?: string;
  currentDutyStatus: DutyStatus;
  lastStatusChangeAt?: Date;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    at: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const technicianProfileSchema = new Schema<ITechnicianProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    currentDutyStatus: {
      type: String,
      enum: Object.values(DutyStatus),
      default: DutyStatus.OFF_DUTY,
    },
    lastStatusChangeAt: {
      type: Date,
    },
    lastKnownLocation: {
      lat: { type: Number },
      lng: { type: Number },
      at: { type: Date },
    },
  },
  { timestamps: true }
);

export const TechnicianProfile = model<ITechnicianProfile>(
  "TechnicianProfile",
  technicianProfileSchema
);
