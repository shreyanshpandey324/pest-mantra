import { Schema, model, Document, Types } from "mongoose";

export interface IBranch extends Document {
  _id: Types.ObjectId;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Branch = model<IBranch>("Branch", branchSchema);
