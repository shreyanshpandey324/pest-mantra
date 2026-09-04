import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

import {
  CUSTOMER_PHONE_REGEX,
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

export enum ProjectPriority {
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export enum FailedVisitReason {
  CUSTOMER_UNAVAILABLE = "customer_unavailable",
  SITE_LOCKED = "site_locked",
  WRONG_ADDRESS = "wrong_address",
  MATERIAL_UNAVAILABLE = "material_unavailable",
  SAFETY_RISK = "safety_risk",
  OTHER = "other",
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

  priority: ProjectPriority;

  siteLocation?: {
    latitude: number;
    longitude: number;
    capturedAt?: Date;
  };

  status: ProjectStatus;

  assignedTechnicianId?: Types.ObjectId;

  assignedBy?: Types.ObjectId;

  assignedAt?: Date;

  assignmentAcknowledgedAt?: Date;
  assignmentAcknowledgedBy?: Types.ObjectId;

  scheduledDate?: Date;

  scheduledTimeSlot?: string;

  createdBy: Types.ObjectId;

  paymentMethod?: PaymentMethod;

  notes?: string;

  completedAt?: Date;

  customerConfirmedAt?: Date;

  rescheduleRequestedAt?: Date;
  rescheduleReason?: string;
  rescheduleSuggestedDate?: Date;
  rescheduleSuggestedTimeSlot?: string;
  rescheduleRequestedBy?: Types.ObjectId;

  failedVisitAt?: Date;
  failedVisitReason?: FailedVisitReason;
  failedVisitNotes?: string;
  failedVisitBy?: Types.ObjectId;

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
            CUSTOMER_PHONE_REGEX.test(value),

          message:
            "Enter a valid customer phone number",
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

      priority: {
        type: String,
        enum: Object.values(ProjectPriority),
        default: ProjectPriority.NORMAL,
        index: true,
      },

      siteLocation: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
        capturedAt: { type: Date },
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

      assignmentAcknowledgedAt: {
        type: Date,
        index: true,
      },

      assignmentAcknowledgedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
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

      customerConfirmedAt: {
        type: Date,
      },

      rescheduleRequestedAt: { type: Date, index: true },
      rescheduleReason: { type: String, trim: true, maxlength: 500 },
      rescheduleSuggestedDate: { type: Date },
      rescheduleSuggestedTimeSlot: { type: String, trim: true, maxlength: 100 },
      rescheduleRequestedBy: { type: Schema.Types.ObjectId, ref: "User" },

      failedVisitAt: { type: Date, index: true },
      failedVisitReason: { type: String, enum: Object.values(FailedVisitReason) },
      failedVisitNotes: { type: String, trim: true, maxlength: 500 },
      failedVisitBy: { type: Schema.Types.ObjectId, ref: "User" },
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
  priority: 1,
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