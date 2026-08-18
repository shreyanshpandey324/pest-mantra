import { Schema, model, Document, Types } from "mongoose";

export interface IDutyLog extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  technicianId: Types.ObjectId;
  dutyStartAt: Date;
  dutyEndAt?: Date;
  odometerStart: number;
  odometerEnd?: number;
  distanceKm?: number;
  createdAt: Date;
}

const dutyLogSchema = new Schema<IDutyLog>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    dutyStartAt: {
      type: Date,
      required: true,
    },

    dutyEndAt: {
      type: Date,
    },

    odometerStart: {
      type: Number,
      required: true,
      min: 0,
    },

    odometerEnd: {
      type: Number,
      min: 0,
    },

    distanceKm: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

dutyLogSchema.index({
  companyId: 1,
  technicianId: 1,
  dutyEndAt: 1,
});

dutyLogSchema.index({
  companyId: 1,
  dutyStartAt: -1,
});

export const DutyLog = model<IDutyLog>(
  "DutyLog",
  dutyLogSchema
);