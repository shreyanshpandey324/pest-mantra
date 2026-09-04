import { Document, Schema, model } from "mongoose";

export interface ISchedulerLease extends Document {
  key: string;
  owner: string;
  lockedUntil: Date;
  updatedAt: Date;
}

const schema = new Schema<ISchedulerLease>({
  key: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true, maxlength: 200 },
  lockedUntil: { type: Date, required: true, index: true },
}, { timestamps: true });

export const SchedulerLease = model<ISchedulerLease>("SchedulerLease", schema);
