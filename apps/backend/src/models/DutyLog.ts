import { Schema, model, Document, Types } from "mongoose";

export interface IDutyLog extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  technicianId: Types.ObjectId;
  dutyStartAt: Date;
  dutyEndAt?: Date;
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
    },

    dutyStartAt: {
      type: Date,
      required: true,
    },

    dutyEndAt: {
      type: Date,
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

export const DutyLog = model<IDutyLog>(
  "DutyLog",
  dutyLogSchema
);