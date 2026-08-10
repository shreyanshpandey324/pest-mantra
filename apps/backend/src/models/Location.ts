import {
  Schema,
  model,
  Types,
  Document,
} from "mongoose";

export interface ILocation extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  technicianId: Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
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

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    accuracy: {
      type: Number,
      default: 0,
    },

    speed: {
      type: Number,
      default: 0,
    },

    heading: {
      type: Number,
      default: 0,
    },

    batteryLevel: {
      type: Number,
      default: 100,
    },

    isCharging: {
      type: Boolean,
      default: false,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

LocationSchema.index({
  companyId: 1,
  technicianId: 1,
  recordedAt: -1,
});

export const Location =
  model<ILocation>("Location", LocationSchema);