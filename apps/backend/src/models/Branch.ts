import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export interface IBranch extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;

  name: string;
  city: string;
  state: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

branchSchema.index({
  companyId: 1,
  name: 1,
});

export const Branch = model(
  "Branch",
  branchSchema
);