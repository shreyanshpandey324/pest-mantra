import { Schema, model, Document, Types } from "mongoose";
import { ProjectStatus } from "./Project";

export interface IProjectStatusHistory extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  fromStatus: ProjectStatus | null;
  toStatus: ProjectStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  remarks?: string;
}

const projectStatusHistorySchema = new Schema<IProjectStatusHistory>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    fromStatus: { type: String, enum: Object.values(ProjectStatus), default: null },
    toStatus: { type: String, enum: Object.values(ProjectStatus), required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: "changedAt", updatedAt: false } }
);

// Matches projectService.getProjectHistory()'s exact query shape:
// find by projectId, sorted by changedAt. A compound index serves
// both the filter and the sort in one pass.
projectStatusHistorySchema.index({ projectId: 1, changedAt: 1 });

// History entries are never edited or deleted — this is an audit
// log, not a mutable record. No update/delete routes exist for it.
export const ProjectStatusHistory = model<IProjectStatusHistory>(
  "ProjectStatusHistory",
  projectStatusHistorySchema
);
