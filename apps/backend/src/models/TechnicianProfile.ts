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

  companyId?: Types.ObjectId;

  /**
   * Branch this technician belongs to.
   *
   * Required for branch-level authorization.
   * Office Admins must only be able to manage
   * technicians belonging to their own branch.
   */
  branchId?: Types.ObjectId;

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

const technicianProfileSchema =
  new Schema<ITechnicianProfile>(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      branchId: {
        type: Schema.Types.ObjectId,
        ref: "Branch",
        index: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
      },

      employeeCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      skills: {
        type: [String],
        default: [],
      },

      vehicleNumber: {
        type: String,
        trim: true,
        maxlength: 50,
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
        lat: {
          type: Number,
        },

        lng: {
          type: Number,
        },

        at: {
          type: Date,
        },
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * Technician lookup by company + branch.
 *
 * This is important for:
 * - Office Admin branch isolation
 * - Technician assignment
 * - Project authorization
 */
technicianProfileSchema.index({
  companyId: 1,
  branchId: 1,
});

/**
 * Employee codes should be easy to locate
 * inside a company.
 */
technicianProfileSchema.index({
  companyId: 1,
  employeeCode: 1,
});

/**
 * User -> TechnicianProfile is already unique
 * through the unique userId field.
 */
export const TechnicianProfile =
  model<ITechnicianProfile>(
    "TechnicianProfile",
    technicianProfileSchema
  );