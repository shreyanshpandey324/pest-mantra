import { Schema, model, Document, Types } from "mongoose";
import { PHONE_REGEX } from "../utils/constants";

export enum ProjectStatus {
  NEW = "new",
  ASSIGNED = "assigned",
  EN_ROUTE = "en_route",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/** Matches the services Pest Mantra actually offers (confirmed during requirements gathering). */
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
  ADVANCE = "advance", // termite cases take advance payment per office workflow
}

export interface IProject extends Document {
  _id: Types.ObjectId;
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

const projectSchema = new Schema<IProject>(
  {
    projectCode: { type: String, required: true, unique: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => PHONE_REGEX.test(v),
        message: "Phone must be a valid 10-digit Indian mobile number",
      },
    },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    serviceType: { type: String, enum: Object.values(ServiceType), required: true },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.NEW,
    },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: "User" },
    // Denormalized on the project itself (in addition to the
    // ProjectStatusHistory entry recorded for the same event) so
    // "who assigned this and when" is a single-document read, not
    // a join into the history collection for a very common query.
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    scheduledDate: { type: Date },
    scheduledTimeSlot: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod) },
    notes: { type: String, trim: true, maxlength: 1000 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// The three access patterns that matter most: the admin live board
// (filter by status, sort by schedule), a technician's own job list
// (filter by their id + status), and the double-booking check run
// on every assignment (same technician + same date + same slot) —
// this is the query project.service.ts's assignTechnician() runs.
projectSchema.index({ status: 1, scheduledDate: 1 });
projectSchema.index({ assignedTechnicianId: 1, status: 1 });
projectSchema.index({ assignedTechnicianId: 1, scheduledDate: 1, scheduledTimeSlot: 1 });

export const Project = model<IProject>("Project", projectSchema);
