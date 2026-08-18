import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

import {
  PHONE_REGEX,
} from "../utils/constants";

export enum ProjectStatus {
  NEW = "new",
  ASSIGNED = "assigned",
  EN_ROUTE = "en_route",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Pest Mantra service categories.
 */
export enum ServiceType {
  COCKROACH = "cockroach",
  ANTS = "ants",
  RODENT = "rodent",
  FLY = "fly",
  TERMITE = "termite",
  BED_BUG = "bed_bug",
}

export enum PaymentMethod {
  CASH = "cash",
  UPI = "upi",
  CHEQUE = "cheque",
  ADVANCE = "advance",
}

export interface IProject
  extends Document {
  _id: Types.ObjectId;

  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;

  projectCode: string;

  customerName: string;

  customerPhone: string;

  address: string;

  serviceType: ServiceType;

  status: ProjectStatus;

  assignedTechnicianId?: Types.ObjectId;

  assignedBy?: Types.ObjectId;

  assignedAt?: Date;

  scheduledDate?: Date;

  scheduledTimeSlot?: string;

  createdBy: Types.ObjectId;

  paymentMethod?: PaymentMethod;

  notes?: string;

  completedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

const projectSchema =
  new Schema(
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

      projectCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
      },

      customerName: {
        type: String,
        required: [
          true,
          "Customer name is required",
        ],
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      customerPhone: {
        type: String,
        required: [
          true,
          "Customer phone is required",
        ],
        trim: true,
        validate: {
          validator: (
            value: string
          ) =>
            PHONE_REGEX.test(value),

          message:
            "Phone must be a valid 10-digit Indian mobile number",
        },
      },

      address: {
        type: String,
        required: [
          true,
          "Address is required",
        ],
        trim: true,
        maxlength: 500,
      },

      serviceType: {
        type: String,
        enum: Object.values(
          ServiceType
        ),
        required: true,
      },

      status: {
        type: String,
        enum: Object.values(
          ProjectStatus
        ),
        default:
          ProjectStatus.NEW,
        index: true,
      },

      assignedTechnicianId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },

      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },

      assignedAt: {
        type: Date,
      },

      scheduledDate: {
        type: Date,
        index: true,
      },

      scheduledTimeSlot: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      paymentMethod: {
        type: String,
        enum: Object.values(
          PaymentMethod
        ),
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      completedAt: {
        type: Date,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
|--------------------------------------------------------------------------
| Main admin-board query
|--------------------------------------------------------------------------
|
| Company + status + scheduled date
|
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  status: 1,
  scheduledDate: 1,
});

/*
|--------------------------------------------------------------------------
| Technician job list
|--------------------------------------------------------------------------
|
| Company + technician + status
|
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  assignedTechnicianId: 1,
  status: 1,
});

/*
|--------------------------------------------------------------------------
| Technician scheduling / double booking
|--------------------------------------------------------------------------
|
| Same technician + same date + same time slot
|
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  assignedTechnicianId: 1,
  scheduledDate: 1,
  scheduledTimeSlot: 1,
});

/*
|--------------------------------------------------------------------------
| Project history / creator reporting
|--------------------------------------------------------------------------
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  createdBy: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Active technician scheduling
|--------------------------------------------------------------------------
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  assignedTechnicianId: 1,
  scheduledDate: 1,
  status: 1,
});

/*
|--------------------------------------------------------------------------
| Completed project reporting
|--------------------------------------------------------------------------
*/
projectSchema.index({
  companyId: 1,
  branchId: 1,
  completedAt: -1,
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/
export const Project =
  model<IProject>(
    "Project",
    projectSchema
  );