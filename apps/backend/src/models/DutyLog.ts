import { Schema, model, Document, Types } from "mongoose";

export interface IDutyLog extends Document {
  _id: Types.ObjectId;
  technicianId: Types.ObjectId;
  dutyStartAt: Date;
  dutyEndAt?: Date;
  createdAt: Date;
}

const dutyLogSchema = new Schema<IDutyLog>(
  {
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dutyStartAt: { type: Date, required: true },
    dutyEndAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Fast lookup for "who is currently on duty" — dutyEndAt not set yet.
dutyLogSchema.index({ technicianId: 1, dutyEndAt: 1 });

export const DutyLog = model<IDutyLog>("DutyLog", dutyLogSchema);
